import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AddFacility from '../components/AddFacility'; // Adjust path if necessary
import '@testing-library/jest-dom/extend-expect';
import { act } from 'react';

// --- Mocks ---
jest.mock('../firebase', () => ({ // Adjust path if necessary
  db: {},
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mockFacilityId' })),
  setDoc: jest.fn(() => Promise.resolve())
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: jest.fn(() => Promise.resolve("mock-url")),
}));

// Mock toast for notifications
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock Google Maps Autocomplete and related objects
beforeEach(() => {
  global.window.google = {
    maps: {
      places: {
        Autocomplete: jest.fn(() => ({
          addListener: jest.fn(),
          getPlace: jest.fn(),
        })),
      },
      event: { clearInstanceListeners: jest.fn() },
    },
  };
});

afterEach(() => {
  delete global.window.google;
  jest.clearAllMocks();
});

// Mocking useLoadScript and GoogleMap/Marker
jest.mock('@react-google-maps/api', () => ({
  useLoadScript: jest.fn(() => ({
    isLoaded: true,
    loadError: null,
  })),
  GoogleMap: ({ children }) => <div>Google Map Mock {children}</div>,
  Marker: () => <div>Marker Mock</div>,
}));

// --- Test Suites ---

describe('Permission-based rendering and Subfacility Addition', () => {
  test('renders form for admin users', () => {
    render(<AddFacility isAdmin={true} />);
    expect(screen.getByText('Add a New Facility')).toBeInTheDocument();
  });


});

describe('Basic Form Interactions', () => {
  test('renders the main title and submit button', () => {
    render(<AddFacility />);
    expect(screen.getByRole('heading', { name: 'Add a New Facility' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument(); // Changed to 'Submit'
  });

  test('updates location and coordinates when a place is selected', async () => {
    const { useLoadScript } = require('@react-google-maps/api');
    useLoadScript.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    render(<AddFacility />);

    const mockPlace = {
      name: "Test Stadium",
      formatted_address: "123 Test St, Test City",
      geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } },
    };

    const locationInput = screen.getByPlaceholderText("Search facility location");

    // Simulate place selection
    act(() => {
      const autocompleteInstance = global.window.google.maps.places.Autocomplete.mock.results[0].value;
      autocompleteInstance.getPlace.mockReturnValue(mockPlace);
      const listenerCallback = autocompleteInstance.addListener.mock.calls[0][1];
      listenerCallback();
    });

    expect(locationInput).toHaveValue("123 Test St, Test City");
    expect(screen.getByText("Google Map Mock")).toBeInTheDocument();
  });

  test('rejects non-image files', () => {
    const { toast } = require('react-toastify');
    render(<AddFacility />);
    const fileInput = screen.getByLabelText('Upload Image/GIF');

    const invalidFile = new File(["dummy"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(toast.error).toHaveBeenCalledWith("Only JPG, PNG, or GIF images are allowed");
    expect(screen.queryByAltText("Facility preview")).not.toBeInTheDocument();
  });




  test('displays error when Google Maps fails to load', () => {
    const { useLoadScript } = require('@react-google-maps/api');
    useLoadScript.mockReturnValue({
      isLoaded: false,
      loadError: new Error("Failed to load Google Maps"),
    });

    render(<AddFacility />);
    expect(screen.getByText("Error loading maps")).toBeInTheDocument();
  });


});