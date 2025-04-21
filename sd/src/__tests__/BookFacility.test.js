import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookFacility from '../components/BookFacility';
import { useLoadScript } from '@react-google-maps/api';
import { getDocs, getDoc, updateDoc, doc } from 'firebase/firestore';

// Mocks
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((x) => x),
}));

jest.mock('@react-google-maps/api', () => ({
  useLoadScript: jest.fn(),
  GoogleMap: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
}));

describe('BookFacility Component', () => {
  beforeEach(() => {
    useLoadScript.mockReturnValue({ isLoaded: true, loadError: false });

    getDocs
      .mockResolvedValueOnce({
        docs: [
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
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'subfacility-1',
            data: () => ({
              name: 'Court A',
              capacity: 5,
              bookings: [],
            }),
          },
        ],
      });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ bookings: [] }),
    });

    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BookFacility />);
    expect(screen.getByText('Book a Facility')).toBeInTheDocument();
  });

  it('renders attendee input and date picker', () => {
    render(<BookFacility />);
    expect(screen.getByLabelText('Number of Attendees')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
  });

  it('renders facility dropdown', async () => {
    render(<BookFacility />);
    expect(screen.getByLabelText('Select Facility')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
    });
  });

  it('displays loading state for map if not loaded', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: false });
    render(<BookFacility />);
    expect(screen.getByText('Loading Maps...')).toBeInTheDocument();
  });

  it('displays error if map fails to load', () => {
    useLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: true });
    render(<BookFacility />);
    expect(screen.getByText('Error loading maps')).toBeInTheDocument();
  });


  describe('BookFacility Component - Additional Tests', () => {
    beforeEach(() => {
      // Reset all mocks and set up common mock responses
      jest.clearAllMocks();
      useLoadScript.mockReturnValue({ isLoaded: true, loadError: false });
  
      // Mock facilities data
      getDocs
        .mockResolvedValueOnce({
          docs: [
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
            {
              id: 'facility-2',
              data: () => ({
                name: 'Swimming Pool',
                capacity: 20,
                location: 'Park Avenue',
                address: '456 Park Ave',
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'subfacility-1',
              data: () => ({
                name: 'Court A',
                capacity: 5,
                bookings: [],
              }),
            },
            {
              id: 'subfacility-2',
              data: () => ({
                name: 'Court B',
                capacity: 8,
                bookings: [],
              }),
            },
          ],
        });
  
      // Mock document data
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ bookings: [] }),
      });
  
      // Mock alert
      jest.spyOn(global, 'alert').mockImplementation(() => {});
    });
  
    it('loads and displays facilities list', async () => {
      render(<BookFacility />);
      
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
        expect(screen.getByText('Swimming Pool (Capacity: 20)')).toBeInTheDocument();
      });
    });
  
    it('shows subfacilities when a facility is selected', async () => {
      render(<BookFacility />);
      
      // Wait for facilities to load
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
      });
  
      // Select a facility
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-1' },
      });
  
      // Wait for subfacilities to load
      await waitFor(() => {
        expect(screen.getByText('Court A (Capacity: 5)')).toBeInTheDocument();
        expect(screen.getByText('Court B (Capacity: 8)')).toBeInTheDocument();
      });
    });
  
    it('shows capacity warning when attendees exceed capacity', async () => {
      render(<BookFacility />);
      
      // Wait for facilities to load and select one
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-1' },
      });
  
      // Set attendees to exceed capacity
      fireEvent.change(screen.getByLabelText('Number of Attendees'), {
        target: { value: '15' },
      });
  
      await waitFor(() => {
        expect(screen.getByText('This facility only accommodates 10 people')).toBeInTheDocument();
      });
    });
  
    it('displays available times when date is selected', async () => {
      render(<BookFacility />);
      
      // Select a facility
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-1' },
      });
  
      // Select a date
      const today = new Date().toISOString().split('T')[0];
      fireEvent.change(screen.getByLabelText('Select Date'), {
        target: { value: today },
      });
  
      // Check if time slots are displayed
      await waitFor(() => {
        expect(screen.getByText('13:00')).toBeInTheDocument();
        expect(screen.getByText('14:00')).toBeInTheDocument();
        expect(screen.getByText('15:00')).toBeInTheDocument();
      });
    });
  
    it('shows fully booked message when no times are available', async () => {
      // Mock getDoc to return fully booked data
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          bookings: [
            { date: '2023-01-01', time: '13:00', status: 'approved' },
            { date: '2023-01-01', time: '14:00', status: 'approved' },
            { date: '2023-01-01', time: '15:00', status: 'approved' },
            { date: '2023-01-01', time: '16:00', status: 'approved' },
            { date: '2023-01-01', time: '17:00', status: 'approved' },
          ],
        }),
      });
  
      render(<BookFacility />);
      
      // Select facility and date
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-1' },
      });
      fireEvent.change(screen.getByLabelText('Select Date'), {
        target: { value: '2023-01-01' },
      });
  
      // Check for fully booked message
      await waitFor(() => {
        expect(screen.getByText('Facility is fully booked for this day. Please choose another day.')).toBeInTheDocument();
      });
    });
  
    it('displays map when facility has coordinates', async () => {
      render(<BookFacility />);
      
      // Select a facility with coordinates
      await waitFor(() => {
        expect(screen.getByText('Main Gym (Capacity: 10)')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-1' },
      });
  
      // Check if map is rendered
      await waitFor(() => {
        expect(screen.getByTestId('map')).toBeInTheDocument();
        expect(screen.getByTestId('marker')).toBeInTheDocument();
      });
    });
  
    it('does not display map when facility has no coordinates', async () => {
      render(<BookFacility />);
      
      // Select a facility without coordinates
      await waitFor(() => {
        expect(screen.getByText('Swimming Pool (Capacity: 20)')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText('Select Facility'), {
        target: { value: 'facility-2' },
      });
  
      // Check that map is not rendered
      await waitFor(() => {
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
      });
    });
  
   
  });
});