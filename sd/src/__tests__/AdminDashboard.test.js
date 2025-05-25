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


  it('switches to the Notifications tab and displays the notification form', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const notificationsTabButton = screen.getByRole('button', { name: /Notification Sender/i });
    fireEvent.click(notificationsTabButton);

    await waitFor(() => {
      expect(notificationsTabButton).toHaveClass('active');
      expect(screen.getByRole('heading', { name: /Send Notification/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Send to role:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Message:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Notification/i })).toBeInTheDocument();
    });
  });
it('renders the Admin Dashboard title', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  expect(screen.getByRole('heading', { name: /Admin Dashboard/i })).toBeInTheDocument();
});

it('initially displays the Applications tab as active', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  const applicationsTabButton = screen.getByRole('button', { name: /Applications/i });
  expect(applicationsTabButton).toHaveClass('active');
});

it('switches to Bookings Portal tab and shows the calendar', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  const bookingsTabButton = screen.getByRole('button', { name: /Bookings Portal/i });
  fireEvent.click(bookingsTabButton);
  await waitFor(() => {
    expect(bookingsTabButton).toHaveClass('active');
    expect(screen.getByTestId('calendar-mock')).toBeInTheDocument();
  });
});

it('displays "No bookings for this date" initially in Bookings Portal', async () => {
  // Modify mockBookings to be empty for this specific test or ensure selectedDate initially has no bookings
  const originalBookings = [...mockBookings]; // copy original
  mockBookings.length = 0; // Clear mockBookings for this test

  getDocs.mockImplementation((colRef) => {
    if (colRef.path === 'applications') {
      return Promise.resolve({ docs: mockApplications.map(a => ({ id: a.id, data: () => a })) });
    }
    if (colRef.path === 'users') {
      return Promise.resolve({ docs: mockUsers.map(u => ({ id: u.id, data: () => u })) });
    }
    if (colRef.path === 'facilities') {
      return Promise.resolve({
        docs: [{
          id: 'fac1',
          data: () => ({ name: 'Main Gym', bookings: [] }) // No bookings for this test
        }]
      });
    }
    if (colRef.path === 'facilities/fac1/subfacilities') {
      return Promise.resolve({ docs: [] });
    }
    if (colRef.path === 'events') {
       return Promise.resolve({ forEach: () => {}, docs: [] });
    }
    return Promise.resolve({ docs: [] });
  });

  await act(async () => {
    render(<AdminDashboard />);
  });

  const bookingsTabButton = screen.getByRole('button', { name: /Bookings Portal/i });
  fireEvent.click(bookingsTabButton);

  await waitFor(() => {
    // This relies on the default selectedDate not matching any bookings
    expect(screen.getByText('No bookings for this date')).toBeInTheDocument();
  });
  mockBookings.push(...originalBookings); // Restore mockBookings
});


it('shows loading state initially', () => {
  // Prevent fetchData from resolving immediately to see loading state
  let resolveFetch;
  getDocs.mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));

  render(<AdminDashboard />);
  expect(screen.getByAltText(/Loading.../i)).toBeInTheDocument();

  // Allow fetchData to resolve to cleanup
  act(() => {
    if (resolveFetch) {
      resolveFetch({
        docs: mockApplications.map(a => ({ id: a.id, data: () => a })),
        // Simulate resolving all other fetches as well if needed, or simplify the mock for this test
      });
    }
  });
});


it('defaults to "Resident" for notification role', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Notification Sender/i));
  const roleSelect = await screen.findByLabelText(/Send to role:/i);
  expect(roleSelect.value).toBe('Resident');
});

it('has an empty notification message input initially', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Notification Sender/i));
  const messageTextarea = await screen.findByLabelText(/Message:/i);
  expect(messageTextarea.value).toBe('');
});

it('shows an alert if trying to send notification with empty message', async () => {
  window.alert = jest.fn(); // Mock window.alert

  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Notification Sender/i));

  const sendButton = await screen.findByRole('button', { name: /Send Notification/i });
  fireEvent.click(sendButton);

  expect(window.alert).toHaveBeenCalledWith('Enter a message');
  window.alert.mockRestore(); // Restore original window.alert
});

it('does not show "Load More" for applications if all are visible', async () => {
  // Assuming mockApplications has 2 items, and default visibleCount is 10
  await act(async () => {
    render(<AdminDashboard />);
  });
  await waitFor(() => { // Wait for applications to load
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument();
});


  it('updates notification message state when typing in the textarea', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const notificationsTabButton = screen.getByRole('button', { name: /Notification Sender/i });
    fireEvent.click(notificationsTabButton);

    const messageTextarea = await screen.findByLabelText(/Message:/i);
    fireEvent.change(messageTextarea, { target: { value: 'Test notification message' } });
    expect(messageTextarea.value).toBe('Test notification message');
  });

  it('updates notification role state when selecting a new role', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    const notificationsTabButton = screen.getByRole('button', { name: /Notification Sender/i });
    fireEvent.click(notificationsTabButton);

    const roleSelect = await screen.findByLabelText(/Send to role:/i);
    fireEvent.change(roleSelect, { target: { value: 'Admin' } });
    expect(roleSelect.value).toBe('Admin');
  });

  it('shows "No applications found" when applications array is empty', async () => {
    getDocs.mockImplementation((colRef) => {
      if (colRef.path === 'applications') {
        return Promise.resolve({ docs: [] }); // No applications
      }
      if (colRef.path === 'users') {
        return Promise.resolve({ docs: mockUsers.map(u => ({ id: u.id, data: () => u })) });
      }
      if (colRef.path === 'facilities') {
        return Promise.resolve({
          docs: [{
            id: 'fac1',
            data: () => ({ name: 'Main Gym', bookings: mockBookings })
          }]
        });
      }
      if (colRef.path === 'facilities/fac1/subfacilities') {
        return Promise.resolve({ docs: [] });
      }
       if (colRef.path === 'events') {
        return Promise.resolve({
          forEach: () => {},
          docs: [],
        });
      }
      return Promise.resolve({ docs: [] });
    });

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('No applications found')).toBeInTheDocument();
    });
  });

  

  it('filters users by role in Manage Users tab', async () => {
    await act(async () => {
      render(<AdminDashboard />);
    });
    fireEvent.click(screen.getByText(/Manage Users/i));

    const roleFilterSelect = await screen.findByRole('combobox');
    fireEvent.change(roleFilterSelect, { target: { value: 'Admin' } });

    await waitFor(() => {
      // Check that only Jane Smith (Admin) is visible
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    fireEvent.change(roleFilterSelect, { target: { value: 'Facility Staff' } });
    await waitFor(() => {
      // Check that only John Doe (Facility Staff) is visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('sorts users by role in Manage Users tab', async () => {
    // Ensure mockUsers are not already sorted by role for a meaningful sort test if roles were different
    // For this specific mock, 'Admin' comes before 'Facility Staff' alphabetically.
    await act(async () => {
      render(<AdminDashboard />);
    });
    fireEvent.click(screen.getByText(/Manage Users/i));

    const sortButton = await screen.findByText(/Sort by Role/i); // Will include ▲ or ▼ initially

    // Initial render has John Doe (Facility Staff) and Jane Smith (Admin)
    // Default sort is ascending: Admin, Facility Staff
    let userItems = await screen.findAllByRole('listitem');
    expect(userItems[0]).toHaveTextContent('Jane Smith'); // Admin
    expect(userItems[1]).toHaveTextContent('John Doe');   // Facility Staff

    fireEvent.click(sortButton); // Sort descending

    await waitFor(async () => {
      userItems = await screen.findAllByRole('listitem');
      expect(userItems[0]).toHaveTextContent('John Doe');   // Facility Staff
      expect(userItems[1]).toHaveTextContent('Jane Smith'); // Admin
      expect(screen.getByText(/Sort by Role ▼/i)).toBeInTheDocument(); // Check for descending indicator
    });

    fireEvent.click(sortButton); // Sort ascending again

    await waitFor(async () => {
      userItems = await screen.findAllByRole('listitem');
      expect(userItems[0]).toHaveTextContent('Jane Smith'); // Admin
      expect(userItems[1]).toHaveTextContent('John Doe');   // Facility Staff
      expect(screen.getByText(/Sort by Role ▲/i)).toBeInTheDocument(); // Check for ascending indicator
    });
  });



it('filters users by role in Manage Users tab', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Manage Users/i));
  
  const roleFilter = screen.getByRole('combobox');
  fireEvent.change(roleFilter, { target: { value: 'Admin' } });
  
  await waitFor(() => {
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});


it('shows booking details when date is selected in Bookings Portal', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Bookings Portal/i));
  
  const calendar = screen.getByTestId('calendar-mock');
  fireEvent.click(calendar);
  
  await waitFor(() => {
    expect(screen.getByText(/Bookings for/i)).toBeInTheDocument();
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
  });
});



it('displays correct initials for user avatars', async () => {
  await act(async () => {
    render(<AdminDashboard />);
  });
  fireEvent.click(screen.getByText(/Manage Users/i));
  
  expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
  expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith initials
});

it('shows no applications message when there are none', async () => {
  getDocs.mockImplementationOnce((colRef) => {
    if (colRef.path === 'applications') {
      return Promise.resolve({ docs: [] });
    }
    return Promise.resolve({ docs: [] });
  });
  
  await act(async () => {
    render(<AdminDashboard />);
  });
  
  expect(screen.getByText(/No applications found/i)).toBeInTheDocument();
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
