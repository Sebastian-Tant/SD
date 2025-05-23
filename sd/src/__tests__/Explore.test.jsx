import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BrowserRouter } from 'react-router-dom';
import Explore from '../components/Explore';

// Mock Firebase dependencies
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
  },
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock URL.createObjectURL for image previews
global.URL.createObjectURL = jest.fn(() => 'mocked-image-url');

// Mock console.error to suppress expected error logs during tests
const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Explore Component', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
  };

  const mockUserData = {
    role: 'Resident',
    displayName: 'Test User',
  };

  const mockFacilities = [
    {
      id: 'facility1',
      name: 'Main Gym',
      sport_type: 'Gym',
      status: 'open',
      capacity: 50,
      rating: 4,
      images: ['gym-image.jpg'],
    },
    {
      id: 'facility2',
      name: 'Soccer Field',
      sport_type: 'Soccer',
      status: 'open',
      capacity: 22,
      rating: 3,
      images: ['soccer-image.jpg'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock.mockReset();

    // Mock Firebase auth
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn(); // Mock unsubscribe
    });

    // Mock user data
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    // Mock facilities data
    collection.mockReturnValue({});
    getDocs.mockResolvedValue({
      docs: mockFacilities.map((facility) => ({
        id: facility.id,
        data: () => facility,
      })),
    });

    // Mock storage
    ref.mockReturnValue({});
    uploadBytes.mockResolvedValue({ ref: {} });
    getDownloadURL.mockResolvedValue('mocked-download-url');

    // Mock addDoc and updateDoc
    addDoc.mockResolvedValue({});
    updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);
  // Test 3: Fetch Failure
  test('displays error message on fetch failure', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch facilities'));
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load facilities')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // Test 4: Filter by Sport
  test('filters facilities by sport type', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    }, { timeout: 1000 });

    const sportSelect = screen.getByRole('combobox');
    fireEvent.change(sportSelect, { target: { value: 'Gym' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.change(sportSelect, { target: { value: 'All' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  // Test 5: No Facilities Found
  test('displays no facilities message when none match criteria', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('No facilities found matching your criteria.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
  // Test 12: Admin Role Features
  test('shows admin features for admin user', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Admin', displayName: 'Admin User' }),
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText('➕ Add New Facility')).toBeInTheDocument();
    expect(screen.getAllByText('Close Facility')[0]).toBeInTheDocument();
  });

  // Test 13: Facility Staff Role
  test('shows close/open buttons for facility staff', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Facility Staff', displayName: 'Staff User' }),
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getAllByText('Close Facility')[0]).toBeInTheDocument();
  });


  
});

afterAll(() => {
  consoleErrorMock.mockRestore();
});