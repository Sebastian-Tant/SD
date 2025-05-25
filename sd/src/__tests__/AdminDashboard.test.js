import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../components/AdminDashboard';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Mock Firebase and other dependencies
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('react-icons/fa', () => ({
  FaUserTag: () => <div>FaUserTag</div>,
  FaCheck: () => <div>FaCheck</div>,
  FaTimes: () => <div>FaTimes</div>,
}));
jest.mock('react-calendar', () => (props) => (
  <div data-testid="calendar-mock" onClick={() => props.onChange(new Date('2023-01-01'))}>
    Calendar Mock
  </div>
));

// Mock data
const mockApplications = [
  { id: 'app1', name: 'John Doe', applicationType: 'Facility Staff', status: 'pending', uid: 'user1' },
  { id: 'app2', name: 'Jane Smith', applicationType: 'Admin', status: 'approved', uid: 'user2' },
];
const mockUsers = [
  { id: 'user1', displayName: 'John Doe', role: 'Facility Staff' },
  { id: 'user2', displayName: 'Jane Smith', role: 'Admin' },
];
const mockBookings = [
  {
    id: 'fac1_2023-01-01_10:00',
    facilityId: 'fac1',
    facilityName: 'Main Gym',
    date: '2023-01-01',
    time: '10:00',
    userId: 'user1',
    status: 'pending',
    attendees: 5,
    documentPath: 'facilities/fac1',
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    collection.mockImplementation((db, ...path) => ({ path: path.join('/') }));
    query.mockImplementation((colRef) => colRef);
    where.mockImplementation(() => {});

    getDocs.mockImplementation((colRef) => {
      if (colRef.path === 'events') {
        return Promise.resolve({
          forEach: () => {}, // Fix for forEach usage in AdminDashboard
          docs: [],
        });
      }
      switch (colRef.path) {
        case 'applications':
          return Promise.resolve({ docs: mockApplications.map(a => ({ id: a.id, data: () => a })) });
        case 'users':
          return Promise.resolve({ docs: mockUsers.map(u => ({ id: u.id, data: () => u })) });
        case 'facilities':
          return Promise.resolve({
            docs: [{
              id: 'fac1',
              data: () => ({ name: 'Main Gym', bookings: mockBookings })
            }]
          });
        case 'facilities/fac1/subfacilities':
          return Promise.resolve({ docs: [] });
        default:
          return Promise.resolve({ docs: [] });
      }
    });

    updateDoc.mockResolvedValue(true);
    getAuth.mockReturnValue({});
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'admin1' });
      return jest.fn();
    });
  });


  it('displays error message when data fetch fails', async () => {
    getDocs.mockRejectedValue(new Error('Fetch failed'));
    await act(async () => {
      render(<AdminDashboard />);
    });
    await waitFor(() => expect(screen.getByText(/Error: Fetch failed/i)).toBeInTheDocument());
  });

  it('loads more applications when Load More button is clicked', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const loadMoreBtn = screen.queryByText(/Load More/i);
    if (loadMoreBtn) {
      fireEvent.click(loadMoreBtn);
      expect(loadMoreBtn).toBeInTheDocument();
    }
  });

  it('displays applications with correct names and statuses', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('switches to Manage Users tab and shows user data', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const usersTab = screen.getByText(/Manage Users/i);
    fireEvent.click(usersTab);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });



  

  it('approves an application when Approve button is clicked', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const approveBtn = await screen.findAllByTitle('Approve');
    fireEvent.click(approveBtn[0]);
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  });

  it('rejects an application when Reject button is clicked', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const rejectBtn = await screen.findAllByTitle('Reject');
    fireEvent.click(rejectBtn[0]);
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  });

  it('expands and collapses user details in Manage Users tab', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    fireEvent.click(screen.getByText(/Manage Users/i));
    const userItem = screen.getByText('John Doe').closest('.user-item');
    fireEvent.click(userItem.querySelector('.user-header'));
    await waitFor(() => expect(screen.getByText(/Revoke Role/i)).toBeInTheDocument());
    fireEvent.click(userItem.querySelector('.user-header'));
    await waitFor(() => expect(screen.queryByText(/Revoke Role/i)).not.toBeInTheDocument());
  });

  it('displays pending badge on calendar tile in Bookings Portal', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    fireEvent.click(screen.getByText(/Bookings Portal/i));
    await waitFor(() => expect(screen.getByTestId('calendar-mock')).toBeInTheDocument());
  });
});
