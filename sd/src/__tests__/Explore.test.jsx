import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
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

describe('Explore', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
  };

  const mockUserData = {
    role: 'user',
    displayName: 'Test User',
  };

  const mockFacilities = [
    {
      id: 'facility1',
      name: 'Main Gym',
      sport_type: 'Gym',
      status: 'Open',
      capacity: 50,
      rating: 4,
      images: ['gym-image.jpg'],
    },
    {
      id: 'facility2',
      name: 'Soccer Field',
      sport_type: 'Soccer',
      status: 'Open',
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

    // Mock addDoc for report submission
    addDoc.mockResolvedValue({});
  });

  // Wrap component in BrowserRouter for Link components
  const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

  test('renders loading state initially', () => {
    renderWithRouter(<Explore />);
    expect(screen.getByText('Loading facilities...')).toBeInTheDocument();
  });

  test('renders facilities after loading', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Explore Facilities')).toBeInTheDocument();
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch facilities'));
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load facilities')).toBeInTheDocument();
    });
  });

  test('filters facilities by sport type', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
    });

    const sportSelect = screen.getByRole('combobox');
    fireEvent.change(sportSelect, { target: { value: 'Gym' } });

    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.queryByText('Soccer Field')).not.toBeInTheDocument();

    fireEvent.change(sportSelect, { target: { value: 'All' } });
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Soccer Field')).toBeInTheDocument();
  });

  test('displays error for missing required fields', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    });

    const reportButton = screen.getAllByText('Report Issue')[0];
    fireEvent.click(reportButton);

    const submitButton = screen.getByText('Submit Report');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill all required fields')).toBeInTheDocument();
      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  test('closes report form on cancel', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    });

    const reportButton = screen.getAllByText('Report Issue')[0];
    fireEvent.click(reportButton);

    expect(screen.getByText('Report Issue for Main Gym')).toBeInTheDocument();

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Report Issue for Main Gym')).not.toBeInTheDocument();
  });
});

// Clean up console.error mock
afterAll(() => {
  consoleErrorMock.mockRestore();
});