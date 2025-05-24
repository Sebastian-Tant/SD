import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../components/AdminDashboard'; // Update path
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, getDoc, query, where, writeBatch } from 'firebase/firestore';
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
    dateObj: new Date('2023-01-01')
  },
];

const mockEvents = [];

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Improved getDocs mock
    getDocs.mockImplementation((colRef) => {
      const path = colRef.path || '';
      
      if (path === 'applications') {
        return Promise.resolve({ 
          docs: mockApplications.map(app => ({ 
            id: app.id, 
            data: () => app 
          })) 
        });
      }
      
      if (path === 'users') {
        return Promise.resolve({ 
          docs: mockUsers.map(user => ({ 
            id: user.id, 
            data: () => user 
          })) 
        });
      }
      
      if (path === 'facilities') {
        return Promise.resolve({ 
          docs: [{ 
            id: 'fac1', 
            data: () => ({ 
              name: 'Main Gym', 
              bookings: mockBookings.filter(b => !b.subfacilityId)
            }) 
          }] 
        });
      }
      
      if (path.includes('subfacilities')) {
        return Promise.resolve({ 
          docs: [],
          forEach: jest.fn()
        });
      }
      
      if (path === 'events') {
        return Promise.resolve({ 
          docs: mockEvents.map(ev => ({
            id: `ev${mockEvents.length}`,
            data: () => ev
          })),
          forEach: function(callback) {
            this.docs.forEach(doc => callback(doc));
          }
        });
      }
      
      return Promise.resolve({ docs: [] });
    });

    // Mock updateDoc
    updateDoc.mockResolvedValue(true);

    // Mock auth
    getAuth.mockReturnValue({});
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'admin1' });
      return jest.fn();
    });
  });

  it('renders loading state initially', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      const loading = screen.queryByText(/Loading.../i);
      const error = screen.queryByText(/Error:/i);
      expect(loading || error).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
  });

  it('displays error message when data fetch fails', async () => {
    getDocs.mockRejectedValue(new Error('Fetch failed'));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/Error: Fetch failed/i)).toBeInTheDocument());
  });

 

 



 
});