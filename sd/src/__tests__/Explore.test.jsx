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

  // Test 1: Loading State
  test('renders loading state initially', () => {
    renderWithRouter(<Explore />);
    expect(screen.getByText('Loading facilities...')).toBeInTheDocument();
  });

  // Test 2: Facility Rendering
  test('renders facilities after loading', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Explore Facilities')).toBeInTheDocument();
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
      expect(screen.getByText('Soccer Field')).toBeInTheDocument();
      expect(screen.getByText('Sport: Gym')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 50')).toBeInTheDocument();
      expect(screen.getByText('★★★★')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

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

  // Test 6: Report Form Open/Close
  test('opens and closes report form', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    const reportButton = screen.getAllByText('Report Issue')[0];
    fireEvent.click(reportButton);
    expect(screen.getByText('Report Issue for Main Gym')).toBeInTheDocument();

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    expect(screen.queryByText('Report Issue for Main Gym')).not.toBeInTheDocument();
  });

  // Test 7: Report Form Submission Success
  test('submits report successfully', async () => {
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    fireEvent.change(screen.getByRole('combobox', { name: /issue type/i }), { target: { value: 'Equipment Broken' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Broken treadmill' } });
    fireEvent.change(screen.getByRole('textbox', { name: /specific area/i }), { target: { value: 'Treadmill #3' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Report'));
    });

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        issue: 'Equipment Broken',
        description: 'Broken treadmill',
        sub_facility: 'Treadmill #3',
      }));
      expect(screen.queryByText('Report Issue for Main Gym')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // Test 8: Report Form with Image
  test('submits report with image', async () => {
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg', size: 1024 });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    fireEvent.change(screen.getByRole('combobox', { name: /issue type/i }), { target: { value: 'Safety Hazard' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Broken floor' } });
    fireEvent.change(screen.getByRole('textbox', { name: /specific area/i }), { target: { value: 'Court A' } });

    const fileInput = screen.getByLabelText(/upload image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'mocked-image-url');

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Report'));
    });

    await waitFor(() => {
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        imageUrl: 'mocked-download-url',
      }));
    }, { timeout: 1000 });
  });

  // Test 9: Report Form Invalid File
  test('shows error for invalid file type', async () => {
    const file = new File(['file'], 'test.pdf', { type: 'application/pdf' });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    const fileInput = screen.getByLabelText(/upload image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText('Only JPG, PNG or GIF images are allowed')).toBeInTheDocument();
  });

  // Test 10: Report Form File Too Large
  test('shows error for file too large', async () => {
    const file = new File(['file'], 'test.jpg', { type: 'image/jpeg', size: 6 * 1024 * 1024 });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    const fileInput = screen.getByLabelText(/upload image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText('Image must be smaller than 5MB')).toBeInTheDocument();
  });

  // Test 11: Unauthenticated User Report
  test('shows error for unauthenticated user trying to report', async () => {
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return jest.fn();
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    expect(screen.getByText('Please sign in to submit a report')).toBeInTheDocument();
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

  // Test 14: Close Facility
  test('closes facility as admin', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Admin', displayName: 'Admin User' }),
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Close Facility')[0]);
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'closed' });
      expect(screen.getByText('Facility Closed for Maintenance')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // Test 15: Open Facility
  test('opens closed facility as admin', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'Admin', displayName: 'Admin User' }),
    });
    getDocs.mockResolvedValueOnce({
      docs: [{
        id: 'facility1',
        data: () => ({
          id: 'facility1',
          name: 'Main Gym',
          sport_type: 'Gym',
          status: 'closed',
          images: ['gym-image.jpg'],
        }),
      }],
    });
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByText('Open Facility'));
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'open' });
      expect(screen.queryByText('Facility Closed for Maintenance')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // Test 16: Submission Failure
  test('handles report submission failure', async () => {
    addDoc.mockRejectedValueOnce(new Error('Submission failed'));
    renderWithRouter(<Explore />);
    await waitFor(() => {
      expect(screen.getByText('Main Gym')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getAllByText('Report Issue')[0]);
    fireEvent.change(screen.getByRole('combobox', { name: /issue type/i }), { target: { value: 'Cleanliness' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Dirty floor' } });
    fireEvent.change(screen.getByRole('textbox', { name: /specific area/i }), { target: { value: 'Locker Room' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Report'));
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to submit report: Submission failed')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

afterAll(() => {
  consoleErrorMock.mockRestore();
});