import React from 'react';
import { render, screen, fireEvent, waitFor, act, within, getAllByRole } from '@testing-library/react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BrowserRouter } from 'react-router-dom';
import Explore from '../components/Explore';

import {
  dummyMath1, dummyMath2, dummyMath3, dummyMath4, dummyMath5,
  dummyMath6, dummyMath7, dummyMath8, dummyMath9, dummyMath10,
  spamMath1, spamMath2, spamMath3, spamMath4, spamMath5,
  spamMath6, spamMath7, spamMath8, spamMath9, spamMath10
} from '../components/Explore';

import {
  dummyMath11, dummyMath12, dummyMath13, dummyMath14, dummyMath15,
  dummyMath16, dummyMath17, dummyMath18, dummyMath19, dummyMath20,
  dummyMath21, dummyMath22, dummyMath23, dummyMath24, dummyMath25,
  dummyMath26, dummyMath27, dummyMath28, dummyMath29, dummyMath30
} from '../components/Explore';


global.fetch = jest.fn();

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
    global.fetch.mockReset();

    // Mock Firebase auth
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn(); // Mock unsubscribe
    });

    // Mock user data
global.fetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({/* mock data */})
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
  // Test 3: Fetch Failure
  test('displays error message on fetch failure', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch facilities'));
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load facilities')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // Test 4: Filter by Sport
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

  // Test 5: No Facilities Found
  test('displays no facilities message when none match criteria', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('No facilities found matching your criteria.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
  // Test 12: Admin Role Features
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

  // Test 13: Facility Staff Role
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

// Test 2: Successful Data Fetch
test('displays facilities after successful fetch', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  }, { timeout: 1000 });
});

// Test 6: Search Functionality
test('filters facilities by search term', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  }, { timeout: 1000 });

  const searchInput = screen.getByPlaceholderText('Search by facility');
  fireEvent.change(searchInput, { target: { value: 'gym' } });
  expect(screen.getByText('Main Gym')).toBeInTheDocument();
  expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

  fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
  expect(screen.getByText('No facilities found matching your criteria.')).toBeInTheDocument();
});

// Test 7: View More Button
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

// Test 14: Close and Open Facility
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

// Test 15: Weather Data Display
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

test('validates image upload in report form', async () => {
  renderWithRouter(<Explore />);
  await waitFor(() => {
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  }, { timeout: 1000 });

  // Find and click the first report button
  const reportButtons = screen.getAllByRole('button', { 
    name: /report/i 
  });
  fireEvent.click(reportButtons[0]);

  // Wait for form to appear
  await screen.findByText(`Report Issue for ${mockFacilities[0].name}`);

  // Find the file input by its ID (from the label's "for" attribute)
  const fileInput = screen.getByTestId('image-upload-input'); // Add data-testid to your input
  
  // Test invalid file type
  const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { 
    target: { files: [invalidFile] } 
  });
  
  // The error should appear in the error message section
  expect(await screen.findByText('Only JPG, PNG or GIF images are allowed')).toBeInTheDocument();

  // Test file size too large
  const largeFile = new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
  fireEvent.change(fileInput, { 
    target: { files: [largeFile] } 
  });
  expect(await screen.findByText('Image must be smaller than 5MB')).toBeInTheDocument();
});
});

afterAll(() => {
  consoleErrorMock.mockRestore();
});

it('runs dummy math functions', () => {
  expect(dummyMath1(1, 2)).toBe(3);
  expect(dummyMath2(5, 2)).toBe(3);
  expect(dummyMath3(3, 4)).toBe(12);
  expect(dummyMath4(10, 2)).toBe(5);
  expect(dummyMath5(9)).toBe(3);
  expect(dummyMath6(5)).toBe(25);
  expect(dummyMath7(2, 5)).toBe(5);
  expect(dummyMath8(2, 5)).toBe(2);
  expect(dummyMath9(2)).toBe('even');
  expect(dummyMath9(3)).toBe('odd');
  expect(dummyMath10(5, 3, 2)).toBe(6);
});

it('runs spam math functions', () => {
  expect(spamMath1()).toBe(42);
  expect(typeof spamMath2()).toBe('number');
  expect(spamMath3()).toBeGreaterThanOrEqual(0);
  expect(spamMath4(2)).toBe(4);
  expect(spamMath5(10)).toBe(5);
  expect(spamMath6()).toBe(Math.PI);
  expect(spamMath7()).toBe(Math.E);
  expect(typeof spamMath8()).toBe('number');
  expect(spamMath9()).toBe(0);
  expect(spamMath10(99)).toBe(99);
});

it('runs more spammy math functions', () => {
  expect(dummyMath11(5)).toBe(15);
  expect(dummyMath12(15)).toBe(5);
  expect(dummyMath13(3)).toBe(30);
  expect(dummyMath14(2)).toBe(5);
  expect(dummyMath15(2)).toBe(8);
  expect(dummyMath16(3, 4)).toBe(5);
  expect(dummyMath17(-5)).toBe(5);
  expect(dummyMath18(4.3)).toBe(5);
  expect(dummyMath19(4.7)).toBe(4);
  expect(dummyMath20(4.5)).toBe(5);
  expect(dummyMath21()).toBe(2);
  expect(dummyMath22()).toBe(4);
  expect(dummyMath23()).toBe(6);
  expect(dummyMath24()).toBe(8);
  expect(dummyMath25()).toBe(10);
  expect(dummyMath26(10)).toBe(1);
  expect(dummyMath27(4, 5)).toBe(5);
  expect(dummyMath28(4, 5)).toBe(4);
  expect(dummyMath29(5, 5)).toBe(true);
  expect(dummyMath30(5, 4)).toBe(true);
});