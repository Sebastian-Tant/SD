import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AdminDashboard from "../components/AdminDashboard";
import * as firestore from "firebase/firestore";
import { FaUserTag, FaDumbbell, FaCheck, FaTimes } from 'react-icons/fa';

// Mock react-icons to verify they're rendered
jest.mock('react-icons/fa', () => ({
  FaUserTag: () => <span>FaUserTag</span>,
  FaDumbbell: () => <span>FaDumbbell</span>,
  FaCheck: () => <span>FaCheck</span>,
  FaTimes: () => <span>FaTimes</span>,
}));

// Mock react-calendar
jest.mock('react-calendar', () => {
  const originalModule = jest.requireActual('react-calendar');
  return {
    __esModule: true,
    ...originalModule,
    default: ({ onChange, value }) => (
      <div data-testid="mock-calendar" onClick={() => onChange(new Date('2023-01-01'))}>
        Mock Calendar - {value.toString()}
      </div>
    ),
  };
});

jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn((path) => ({ path })),
  collection: jest.fn((path) => ({ path })),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
  arrayUnion: jest.fn(),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../firebase', () => ({
  db: {}
}));

describe("AdminDashboard", () => {
  const mockApplication = {
    id: 'app1',
    name: 'Alice Application',
    applicationType: 'Facility Staff',
    Facility: 'Pool',
    status: 'pending',
    uid: 'user1'
  };

  const mockUser = {
    id: 'user1',
    displayName: 'Test Admin',
    role: 'Admin'
  };

  const mockBooking = {
    date: '2023-01-01',
    time: '10:00',
    attendees: 5,
    userId: 'userABC',
    status: 'pending'
  };

  const mockStaffWithAssignment = {
    id: 'staff1',
    displayName: 'Staff User',
    role: 'Facility Staff',
    assignedEvents: [{
      id: 'event1',
      title: 'Fitness Class',
      start_time: '2023-01-01T10:00:00',
      facility: 'fac1'
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] }) // Applications
      .mockResolvedValueOnce({ docs: [] }) // Users
      .mockResolvedValueOnce({ docs: [] }) // Facilities
      .mockResolvedValueOnce({ docs: [] }) // Subfacilities
      .mockResolvedValueOnce({ docs: [] }); // Events
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    firestore.updateDoc.mockResolvedValue(true);
  });

  it("renders loading initially", () => {
    render(<AdminDashboard />);
    expect(screen.getByText(/loading data/i)).toBeInTheDocument();
  });

  it('renders "No applications found" after load when data is empty', async () => {
    render(<AdminDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/no applications found/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument();
  });

  it('switches to user tab and shows "No users with special roles found" when data is empty', async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    const userTab = screen.getByRole('button', { name: /manage users/i });
    fireEvent.click(userTab);
    await waitFor(() =>
      expect(screen.getByText(/no users with special roles found/i)).toBeInTheDocument()
    );
  });

  it('switches to bookings tab and shows "No bookings for this date" when data is empty', async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    const bookingsTab = screen.getByRole('button', { name: /bookings portal/i });
    fireEvent.click(bookingsTab);
    await waitFor(() =>
      expect(screen.getByText(/no bookings for this date/i)).toBeInTheDocument()
    );
  });

  it('renders applications when applications data exists', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({
        docs: [{ id: mockApplication.id, data: () => mockApplication }],
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(mockApplication.name)).toBeInTheDocument();
      expect(screen.getByText(`FaUserTag ${mockApplication.applicationType}`)).toBeInTheDocument();
      expect(screen.getByText(/status: pending/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  it('handles application status updates', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({
        docs: [{ id: mockApplication.id, data: () => mockApplication }],
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    
    await waitFor(() => screen.getByText(mockApplication.name));
    
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    await waitFor(() => {
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'approved' }
      );
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { role: mockApplication.applicationType }
      );
    });
  });

  it('renders users when users data exists after switching tab', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{ id: mockUser.id, data: () => mockUser }],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    const userTab = screen.getByRole('button', { name: /manage users/i });
    fireEvent.click(userTab);

    await waitFor(() => {
      expect(screen.getByText(mockUser.displayName)).toBeInTheDocument();
      expect(screen.getByText(mockUser.role)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /revoke role/i })).toBeInTheDocument();
    });
  });

  it('handles user role revocation', async () => {
    window.confirm = jest.fn(() => true);
    
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{ id: mockUser.id, data: () => mockUser }],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /manage users/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage users/i }));

    await waitFor(() => screen.getByRole('button', { name: /revoke role/i }));
    fireEvent.click(screen.getByRole('button', { name: /revoke role/i }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { role: 'Resident' }
      );
    });
  });

  it('renders bookings for the selected date when booking data exists', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{
          id: 'fac1',
          data: () => ({ name: 'Main Facility' }),
        }],
      })
      .mockResolvedValueOnce({
        docs: [{
          id: 'sub1',
          data: () => ({
            name: 'Pool Area',
            bookings: [mockBooking]
          })
        }]
      });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /bookings portal/i }));
    fireEvent.click(screen.getByRole('button', { name: /bookings portal/i }));

    await waitFor(() => {
      expect(screen.getByText(/Main Facility - Pool Area/i)).toBeInTheDocument();
      expect(screen.getByText(/Time: 10:00/i)).toBeInTheDocument();
      expect(screen.getByText(/Attendees: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/User: userABC/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: pending/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  it('handles booking decisions', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{
          id: 'fac1',
          data: () => ({ name: 'Main Facility' }),
        }],
      })
      .mockResolvedValueOnce({
        docs: [{
          id: 'sub1',
          data: () => ({
            name: 'Pool Area',
            bookings: [mockBooking]
          })
        }]
      });

    firestore.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bookings: [mockBooking] })
    });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /bookings portal/i }));
    fireEvent.click(screen.getByRole('button', { name: /bookings portal/i }));

    await waitFor(() => screen.getByRole('button', { name: /approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(firestore.updateDoc).toHaveBeenCalled();
      expect(firestore.arrayUnion).toHaveBeenCalled();
    });
  });

  it('renders an error message if fetching applications fails', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs.mockRejectedValueOnce(new Error("Firestore permission denied"));
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Firestore permission denied/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no applications found/i)).not.toBeInTheDocument();
  });

  it('handles calendar date selection', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{
          id: 'fac1',
          data: () => ({ name: 'Main Facility', bookings: [{ ...mockBooking, date: '2023-01-01' }] }),
        }],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /bookings portal/i }));
    fireEvent.click(screen.getByRole('button', { name: /bookings portal/i }));

    await waitFor(() => screen.getByTestId('mock-calendar'));
    fireEvent.click(screen.getByTestId('mock-calendar'));

    await waitFor(() => {
      expect(screen.getByText(/bookings for/i)).toBeInTheDocument();
    });
  });

  it('renders notification sender tab and handles sending notifications', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /notification sender/i }));
    fireEvent.click(screen.getByRole('button', { name: /notification sender/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/send to role:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message:/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/message:/i), {
      target: { value: 'Test notification message' }
    });

    fireEvent.click(screen.getByRole('button', { name: /send notification/i }));

    await waitFor(() => {
      expect(firestore.writeBatch).toHaveBeenCalled();
      expect(firestore.arrayUnion).toHaveBeenCalled();
    });
  });

  it('filters and sorts users correctly', async () => {
    const mockAdmin = { id: 'admin1', data: () => ({ displayName: 'Admin User', role: 'Admin' }) };
    const mockStaff = { id: 'staff1', data: () => ({ displayName: 'Staff User', role: 'Facility Staff' }) };

    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [mockAdmin, mockStaff],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /manage users/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage users/i }));

    // Test filtering
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Admin' }
    });

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.queryByText('Staff User')).not.toBeInTheDocument();
    });

    // Test sorting
    fireEvent.click(screen.getByRole('button', { name: /sort by role/i }));

    await waitFor(() => {
      const users = screen.getAllByText(/User/);
      expect(users[0]).toHaveTextContent('Staff User');
      expect(users[1]).toHaveTextContent('Admin User');
    });
  });

  it('handles load more functionality', async () => {
    const mockApps = Array.from({ length: 15 }, (_, i) => ({
      id: `app${i}`,
      data: () => ({
        name: `App ${i}`,
        applicationType: 'Facility Staff',
        status: 'pending'
      })
    }));

    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({
        docs: mockApps,
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/App \d+/).length).toBe(10);
    });

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/App \d+/).length).toBe(15);
    });
  });

  it('shows user details when expanded', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{ id: mockUser.id, data: () => mockUser }],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /manage users/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage users/i }));

    await waitFor(() => {
      const userHeader = screen.getByText(mockUser.displayName).closest('.user-header');
      fireEvent.click(userHeader);
      expect(screen.getByRole('button', { name: /revoke role/i })).toBeInTheDocument();
    });
  });

  it('computes initials correctly', async () => {
    const { getInitials } = require('../components/AdminDashboard');
    
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Alice')).toBe('A');
    expect(getInitials('')).toBe('');
    expect(getInitials('John Jacob Smith')).toBe('JS');
  });

  it('renders staff with assignments correctly', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] }) // Applications
      .mockResolvedValueOnce({ docs: [] }) // Users (initial)
      .mockResolvedValueOnce({ docs: [] }) // Facilities
      .mockResolvedValueOnce({ docs: [] }) // Subfacilities
      .mockResolvedValueOnce({ // Events
        docs: [{
          id: 'event1',
          data: () => ({
            title: 'Fitness Class',
            start_time: { toDate: () => new Date('2023-01-01T10:00:00') },
            facility_id: 'fac1',
            assigned_staff_ids: ['staff1']
          })
        }]
      })
      .mockResolvedValueOnce({ // Staff users
        docs: [{
          id: mockStaffWithAssignment.id,
          data: () => ({
            displayName: mockStaffWithAssignment.displayName,
            role: mockStaffWithAssignment.role
          })
        }]
      });

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    
    // The staff assignments are internal state, but we can verify the data fetching
    expect(firestore.getDocs).toHaveBeenCalledTimes(6); // Includes events and staff queries
  });

  it('handles empty notification message', async () => {
    window.alert = jest.fn();
    
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /notification sender/i }));
    fireEvent.click(screen.getByRole('button', { name: /notification sender/i }));

    fireEvent.click(screen.getByRole('button', { name: /send notification/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Enter a message');
      expect(firestore.writeBatch).not.toHaveBeenCalled();
    });
  });

  it('handles error when updating user role fails', async () => {
    firestore.updateDoc.mockRejectedValueOnce(new Error('Update failed'));
    
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{ id: mockUser.id, data: () => mockUser }],
      })
      .mockResolvedValueOnce({ docs: [] });

    render(<AdminDashboard />);
    await waitFor(() => screen.getByRole('button', { name: /manage users/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage users/i }));

    window.confirm = jest.fn(() => true);
    fireEvent.click(screen.getByRole('button', { name: /revoke role/i }));

    await waitFor(() => {
      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });
});