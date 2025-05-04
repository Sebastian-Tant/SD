import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ApplicationStatus from '../components/ApplicationStatus';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// --- Mocks ---
jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'user123' }, // Mock authenticated user
  },
  db: {},
}));

jest.mock('firebase/firestore', () => {
  const query = jest.fn((collection, ...constraints) => ({ collection, constraints }));
  const where = jest.fn((field, operator, value) => ({ field, operator, value }));
  const orderBy = jest.fn((field, direction) => ({ field, direction }));
  const collection = jest.fn((db, path) => ({ path }));
  const getDocs = jest.fn();

  return { collection, getDocs, query, where, orderBy };
});

// --- Test Suite ---
describe('ApplicationStatus Component', () => {
  // Mock data
  const mockApplications = [
    {
      id: 'app1',
      name: 'Gym Membership',
      Facility: 'Main Gym',
      applicationType: 'Membership',
      status: 'pending',
      message: 'Awaiting review',
      submittedAt: { toDate: () => new Date('2025-05-01T10:00:00Z') },
    },
    {
      id: 'app2',
      name: 'Pool Access',
      Facility: 'Swimming Pool',
      applicationType: 'Access',
      status: 'approved',
      message: 'Approved for use',
      submittedAt: '2025-05-02T12:00:00',
    },
    {
      id: 'app3',
      name: 'Yoga Class',
      Facility: 'Yoga Studio',
      applicationType: 'Class',
      status: 'rejected',
      message: 'Class full',
      submittedAt: { toDate: () => new Date('2025-05-03T14:00:00Z') },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firestore query chain behavior
    collection.mockImplementation((db, path) => ({ path }));
    where.mockImplementation((field, operator, value) => ({ field, operator, value }));
    orderBy.mockImplementation((field, direction) => ({ field, direction }));
    query.mockImplementation((collection, ...constraints) => ({ collection, constraints }));

    // Mock getDocs to resolve with mock applications
    getDocs.mockImplementation(async (queryObj) => {
      expect(queryObj.collection.path).toBe('applications');
      expect(queryObj.constraints).toHaveLength(2);
      expect(queryObj.constraints[0]).toEqual({ field: 'uid', operator: '==', value: 'user123' });
      expect(queryObj.constraints[1]).toEqual({ field: 'submittedAt', direction: 'desc' });

      return {
        docs: mockApplications.map((app) => ({
          id: app.id,
          data: () => ({
            ...app,
            submittedAt: app.submittedAt.toDate ? app.submittedAt.toDate().toLocaleString() : app.submittedAt,
          }),
        })),
      };
    });
  });

  // --- Rendering Tests ---
  it('renders loading state initially', () => {
    render(<ApplicationStatus />);
    expect(screen.getByText('Loading applications…')).toBeInTheDocument();
  });

  it('displays error message when fetching fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore error'));
    render(<ApplicationStatus />);
    expect(await screen.findByText('Error: Firestore error')).toBeInTheDocument();
  });

  it('displays error when user is not signed in', async () => {
    auth.currentUser = null; // Mock unauthenticated user
    render(<ApplicationStatus />);
    expect(await screen.findByText('Error: Not signed in')).toBeInTheDocument();
  });

  // --- Data Fetching and Display Tests ---
  it('fetches and displays applications by status', async () => {
    render(<ApplicationStatus />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    });

    // Check headings
    expect(screen.getByRole('heading', { name: 'My Applications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rejected' })).toBeInTheDocument();

    // Check application items
    expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('pending')).toHaveClass('status pending');

    expect(screen.getByText('Pool Access')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('Access')).toBeInTheDocument();
    expect(screen.getByText('Approved for use')).toBeInTheDocument();
    expect(screen.getByText('approved')).toHaveClass('status approved');

    expect(screen.getByText('Yoga Class')).toBeInTheDocument();
    expect(screen.getByText('Yoga Studio')).toBeInTheDocument();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Class full')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toHaveClass('status rejected');
  });

  it('displays "No pending applications" when there are no pending applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'pending')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Pool Access')).toBeInTheDocument(); // Approved
    expect(screen.getByText('Yoga Class')).toBeInTheDocument(); // Rejected
  });

  it('displays "No approved applications" when there are no approved applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'approved')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No approved applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Gym Membership')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Yoga Class')).toBeInTheDocument(); // Rejected
  });

  it('displays "No rejected applications" when there are no rejected applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'rejected')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No rejected applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Gym Membership')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Pool Access')).toBeInTheDocument(); // Approved
  });

  it('displays no applications when the list is empty', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications.')).toBeInTheDocument();
      expect(screen.getByText('No approved applications.')).toBeInTheDocument();
      expect(screen.getByText('No rejected applications.')).toBeInTheDocument();
    });
  });

  it('correctly formats submittedAt dates', async () => {
    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    });

    // Check formatted date for Timestamp (mocked to 2025-05-01T10:00:00Z)
    expect(screen.getByText(/May 1, 2025/)).toBeInTheDocument(); // Adjust based on locale
    // Check pre-formatted string date
    expect(screen.getByText('2025-05-02T12:00:00')).toBeInTheDocument();
  });
});