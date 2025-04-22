import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboard from "../components/AdminDashboard";
import * as firestore from "firebase/firestore";

// --- Mocks (keep your existing mocks) ---
jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
  arrayUnion: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {}
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestore.getDocs
      .mockResolvedValueOnce({ // Applications
        docs: [],
      })
      .mockResolvedValueOnce({ // Users
        docs: [],
      })
      .mockResolvedValueOnce({ // Facilities
        docs: [],
      });
    firestore.getDoc.mockResolvedValue({ exists: () => false });
  });

  // --- Keep unchanged passing tests ---

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

  // --- Fixed Test Cases ---

  it('renders applications when applications data exists', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ // Applications (with data)
        docs: [
          { id: 'app1', data: () => ({ name: 'Alice Application', applicationType: 'Facility Staff', Facility: 'Pool', status: 'pending', uid: 'user1' }) },
        ],
      })
      .mockResolvedValueOnce({ docs: [] }) // Users (empty)
      .mockResolvedValueOnce({ docs: [] }); // Facilities (empty)

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Alice Application/i)).toBeInTheDocument();
    });

    // --- FIX START ---
    // Find the label within the strong tag, then check the parent p tag's full text content
    const positionLabel = screen.getByText('Position:');
    expect(positionLabel.closest('p')).toHaveTextContent(/Position: Facility Staff/i);

    const facilityLabel = screen.getByText('Facility:');
    expect(facilityLabel.closest('p')).toHaveTextContent(/Facility: Pool/i);

    const statusLabel = screen.getByText('Status:');
    // Status value is inside a span, so we can check the parent p includes the text 'pending'
    expect(statusLabel.closest('p')).toHaveTextContent(/pending/i);
    // --- FIX END ---

    // These can remain the same as they target specific elements correctly
    expect(screen.getByText('pending')).toBeInTheDocument(); // Check status value exists specifically
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();

    expect(screen.queryByText(/no applications found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument();
  });

  // --- Keep unchanged passing test ---
  it('renders users when users data exists after switching tab', async () => {
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] }) // Applications (empty)
      .mockResolvedValueOnce({ // Users (with data)
        docs: [
          { id: 'user1', data: () => ({ displayName: 'Test Admin', role: 'Admin' }) },
          { id: 'user2', data: () => ({ displayName: 'Test Staff', role: 'Facility Staff' }) },
        ],
      })
      .mockResolvedValueOnce({ docs: [] }); // Facilities (empty)

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    const userTab = screen.getByRole('button', { name: /manage users/i });
    fireEvent.click(userTab);

    await waitFor(() => {
      expect(screen.getByText(/Test Admin/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Test Staff/i)).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Facility Staff')).toBeInTheDocument();
    const revokeButtons = screen.getAllByRole('button', { name: /revoke role/i });
    expect(revokeButtons.length).toBe(2);
    expect(screen.queryByText(/no users with special roles found/i)).not.toBeInTheDocument();
  });

  // --- Fixed Test Case ---
  it('renders bookings for the selected date when booking data exists', async () => {
    const testDate = new Date();
    const testDateString = testDate.toISOString().split('T')[0];

    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] }) // Applications (empty)
      .mockResolvedValueOnce({ docs: [] }) // Users (empty)
      .mockResolvedValueOnce({ // Facilities (with booking data)
        docs: [
          {
            id: 'fac1',
            data: () => ({ name: 'Main Facility' }),
          },
        ],
      })
      .mockResolvedValueOnce({ // Subfacilities for fac1
         docs: [
           {
             id: 'sub1',
             data: () => ({
               name: 'Pool Area',
               bookings: [
                 { date: testDateString, time: '10:00', attendees: 5, userId: 'userABC', status: 'pending' },
                 { date: '2099-12-31', time: '11:00', attendees: 2, userId: 'userXYZ', status: 'pending' }
               ]
             })
           }
         ]
      });

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.queryByText(/loading data/i)).not.toBeInTheDocument());
    const bookingsTab = screen.getByRole('button', { name: /bookings portal/i });
    fireEvent.click(bookingsTab);

    await waitFor(() => {
       expect(screen.getByText(/Main Facility - Pool Area/i)).toBeInTheDocument();
    });

    // --- FIX START ---
    // Find the label within the strong tag, then check the parent p tag's full text content
    const timeLabel = screen.getByText('Time:');
    expect(timeLabel.closest('p')).toHaveTextContent(/Time: 10:00/i);

    const attendeesLabel = screen.getByText('Attendees:');
    expect(attendeesLabel.closest('p')).toHaveTextContent(/Attendees: 5/i);

    const userLabel = screen.getByText('User:');
    expect(userLabel.closest('p')).toHaveTextContent(/User: userABC/i);

    const statusLabel = screen.getByText('Status:');
    // Status value is inside a span, so we can check the parent p includes the text 'pending'
    expect(statusLabel.closest('p')).toHaveTextContent(/pending/i);
     // --- FIX END ---

    // These can remain the same
    expect(screen.getByText('pending')).toBeInTheDocument(); // Check status value exists specifically
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();

    expect(screen.queryByText(/no bookings for this date/i)).not.toBeInTheDocument();
  });

  // --- Keep unchanged passing test ---
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

});