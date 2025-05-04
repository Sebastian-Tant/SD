import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MyBookings from '../components/MyBookings';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// --- Mocks ---
jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'user123' }, // Mock authenticated user
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
      name: 'Main Gym',
      bookings: [
        { userId: 'user123', date: '2025-05-01', time: '10:00', attendees: 2, status: 'pending' },
        { userId: 'otherUser', date: '2025-05-02', time: '12:00', attendees: 1, status: 'approved' },
      ],
    },
    {
      id: 'fac2',
      name: 'Swimming Pool',
      bookings: [
        { userId: 'user123', date: '2025-05-03', time: '14:00', attendees: 3, status: 'rejected' },
      ],
    },
  ];

  const mockSubfacilities = {
    'fac1': [
      {
        id: 'sub1',
        name: 'Weight Room',
        bookings: [
          { userId: 'user123', date: '2025-05-04', time: '16:00', attendees: 1, status: 'approved' },
        ],
      },
    ],
    'fac2': [
      {
        id: 'sub2',
        name: 'Lap Pool',
        bookings: [
          { userId: 'user123', date: '2025-05-05', time: '18:00', attendees: 2, status: 'pending' },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getDocs for facilities
    collection.mockImplementation((db, path) => ({ path }));
    let callCount = 0;
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: mockFacilities.map(f => ({ id: f.id, data: () => f })) };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId].map(s => ({ id: s.id, data: () => s })) };
      }
      return { docs: [] };
    });
  });

  // --- Rendering Tests ---
  it('renders loading state initially', () => {
    render(<MyBookings />);
    expect(screen.getByText('Loading bookings…')).toBeInTheDocument();
  });

  it('displays error message when fetching fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore error'));
    render(<MyBookings />);
    expect(await screen.findByText('Error: Firestore error')).toBeInTheDocument();
  });

  it('displays error when user is not signed in', async () => {
    auth.currentUser = null; // Mock unauthenticated user
    render(<MyBookings />);
    expect(await screen.findByText('Error: Not signed in')).toBeInTheDocument();
  });

  // --- Data Fetching and Display Tests ---
  it('fetches and displays bookings by status', async () => {
    render(<MyBookings />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    });

    // Check headings
    expect(screen.getByRole('heading', { name: 'My Bookings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rejected' })).toBeInTheDocument();

    // Check booking items
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('2025-05-01')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('2 people')).toBeInTheDocument();
    expect(screen.getByText('pending')).toHaveClass('status pending');

    expect(screen.getByText('Weight Room')).toBeInTheDocument();
    expect(screen.getByText('2025-05-04')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
    expect(screen.getByText('1 person')).toBeInTheDocument();
    expect(screen.getByText('approved')).toHaveClass('status approved');

    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('2025-05-03')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('3 people')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toHaveClass('status rejected');

    expect(screen.getByText('Lap Pool')).toBeInTheDocument();
    expect(screen.getByText('2025-05-05')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText('2 people')).toBeInTheDocument();
    expect(screen.getByText('pending')).toHaveClass('status pending');
  });

  it('displays "No pending bookings" when there are no pending bookings', async () => {
    const noPendingBookings = mockFacilities.map(f => ({
      ...f,
      bookings: f.bookings.filter(b => b.userId === 'user123' && b.status !== 'pending'),
    }));
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: noPendingBookings.map(f => ({ id: f.id, data: () => f })) };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId].map(s => ({
          id: s.id,
          data: () => ({ ...s, bookings: s.bookings.filter(b => b.status !== 'pending') }),
        })) };
      }
      return { docs: [] };
    });

    render(<MyBookings />);
    await waitFor(() => {
      expect(screen.getByText('No pending bookings.')).toBeInTheDocument();
    });
    expect(screen.getByText('Weight Room')).toBeInTheDocument(); // Approved
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument(); // Rejected
  });

  it('displays "No approved bookings" when there are no approved bookings', async () => {
    const noApprovedBookings = mockFacilities.map(f => ({
      ...f,
      bookings: f.bookings.filter(b => b.userId === 'user123' && b.status !== 'approved'),
    }));
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: noApprovedBookings.map(f => ({ id: f.id, data: () => f })) };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId].map(s => ({
          id: s.id,
          data: () => ({ ...s, bookings: s.bookings.filter(b => b.status !== 'approved') }),
        })) };
      }
      return { docs: [] };
    });

    render(<MyBookings />);
    await waitFor(() => {
      expect(screen.getByText('No approved bookings.')).toBeInTheDocument();
    });
    expect(screen.getByText('Main Gym')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument(); // Rejected
  });

  it('displays "No rejected bookings" when there are no rejected bookings', async () => {
    const noRejectedBookings = mockFacilities.map(f => ({
      ...f,
      bookings: f.bookings.filter(b => b.userId === 'user123' && b.status !== 'rejected'),
    }));
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: noRejectedBookings.map(f => ({ id: f.id, data: () => f })) };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId].map(s => ({
          id: s.id,
          data: () => ({ ...s, bookings: s.bookings.filter(b => b.status !== 'rejected') }),
        })) };
      }
      return { docs: [] };
    });

    render(<MyBookings />);
    await waitFor(() => {
      expect(screen.getByText('No rejected bookings.')).toBeInTheDocument();
    });
    expect(screen.getByText('Main Gym')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Weight Room')).toBeInTheDocument(); // Approved
  });

  it('displays no bookings when the list is empty', async () => {
    getDocs.mockImplementation(async (col) => {
      if (col.path === 'facilities') {
        return { docs: mockFacilities.map(f => ({ id: f.id, data: () => ({ ...f, bookings: [] }) })) };
      } else if (col.path.startsWith('facilities/') && col.path.endsWith('/subfacilities')) {
        const facId = col.path.split('/')[1];
        return { docs: mockSubfacilities[facId].map(s => ({ id: s.id, data: () => ({ ...s, bookings: [] }) })) };
      }
      return { docs: [] };
    });

    render(<MyBookings />);
    await waitFor(() => {
      expect(screen.getByText('No pending bookings.')).toBeInTheDocument();
      expect(screen.getByText('No approved bookings.')).toBeInTheDocument();
      expect(screen.getByText('No rejected bookings.')).toBeInTheDocument();
    });
  });
});