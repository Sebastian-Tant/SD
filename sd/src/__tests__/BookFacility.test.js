import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookFacility from '../components/BookFacility'; // Adjust path if needed
import { useLoadScript } from '@react-google-maps/api';
// Import specific functions used
import { getDocs, getDoc, updateDoc, doc, arrayUnion, collection } from 'firebase/firestore';

// --- Mocks ---

// Mock Firebase Auth/DB basic objects
jest.mock('../firebase', () => ({ // Adjust path if needed
  db: {}, // Provide a dummy db object
  auth: { currentUser: { uid: 'test-user' } },
}));

// Mock Firestore functions
// Use jest.fn() for functions we need to provide implementations for later
jest.mock('firebase/firestore', () => ({
  // Return path string from collection mock for identification
  collection: jest.fn((db, path, ...pathSegments) => [path, ...pathSegments].join('/')),
  getDocs: jest.fn(), // We will mock implementation in beforeEach
  getDoc: jest.fn(),  // We will mock implementation in beforeEach
  doc: jest.fn((db, collectionPath, ...docIds) => `${collectionPath}/${docIds.join('/')}`), // Mock doc to return path string
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((x) => x), // Simple mock for arrayUnion
  // Include any other firestore exports your component might use implicitly
}));

// Mock Google Maps API
jest.mock('@react-google-maps/api', () => ({
  useLoadScript: jest.fn(),
  GoogleMap: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
}));


// --- Mock Data ---
const mockFacilities = [
  {
    id: 'facility-1',
    data: () => ({
      name: 'Main Gym',
      capacity: 10,
      location: 'Center Street',
      address: '123 Center St',
      coordinates: { lat: 0, lng: 0 },
    }),
  },
  // Add more mock facilities if needed for other tests
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
   // Add more mock subfacilities if needed
];

// Example mock for a subfacility with existing bookings (if needed for other tests)
// const mockSubfacilityWithBooking = { /* ... */ };

describe('BookFacility Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Google Maps hook
    useLoadScript.mockReturnValue({ isLoaded: true, loadError: false });

    // --- Specific Mock Implementations ---

    // Mock getDocs based on collection path
    const getDocsMock = getDocs; // Get the jest.fn()
    getDocsMock.mockImplementation(async (collectionPath) => {
      // console.log(`DEBUG: getDocs called with path: ${collectionPath}`); // Optional: for debugging
      if (collectionPath === 'facilities') {
        return Promise.resolve({ docs: mockFacilities });
      }
      // Match the specific subfacility path expected
      if (collectionPath === 'facilities/facility-1/subfacilities') {
        return Promise.resolve({ docs: mockSubfacilities });
      }
      // Add more conditions if other collections are fetched
      // Default fallback
      return Promise.resolve({ docs: [] });
    });

    // Mock getDoc (can also be made conditional if needed)
    const getDocMock = getDoc; // Get the jest.fn()
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ bookings: [] }), // Default: no bookings
    });
    // Example for specific doc path if needed later:
    // getDocMock.mockImplementation(async (docPath) => {
    //    if (docPath === 'facilities/facility-1/subfacilities/subfacility-1') {
    //        return Promise.resolve({ exists: () => true, data: () => ({ bookings: [] }) });
    //    }
    //    return Promise.resolve({ exists: () => false }); // Default
    // });


    // Mock updateDoc to resolve successfully
    const updateDocMock = updateDoc; // Get the jest.fn()
    updateDocMock.mockResolvedValue(undefined);

    // Mock global alert
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore any spied functions
    jest.restoreAllMocks();
  });

  // --- Tests ---

  it('renders without crashing', () => {
    render(<BookFacility />);
    expect(screen.getByText('Book a Facility')).toBeInTheDocument();
  });

  it('renders attendee input and date picker', () => {
    render(<BookFacility />);
    expect(screen.getByLabelText('Number of Attendees')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
  });

  it('renders facility dropdown and populates options', async () => {
    render(<BookFacility />);
    expect(screen.getByLabelText('Select Facility')).toBeInTheDocument();
    // Wait for the specific facility option text to appear
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Main Gym (Capacity: 10)' })).toBeInTheDocument();
    });
    // Check the default option is present
    expect(screen.getByRole('option', { name: '-- Choose Facility --' })).toBeInTheDocument();
  });

  it('displays loading state for map if not loaded', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: false }); // Override beforeEach mock for this test
    render(<BookFacility />);
    expect(screen.getByText('Loading Maps...')).toBeInTheDocument();
  });

  it('displays error if map fails to load', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: true }); // Override beforeEach mock for this test
    render(<BookFacility />);
    expect(screen.getByText('Error loading maps')).toBeInTheDocument();
  });

  it('updates number of attendees when input changes', () => {
    render(<BookFacility />);
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '3' } });
    expect(attendeesInput.value).toBe('3');
  });

  it('updates selected date when date input changes', () => {
    render(<BookFacility />);
    const dateInput = screen.getByLabelText('Select Date');
    const testDate = new Date(); // Use today or a future date
    testDate.setDate(testDate.getDate() + 5); // e.g., 5 days from now
    const dateString = testDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    fireEvent.change(dateInput, { target: { value: dateString } });
    expect(dateInput.value).toBe(dateString);
  });

  // --- The Fixed Test ---
  it('shows subfacility dropdown after selecting a facility', async () => {
    render(<BookFacility />);

    // 1. Wait for the facility option to be populated correctly
    // Use findByRole for better targeting of options within selects
    const facilityOption = await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
    expect(facilityOption).toBeInTheDocument(); // Confirm it loaded

    // 2. Select the facility using its ID ('facility-1')
    const facilitySelect = screen.getByLabelText('Select Facility');
    fireEvent.change(facilitySelect, { target: { value: 'facility-1' } });

    // 3. Wait for the subfacility fetch/render triggered by the change
    await waitFor(() => {
      // Check if the subfacility dropdown label appears
      expect(screen.getByLabelText('Select Court/Field')).toBeInTheDocument();
      // Check if the specific subfacility option appears
      expect(screen.getByRole('option', { name: 'Court A (Capacity: 5)' })).toBeInTheDocument();
    });
  });

  it('shows available time slots after selecting facility, subfacility, and date', async () => {
    render(<BookFacility />);
    // 1. Select facility
    await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
    fireEvent.change(screen.getByLabelText('Select Facility'), { target: { value: 'facility-1' } });

    // 2. Select subfacility
    await screen.findByRole('option', { name: 'Court A (Capacity: 5)' });
    fireEvent.change(screen.getByLabelText('Select Court/Field'), { target: { value: 'subfacility-1' } });

    // 3. Select date
    const dateInput = screen.getByLabelText('Select Date');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 6); // Use a different future date
    const dateString = testDate.toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: dateString } });

    // 4. Wait for available times (mock returns all times as available)
    await waitFor(() => {
      // Check for time slot buttons
      expect(screen.getByRole('button', { name: '13:00' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '17:00' })).toBeInTheDocument();
    });
  });

  it('selects a time slot when clicked', async () => {
    render(<BookFacility />);
    // Sequence: Select facility -> subfacility -> date
    await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
    fireEvent.change(screen.getByLabelText('Select Facility'), { target: { value: 'facility-1' } });
    await screen.findByRole('option', { name: 'Court A (Capacity: 5)' });
    fireEvent.change(screen.getByLabelText('Select Court/Field'), { target: { value: 'subfacility-1' } });
    const dateInput = screen.getByLabelText('Select Date');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7); // Use a different future date
    const dateString = testDate.toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: dateString } });

    // Wait for time slots and click one
    const timeButton = await screen.findByRole('button', { name: '15:00' });
    fireEvent.click(timeButton);

    // Check if the button gets the 'selected' class
    expect(timeButton).toHaveClass('selected');

    // Confirm button should also appear
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeInTheDocument();
  });

 it('displays capacity warning when attendees exceed subfacility capacity', async () => {
    render(<BookFacility />);
    // Sequence: Select facility -> subfacility
    await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
    fireEvent.change(screen.getByLabelText('Select Facility'), { target: { value: 'facility-1' } });
    await screen.findByRole('option', { name: 'Court A (Capacity: 5)' });
    fireEvent.change(screen.getByLabelText('Select Court/Field'), { target: { value: 'subfacility-1' } }); // Court A has capacity 5

    // Change attendees to exceed capacity
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '6' } }); // Exceeds 5

    // Expect warning message
    await waitFor(() => {
        // Use a flexible matcher in case of slight text variations
        expect(screen.getByText(/only accommodates 5 people/i)).toBeInTheDocument();
    });
  });

  it('does not display capacity warning when attendees are within limit', async () => {
    render(<BookFacility />);
     // Sequence: Select facility -> subfacility
    await screen.findByRole('option', { name: 'Main Gym (Capacity: 10)' });
    fireEvent.change(screen.getByLabelText('Select Facility'), { target: { value: 'facility-1' } });
    await screen.findByRole('option', { name: 'Court A (Capacity: 5)' });
    fireEvent.change(screen.getByLabelText('Select Court/Field'), { target: { value: 'subfacility-1' } }); // Court A has capacity 5

    // Change attendees within capacity
    const attendeesInput = screen.getByLabelText('Number of Attendees');
    fireEvent.change(attendeesInput, { target: { value: '4' } }); // Within capacity 5

    // Expect warning message NOT to be there. waitFor is needed to allow state update/re-render.
    await waitFor(() => {
        expect(screen.queryByText(/only accommodates/i)).not.toBeInTheDocument();
    });
  });

 

});