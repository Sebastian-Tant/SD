import React from 'react';
import { render, screen, fireEvent, waitFor, act, within, getAllByRole } from '@testing-library/react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BrowserRouter } from 'react-router-dom';
import Explore from '../components/Explore';

// Mock Firebase dependencies
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
  },
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock URL.createObjectURL for image previews
global.URL.createObjectURL = jest.fn(() => 'mocked-image-url');

// Mock console.error to suppress expected error logs during tests
const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Explore Component', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
  };

  const mockUserData = {
    role: 'Resident',
    displayName: 'Test User',
  };

const mockFacilities = [
  {
    id: 'facility1',
    name: 'Main Gym',
    sport_type: 'Gym',
    status: 'open',
    capacity: 50,
    rating: 4,
    images: ['gym-image.jpg'],
    coordinates: { lat: 40.7128, lng: -74.0060 } // Add coordinates
  },
  {
    id: 'facility2',
    name: 'Soccer Field',
    sport_type: 'Soccer',
    status: 'open',
    capacity: 22,
    rating: 3,
    images: ['soccer-image.jpg'],
    coordinates: { lat: 40.7128, lng: -74.0060 } // Add coordinates
  }
];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock.mockReset();

    // Mock Firebase auth
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn(); // Mock unsubscribe
    });

    // Mock user data
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    // Mock facilities data
    collection.mockReturnValue({});
    getDocs.mockResolvedValue({
      docs: mockFacilities.map((facility) => ({
        id: facility.id,
        data: () => facility,
      })),
    });

    // Mock storage
    ref.mockReturnValue({});
    uploadBytes.mockResolvedValue({ ref: {} });
    getDownloadURL.mockResolvedValue('mocked-download-url');

    // Mock addDoc and updateDoc
    addDoc.mockResolvedValue({});
    updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);
  test('displays error message on fetch failure', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch facilities'));
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load facilities')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('filters facilities by sport type', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    }, { timeout: 1000 });

    const sportSelect = screen.getByRole('combobox');
    fireEvent.change(sportSelect, { target: { value: 'Gym' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.change(sportSelect, { target: { value: 'All' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  test('displays no facilities message when none match criteria', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('No facilities found matching your criteria.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
  test('shows admin features for admin user', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Admin', displayName: 'Admin User' }),
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText('➕ Add New Facility')).toBeInTheDocument();
    expect(screen.getAllByText('Close Facility')[0]).toBeInTheDocument();
  });

  test('shows close/open buttons for facility staff', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Facility Staff', displayName: 'Staff User' }),
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getAllByText('Close Facility')[0]).toBeInTheDocument();
  });

  test('displays loading state initially', async () => {
  getDocs.mockImplementationOnce(() => new Promise(() => {})); // Never resolves
  renderWithRouter(<Explore />);
  expect(screen.getByAltText('Loading...')).toBeInTheDocument();
});

test('displays facilities after successful fetch', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  }, { timeout: 1000 });
});

test('loads more facilities when view more is clicked', async () => {
  const manyFacilities = Array(10).fill().map((_, i) => ({
    id: `facility${i}`,
    name: `Facility ${i}`,
    sport_type: i % 2 === 0 ? 'Gym' : 'Soccer',
    status: 'open',
    capacity: 50,
    rating: 4,
    images: ['image.jpg'],
  }));

  getDocs.mockResolvedValueOnce({
    docs: manyFacilities.map((facility) => ({
      id: facility.id,
      data: () => facility,
    })),
  });

  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getAllByText(/Facility/).length).toBe(5); // Initial 5
  }, { timeout: 1000 });

  fireEvent.click(screen.getByText('View More'));
  expect(screen.getAllByText(/Facility/).length).toBe(10); // All 10 after click
});

// Alternative test using class name
test('opens and closes report form', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  }, { timeout: 1000 });

  // Find by class name
  const reportButtons = screen.getAllByRole('button', { 
    name: (name, element) => element.className.includes('report-button')
  });
  fireEvent.click(reportButtons[0]);
  expect(screen.getByText(`Report Issue for ${mockFacilities[0].name}`)).toBeInTheDocument();

  fireEvent.click(screen.getByText('×'));
  expect(screen.queryByText(`Report Issue for ${mockFacilities[0].name}`)).not.toBeInTheDocument();
});

test('allows admin to close and open facility', async () => {
  // Mock admin user
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ role: 'Admin', displayName: 'Admin User' }),
  });

  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  }, { timeout: 1000 });

  // Find all close buttons (one for each facility)
  const closeButtons = screen.getAllByRole('button', { name: /close facility/i });
  
  // Close first facility
  fireEvent.click(closeButtons[0]);
  
  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
  }, { timeout: 1000 });

  // After closing, the button should change to "Open Facility"
  const openButton = await screen.findByRole('button', { name: /open facility/i });
  
  // Open facility
  fireEvent.click(openButton);
  
  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalledTimes(2);
  }, { timeout: 1000 });
});
// Test for weather error handling
test('displays weather error when API call fails', async () => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error('Weather API failed'))
  );

  renderWithRouter(<Explore />);
  
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  });

  const weatherErrorElements = await screen.findAllByText('Weather API failed');
  expect(weatherErrorElements.length).toBeGreaterThan(0);
});
test('searches facilities by name correctly', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  }, { timeout: 1000 });

  const searchInput = screen.getByPlaceholderText('Search by facility');
  fireEvent.change(searchInput, { target: { value: 'gym' } });

  expect(screen.getByText('Main Gym')).toBeInTheDocument();
  expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

  fireEvent.change(searchInput, { target: { value: '' } }); // Clear search
  expect(screen.getByText('Main Gym')).toBeInTheDocument();
  expect(screen.getByText('Soccer Field')).toBeInTheDocument();
});

test('clears search input when clear button is clicked', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  }, { timeout: 1000 });

  const searchInput = screen.getByPlaceholderText('Search by facility');
  fireEvent.change(searchInput, { target: { value: 'gym' } });
  expect(searchInput.value).toBe('gym');

  const clearButton = screen.getByRole('button', { name: 'Clear' });
  fireEvent.click(clearButton);

  expect(searchInput.value).toBe('');
  expect(screen.getByText('Main Gym')).toBeInTheDocument();
  expect(screen.getByText('Soccer Field')).toBeInTheDocument();
});

test('resident user does not see "Add New Facility" button', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.queryByText('➕ Add New Facility')).not.toBeInTheDocument();
  });
});

test('resident user does not see Close/Open Facility buttons', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Close Facility' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Facility' })).not.toBeInTheDocument();
  });
});

// Test for search functionality
test('filters facilities based on search term', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  const searchInput = screen.getByPlaceholderText('Search by facility');
  fireEvent.change(searchInput, { target: { value: 'Gym' } });
  
  expect(screen.getByText('Main Gym')).toBeInTheDocument();
  expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

  fireEvent.change(searchInput, { target: { value: 'Field' } });
  expect(screen.queryByText('Main Gym')).not.toBeInTheDocument();
  expect(screen.getByText('Soccer Field')).toBeInTheDocument();
});
// Initial render and loading state
  test('displays loading gif initially', async () => {
    // Make getDocs resolve after a delay to show loading state
    getDocs.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ docs: [] }), 100)));
    renderWithRouter(<Explore />);
    expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByAltText('Loading...')).not.toBeInTheDocument());
  });

 

  test('filters facilities by sport type', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    });

    const sportSelect = screen.getByRole('combobox', { name: /sport:/i });
    fireEvent.change(sportSelect, { target: { value: 'Gym' } });

    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.change(sportSelect, { target: { value: 'All' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  test('displays no facilities message when none match criteria', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] }); // No facilities
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('No facilities found matching your criteria.')).toBeInTheDocument();
    });
  });

  test('does not show add new facility button for resident user', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockUserDataResident,
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /add new facility/i })).not.toBeInTheDocument();
    });
  });

  test('filters facilities by search term', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by facility');
    fireEvent.change(searchInput, { target: { value: 'gym' } });

    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  test('Admin/Staff do not see booking button or closed notice', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => mockUserDataAdmin });
    renderWithRouter(<Explore />);

    await waitFor(() => {
      const gymCard = screen.getByText('Main Gym').closest('.facility-card');
      expect(within(gymCard).queryByRole('link', { name: /book now/i })).not.toBeInTheDocument();
      expect(within(gymCard).queryByText('🚧 Facility Closed for Maintenance')).not.toBeInTheDocument();
    });
  });// Test 21: Subfacility selection in report form



  test('clears search term when clear button is clicked', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by facility');
    fireEvent.change(searchInput, { target: { value: 'gym' } });
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

 
   


test('displays weather data when available', async () => {
  // Mock weather API response
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        daily: {
          time: ['2023-01-01', '2023-01-02', '2023-01-03'],
          weathercode: [0, 1, 2],
          temperature_2m_max: [20, 22, 18],
          temperature_2m_min: [10, 12, 8],
        }
      }),
    })
  );

    render(
      <BrowserRouter>
        <Explore />
      </BrowserRouter>
    );
  
  // Wait for the Main Gym facility to load
  const mainGymCard = await screen.findByText('Main Gym');
  
  // Scope our queries to just the Main Gym card
  const mainGymWeatherSection = within(mainGymCard.closest('.facility-card')).getByText('3-Day Weather Forecast').closest('.weather-forecast');
  
  // Verify weather data is displayed for Main Gym
  await waitFor(() => {
    expect(within(mainGymWeatherSection).getByText('Clear sky')).toBeInTheDocument();
    expect(within(mainGymWeatherSection).getByText('10°C - 20°C')).toBeInTheDocument();
  });
});

});

afterAll(() => {
  consoleErrorMock.mockRestore();
});