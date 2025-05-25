import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import AddFacility from '../components/AddFacility';
import { db, storage } from '../firebase';
import { toast } from 'react-toastify';

// Mock Firebase and other dependencies
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({
    isLoaded: true,
    loadError: null,
  }),
  GoogleMap: () => <div>Google Map</div>,
  Marker: () => <div>Marker</div>,
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('AddFacility Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the form with all fields', () => {
    render(<AddFacility />);
    
    expect(screen.getByText('Add a New Facility')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search facility location')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Basketball')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByText('Upload Image/GIF')).toBeInTheDocument();
    expect(screen.getByText('Subfacilities (Courts/Fields)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('handles name input change', () => {
    render(<AddFacility />);
    // Use the id to specifically target the facility name input
    const nameInput = screen.getByLabelText('Name');
    
    fireEvent.change(nameInput, { target: { value: 'Test Facility' } });
    expect(nameInput.value).toBe('Test Facility');
  });

  test('handles sport type selection', () => {
    render(<AddFacility />);
    const sportTypeSelect = screen.getByDisplayValue('Basketball');
    
    fireEvent.change(sportTypeSelect, { target: { value: 'Soccer' } });
    expect(sportTypeSelect.value).toBe('Soccer');
  });

  test('prevents negative capacity values', () => {
    render(<AddFacility />);
    const capacityInput = screen.getByDisplayValue('0');
    
    fireEvent.change(capacityInput, { target: { value: '-10' } });
    expect(capacityInput.value).toBe('0');
  });

  test('handles image upload and preview', async () => {
    render(<AddFacility />);
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('Upload Image/GIF');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('Facility preview')).toBeInTheDocument();
    });
  });

  test('rejects invalid image types', async () => {
    render(<AddFacility />);
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Upload Image/GIF');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Only JPG, PNG, or GIF images are allowed');
    });
  });

  test('handles subfacility addition', async () => {
    render(<AddFacility />);
    
    // Set facility capacity first
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '50' }
    });

    // Fill in subfacility form
    fireEvent.change(screen.getByPlaceholderText('e.g., Court 1, Field A'), {
      target: { value: 'Court 1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Capacity for this subfacility'), {
      target: { value: '10' },
    });
    
    fireEvent.click(screen.getByText('Add Subfacility'));
    
    await waitFor(() => {
      expect(screen.getByText('Court 1 (Capacity: 10)')).toBeInTheDocument();
    });
  });

  test('validates subfacility capacity does not exceed facility capacity', async () => {
    render(<AddFacility />);
    
    // Set facility capacity
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '50' },
    });
    
    // Try to add subfacility with too high capacity
    fireEvent.change(screen.getByPlaceholderText('e.g., Court 1, Field A'), {
      target: { value: 'Court 1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Capacity for this subfacility'), {
      target: { value: '60' },
    });
    
    fireEvent.click(screen.getByText('Add Subfacility'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot add subfacility. Remaining capacity is only 50')
      );
    });
  });

  test('handles subfacility removal', async () => {
    render(<AddFacility />);
    
    // Set facility capacity first
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '50' }
    });

    // Add a subfacility first
    fireEvent.change(screen.getByPlaceholderText('e.g., Court 1, Field A'), {
      target: { value: 'Court 1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Capacity for this subfacility'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('Add Subfacility'));
    
    await waitFor(() => {
      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);
    });
    
    expect(screen.queryByText('Court 1 (Capacity: 10)')).not.toBeInTheDocument();
  });

  test('displays loading state during submission', async () => {
    render(<AddFacility />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Facility' },
    });
    fireEvent.change(screen.getByPlaceholderText('Search facility location'), {
      target: { value: 'Test Location' },
    });
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '50' },
    });
    
    // Mock a slow submission
    require('firebase/firestore').addDoc.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ id: 'test-id' }), 1000))
    );
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    // Check for loading state
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton.textContent).toMatch(/submitting/i);
  });

    test('resets form after successful submission', async () => {
    render(<AddFacility />);
    
    // Fill in required fields
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test Facility' } });
    
    const locationInput = screen.getByPlaceholderText('Search facility location');
    fireEvent.change(locationInput, { target: { value: 'Test Location' } });
    
    const capacityInput = screen.getByDisplayValue('0');
    fireEvent.change(capacityInput, { target: { value: '50' } });
    
    // Add an image
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('Upload Image/GIF');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Add a subfacility
    fireEvent.change(screen.getByPlaceholderText('e.g., Court 1, Field A'), {
      target: { value: 'Court 1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Capacity for this subfacility'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('Add Subfacility'));
    
    // Mock successful submission
    require('firebase/firestore').addDoc.mockResolvedValueOnce({ id: 'test-id' });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Facility submitted successfully!');
      expect(nameInput.value).toBe('Test Facility');
      expect(locationInput.value).toBe('Test Location');
    });
  });
});