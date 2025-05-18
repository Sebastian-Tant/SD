import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Add MemoryRouter
import BookFacility from '../components/BookFacility'; // Adjust path if needed
import { useLoadScript } from '@react-google-maps/api';
import { getDocs, getDoc, updateDoc, doc, arrayUnion, collection } from 'firebase/firestore';

// --- Mocks ---

// Mock Firebase Auth/DB
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path, ...pathSegments) => [path, ...pathSegments].join('/')),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn((db, collectionPath, ...docIds) => `${collectionPath}/${docIds.join('/')}`),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((x) => x),
}));

// Mock Google Maps API
jest.mock('@react-google-maps/api', () => ({
  useLoadScript: jest.fn(),
  GoogleMap: ({ children, center }) => (
    <div data-testid="map" data-lat={center?.lat} data-lng={center?.lng}>
      {children}
    </div>
  ),
  Marker: ({ position }) => <div data-testid="marker" data-lat={position?.lat} data-lng={position?.lng} />,
}));

// Mock Date for consistent date handling
const mockDate = new Date('2025-05-19T12:44:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
Date.now = jest.fn(() => mockDate.getTime());

// --- Mock Data ---
const mockFacilities = [
  {
    id: 'facility-1',
    data: () => ({
      name: 'Main Gym',
      capacity: 10,
      location: 'Center Street',
      address: '123 Center St',
      coordinates: { lat: 37.7749, lng: -122.4194 },
      bookings: [],
      images: ['image1.jpg'],
    }),
  },
];

const mockSubfacilities = [
  {
    id: 'subfacility-1',
    data: () => ({
      name: 'Court A',
      capacity: 5,
      bookings: [],
    }),
  },
];

const mockEvents = [
  {
    id: 'event-1',
    data: () => ({
      facilityId: 'facility-1',
      subfacilityId: 'subfacility-1',
      start: '2025-05-20T13:00:00Z',
      end: '2025-05-20T15:00:00Z',
    }),
  },
];

// --- Utility Functions ---
const selectFacility = async () => {
  await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
  fireEvent.change(screen.getByLabelText('Select Facility'), { target: { value: 'facility-1' } });
};

const selectSubfacility = async () => {
  await screen.findByRole('option', { name: 'Court A (Capacity: 5)' });
  fireEvent.change(screen.getByLabelText('Select Court/Field'), { target: { value: 'subfacility-1' } });
};

const selectDate = async (dateString) => {
  const dateInput = screen.getByLabelText('Select Date');
  fireEvent.change(dateInput, { target: { value: dateString } });
};

const selectTime = async (time) => {
  const timeButton = await screen.findByRole('button', { name: time });
  fireEvent.click(timeButton);
};

// --- Render Helper ---
const renderWithRouter = (ui, { initialEntries = ['/'] } = {}) => {
  return render(ui, { wrapper: ({ children }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter> });
};

describe('BookFacility Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Google Maps hook
    useLoadScript.mockReturnValue({ isLoaded: true, loadError: false });

    // Mock getDocs
    getDocs.mockImplementation(async (collectionPath) => {
      if (collectionPath === 'facilities') {
        return Promise.resolve({ docs: mockFacilities });
      }
      if (collectionPath === 'facilities/facility-1/subfacilities') {
        return Promise.resolve({ docs: mockSubfacilities });
      }
      if (collectionPath === 'events') {
        return Promise.resolve({ docs: mockEvents });
      }
      return Promise.resolve({ docs: [] });
    });

    // Mock getDoc
    getDoc.mockImplementation(async (docPath) => {
      if (docPath === 'facilities/facility-1') {
        return Promise.resolve(mockFacilities[0]);
      }
      if (docPath === 'facilities/facility-1/subfacilities/subfacility-1') {
        return Promise.resolve(mockSubfacilities[0]);
      }
      return Promise.resolve({ exists: () => false });
    });

    // Mock updateDoc
    updateDoc.mockResolvedValue(undefined);

    // Mock global alert
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- Tests ---
  it('renders without crashing with correct styling', () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    const form = screen.getByText('Book a Facility').closest('.facility-form');
    expect(form).toHaveClass('facility-form');
    expect(form).toHaveStyle({ maxWidth: '600px', backgroundColor: '#1e293b' });
  });

  it('pre-selects facility from location.state.facilityId', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />, {
      initialEntries: [{ pathname: '/', state: { facilityId: 'facility-1' } }],
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Select Facility')).toHaveValue('facility-1');
      expect(screen.getByLabelText('Select Court/Field')).toBeInTheDocument(); // Subfacilities loaded
    });
  });

  it('renders attendee input and date picker with correct styles', () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    const dateInput = screen.getByLabelText('Select Date');
    expect(attendeesInput).toHaveStyle({ backgroundColor: '#334155', color: 'white' });
    expect(dateInput).toHaveStyle({ backgroundColor: '#334155', color: 'white' });
  });

  it('renders facility dropdown and populates options', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    const select = screen.getByLabelText('Select Facility');
    expect(select).toHaveStyle({ backgroundColor: '#334155', color: 'white' });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Main Gym (Capacity: 10)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '-- Choose Facility --' })).toBeInTheDocument();
    });
  });

  it('displays loading state for map if not loaded', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: false });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    expect(screen.getByText('Loading Maps...')).toBeInTheDocument();
  });

  it('displays error if map fails to load', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: true });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    expect(screen.getByText('Error loading maps')).toBeInTheDocument();
  });

  it('updates number of attendees when input changes', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '3' } });
    await waitFor(() => {
      expect(attendeesInput).toHaveValue(3);
    });
  });

  it('updates selected date when date input changes', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    const dateInput = screen.getByLabelText('Select Date');
    const dateString = '2025-05-24';
    fireEvent.change(dateInput, { target: { value: dateString } });
    await waitFor(() => {
      expect(dateInput).toHaveValue(dateString);
    });
  });

  it('shows subfacility dropdown after selecting a facility', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await waitFor(() => {
      const subfacilitySelect = screen.getByLabelText('Select Court/Field');
      expect(subfacilitySelect).toHaveStyle({ backgroundColor: '#334155', color: 'white' });
      expect(screen.getByRole('option', { name: 'Court A (Capacity: 5)' })).toBeInTheDocument();
    });
  });

  it('shows available time slots with correct styling after selecting facility, subfacility, and date', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    await waitFor(() => {
      const timeButton = screen.getByRole('button', { name: '13:00' });
      expect(timeButton).toHaveClass('time-slot');
      expect(timeButton).not.toHaveClass('booked');
      expect(screen.getByRole('button', { name: '17:00' })).toBeInTheDocument();
    });
  });

  it('selects a time slot with selected class and shows confirm button', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    await selectTime('15:00');
    await waitFor(() => {
      const timeButton = screen.getByRole('button', { name: '15:00' });
      expect(timeButton).toHaveClass('time-slot selected');
      const confirmButton = screen.getByRole('button', { name: 'Confirm Booking' });
      expect(confirmButton).toHaveClass('confirm-btn');
      expect(confirmButton).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });

  it('displays capacity warning with warning-message class when attendees exceed subfacility capacity', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '6' } });
    await waitFor(() => {
      const warning = screen.getByText(/only accommodates 5 people/i);
      expect(warning).toHaveClass('warning-message');
    });
  });

  it('does not display capacity warning when attendees are within limit', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '4' } });
    await waitFor(() => {
      expect(screen.queryByText(/only accommodates/i)).not.toBeInTheDocument();
    });
  });

  it('renders map container with correct styling when facility is selected', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await waitFor(() => {
      const mapContainer = screen.getByTestId('map').closest('.map-container');
      expect(mapContainer).toHaveClass('map-container');
      expect(mapContainer).toHaveStyle({ height: '200px', width: '100%' });
      expect(screen.getByTestId('marker')).toHaveAttribute('data-lat', '37.7749');
    });
  });

  it('displays fully booked warning with warning-message class', async () => {
    mockSubfacilities[0].data = () => ({
      name: 'Court A',
      capacity: 5,
      bookings: [
        { date: '2025-05-25', time: '13:00', status: 'approved' },
        { date: '2025-05-25', time: '14:00', status: 'approved' },
        { date: '2025-05-25', time: '15:00', status: 'approved' },
        { date: '2025-05-25', time: '16:00', status: 'approved' },
        { date: '2025-05-25', time: '17:00', status: 'approved' },
      ],
    });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    await waitFor(() => {
      const warning = screen.getByText(/fully booked for this day/i);
      expect(warning).toHaveClass('warning-message');
    });
  });

  it('displays booked time slots with booked class', async () => {
    mockSubfacilities[0].data = () => ({
      name: 'Court A',
      capacity: 5,
      bookings: [{ date: '2025-05-25', time: '13:00', status: 'approved' }],
    });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    await waitFor(() => {
      const bookedButton = screen.getByRole('button', { name: '13:00 (Booked)' });
      expect(bookedButton).toHaveClass('time-slot booked');
      expect(bookedButton).toBeDisabled();
      const availableButton = screen.getByRole('button', { name: '14:00' });
      expect(availableButton).toHaveClass('time-slot');
      expect(availableButton).not.toHaveClass('booked');
    });
  });

  it('submits booking and updates time slots', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    fireEvent.change(screen.getByLabelText('Number of Attendees'), { target: { value: '3' } });
    await selectTime('15:00');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking' }));
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        'facilities/facility-1/subfacilities/subfacility-1',
        expect.any(Object)
      );
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Booking request submitted for Court A')
      );
      expect(screen.queryByRole('button', { name: '15:00' })).not.toBeInTheDocument();
    });
  });

  it('prevents booking submission for past dates', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-18');
    await waitFor(() => {
      expect(screen.getByLabelText('Select Date')).toHaveValue('');
      expect(screen.queryByRole('button', { name: '13:00' })).not.toBeInTheDocument();
    });
  });

  it('handles no subfacilities available', async () => {
    getDocs.mockImplementation(async (collectionPath) => {
      if (collectionPath === 'facilities') {
        return Promise.resolve({ docs: mockFacilities });
      }
      if (collectionPath === 'facilities/facility-1/subfacilities') {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({ docs: [] });
    });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await waitFor(() => {
      expect(screen.queryByLabelText('Select Court/Field')).not.toBeInTheDocument();
    });
  });

  it('handles Firestore error during time slot fetch', async () => {
    getDocs.mockImplementation(async (collectionPath) => {
      if (collectionPath === 'facilities') {
        return Promise.resolve({ docs: mockFacilities });
      }
      if (collectionPath === 'facilities/facility-1/subfacilities') {
        return Promise.resolve({ docs: mockSubfacilities });
      }
      if (collectionPath === 'events') {
        throw new Error('Firestore error');
      }
      return Promise.resolve({ docs: [] });
    });
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await selectSubfacility();
    await selectDate('2025-05-25');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '13:00' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '17:00' })).toBeInTheDocument();
    });
  });

  it('displays location and address correctly', async () => {
    renderWithRouter(<BookFacility onFacilitySelect={jest.fn()} />);
    await selectFacility();
    await waitFor(() => {
      expect(screen.getByText('123 Center St')).toBeInTheDocument();
    });
  });
});