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


  

});