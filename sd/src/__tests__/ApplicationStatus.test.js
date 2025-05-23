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
  const actualFirestore = jest.requireActual('firebase/firestore');
  return {
    ...actualFirestore,
    collection: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
  };
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
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Firestore functions to return expected values
    collection.mockReturnValue('applications');
    where.mockImplementation((field, operator, value) => ({ field, operator, value }));
    orderBy.mockImplementation((field, direction) => ({ field, direction }));
    query.mockImplementation((colRef, ...queryConstraints) => ({
      colRef,
      queryConstraints,
    }));

    // Mock getDocs to resolve with mock applications
    getDocs.mockResolvedValue({
      docs: mockApplications.map((app) => ({
        id: app.id,
        data: () => ({
          ...app,
          submittedAt: app.submittedAt.toDate 
            ? app.submittedAt.toDate().toLocaleString() 
            : app.submittedAt,
        }),
      })),
    });
  });

  it('displays loading state initially', () => {
    getDocs.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<ApplicationStatus />);
    expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    expect(screen.getByAltText('Loading...').src).toContain('/images/sportify.gif');
  });

  

  it('correctly displays all application sections', async () => {
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('correctly categorizes and displays applications by status', async () => {
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      // Check pending applications
      expect(screen.getByText('Gym Membership')).toBeInTheDocument();
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Membership')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('Awaiting review')).toBeInTheDocument();
      
      // Check approved applications
      expect(screen.getByText('Pool Access')).toBeInTheDocument();
      expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
      expect(screen.getByText('Access')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('Approved for use')).toBeInTheDocument();
      
      // Check rejected applications
      expect(screen.getByText('Yoga Class')).toBeInTheDocument();
      expect(screen.getByText('Yoga Studio')).toBeInTheDocument();
      expect(screen.getByText('Class')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.getByText('Class full')).toBeInTheDocument();
    });
  });

  it('displays "No applications" messages when no applications exist', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('No pending applications.')).toBeInTheDocument();
      expect(screen.getByText('No approved applications.')).toBeInTheDocument();
      expect(screen.getByText('No rejected applications.')).toBeInTheDocument();
    });
  });

  

  it('applies correct CSS classes based on application status', async () => {
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      const pendingStatus = screen.getByText('pending').closest('span');
      const approvedStatus = screen.getByText('approved').closest('span');
      const rejectedStatus = screen.getByText('rejected').closest('span');
      
      expect(pendingStatus).toHaveClass('status');
      expect(pendingStatus).toHaveClass('pending');
      expect(approvedStatus).toHaveClass('status');
      expect(approvedStatus).toHaveClass('approved');
      expect(rejectedStatus).toHaveClass('status');
      expect(rejectedStatus).toHaveClass('rejected');
    });
  });

  it('sorts applications by submittedAt in descending order', async () => {
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      expect(orderBy).toHaveBeenCalledWith('submittedAt', 'desc');
    });
  });

  it('only fetches applications for the current user', async () => {
    render(<ApplicationStatus />);
    
    await waitFor(() => {
      expect(where).toHaveBeenCalledWith('uid', '==', 'user123');
    });
  });
});