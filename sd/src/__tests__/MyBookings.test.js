import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import MyBookings from '../components/MyBookings';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// --- Mocks ---
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    currentUser: null, // Not used in component anymore
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

// --- Test Suite ---
describe('MyBookings Component', () => {
  // Mock data
  const mockFacilities = [
    {
      id: 'fac1',
      data: () => ({
        name: 'Main Gym',
        bookings: [
          { userId: 'user123', date: '2025-05-01', time: '10:00', attendees: 2, status: 'pending' },
          { userId: 'otherUser', date: '2025-05-02', time: '12:00', attendees: 1, status: 'approved' },
        ],
      })
    },
    {
      id: 'fac2',
      data: () => ({
        name: 'Swimming Pool',
        bookings: [
          { userId: 'user123', date: '2025-05-03', time: '14:00', attendees: 3, status: 'rejected' },
        ],
      })
    },
  ];

  const mockSubfacilities = {
    'fac1': [
      {
        id: 'sub1',
        data: () => ({
          name: 'Weight Room',
          bookings: [
            { userId: 'user123', date: '2025-05-04', time: '16:00', attendees: 1, status: 'approved' },
          ],
        })
      }
    ],
    'fac2': [
      {
        id: 'sub2',
        data: () => ({
          name: 'Lap Pool',
          bookings: [
            { userId: 'user123', date: '2025-05-05', time: '18:00', attendees: 2, status: 'pending' },
          ],
        })
      }
    ],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock auth state change handler
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback({ uid: 'user123' }); // Simulate authenticated user
      return jest.fn(); // Return unsubscribe function
    });

    // Mock getDocs for facilities
    collection.mockImplementation((db, path) => ({ path }));
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: mockFacilities };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId] || [] };
      }
      return { docs: [] };
    });
  });

  it('displays loading state initially', () => {
    render(<MyBookings />);
    expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    expect(screen.getByAltText('Loading...').src).toContain('/images/sportify.gif');
  });

  it('displays error message when fetching fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore error'));
    await act(async () => {
      render(<MyBookings />);
    });
    expect(await screen.findByText('Error: Firestore error')).toBeInTheDocument();
  });

  it('displays error when user is not signed in', async () => {
    auth.onAuthStateChanged.mockImplementationOnce((callback) => {
      callback(null); // Simulate not signed in
      return jest.fn();
    });
    
    await act(async () => {
      render(<MyBookings />);
    });
    expect(await screen.findByText('Error: Not signed in')).toBeInTheDocument();
  });

  it('displays all booking categories', async () => {
    await act(async () => {
      render(<MyBookings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('displays "No bookings" messages when no bookings exist', async () => {
    getDocs.mockImplementation(async () => ({ docs: [] }));
    await act(async () => {
      render(<MyBookings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No pending bookings.')).toBeInTheDocument();
      expect(screen.getByText('No approved bookings.')).toBeInTheDocument();
      expect(screen.getByText('No rejected bookings.')).toBeInTheDocument();
    });
  });

 

  it('handles empty bookings arrays in facilities and subfacilities', async () => {
    const emptyMockFacilities = [
      {
        id: 'fac1',
        data: () => ({
          name: 'Empty Facility',
          bookings: [],
        })
      },
      {
        id: 'fac2',
        data: () => ({
          name: 'Empty Facility with Sub',
          bookings: null,
        })
      },
    ];

    const emptyMockSubfacilities = {
      'fac2': [
        {
          id: 'sub1',
          data: () => ({
            name: 'Empty Subfacility',
            bookings: undefined,
          })
        },
      ],
    };

    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: emptyMockFacilities };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: emptyMockSubfacilities[facId] || [] };
      }
      return { docs: [] };
    });

    await act(async () => {
      render(<MyBookings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No pending bookings.')).toBeInTheDocument();
      expect(screen.getByText('No approved bookings.')).toBeInTheDocument();
      expect(screen.getByText('No rejected bookings.')).toBeInTheDocument();
    });
  });

  

 
});