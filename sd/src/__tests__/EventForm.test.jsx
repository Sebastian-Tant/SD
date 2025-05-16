// EventForm.test.jsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateEventPage from '../components/EventForm'; // Adjust path if needed
import { collection, getDocs, addDoc, Timestamp, updateDoc, arrayUnion, doc } from 'firebase/firestore';

// --- Mock Firebase --- trying to fix

// Keep track of mock functions to reset them
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockArrayUnion = jest.fn((...args) => ({ __mock_array_union__: args })); // Return identifiable mock object
const mockDoc = jest.fn((db, collectionName, docId) => ({ // Return identifiable mock object
  __mock_doc_ref__: { db, collectionName, docId }
}));
const mockTimestampNow = jest.fn(() => ({
  toDate: () => new Date(), // Mock Timestamp.now() behaviour
  toString: () => 'MockTimestamp',
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => `mockCollection(${path})`), // Simple string representation
  getDocs: (query) => mockGetDocs(query), // Use the tracked mock function
  addDoc: (ref, data) => mockAddDoc(ref, data), // Use the tracked mock function
  Timestamp: {
    now: () => mockTimestampNow(), // Use the tracked mock function
  },
  updateDoc: (ref, data) => mockUpdateDoc(ref, data), // Use the tracked mock function
  arrayUnion: (...args) => mockArrayUnion(...args), // Use the tracked mock function
  doc: (db, collectionName, docId) => mockDoc(db, collectionName, docId), // Use the tracked mock function
}));

// Mock the db export from firebase.js
jest.mock('../firebase', () => ({ // Adjust path if needed
  db: 'mockDb', // Just needs to be a defined value
}));

// Mock window.alert
global.alert = jest.fn();

// --- Test Suite ---
describe('CreateEventPage (EventForm)', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockGetDocs.mockClear();
    mockAddDoc.mockClear();
    mockUpdateDoc.mockClear();
    mockArrayUnion.mockClear();
    mockDoc.mockClear();
    mockTimestampNow.mockClear();
    global.alert.mockClear();

    // Default Mocks (can be overridden in specific tests)
    mockGetDocs.mockImplementation(async (query) => {
      // Facilities query
      if (query === 'mockCollection(facilities)') {
        return {
          docs: [
            { id: 'fac1', data: () => ({ name: 'Facility A', location: 'Location A' }) },
            { id: 'fac2', data: () => ({ name: 'Facility B', location: 'Location B' }) },
          ]
        };
      }
      // Subfacilities query (Assume Facility A is selected)
      if (query.includes('mockCollection(facilities/fac1/subfacilities')) {
        return {
          docs: [
            { id: 'sub1', data: () => ({ name: 'Subfacility A1' }) },
            { id: 'sub2', data: () => ({ name: 'Subfacility A2' }) },
          ]
        };
      }
      // Subfacilities query (Assume Facility B is selected - returns empty)
      if (query.includes('mockCollection(facilities/fac2/subfacilities')) {
        return { docs: [] };
      }
      // Events query (Default to no conflicts)
      if (query === 'mockCollection(events)') {
        return { docs: [] };
      }
      // Users query (Default to one user for notification)
      if (query === 'mockCollection(users)') {
        return { docs: [{ id: 'user1', data: () => ({ name: 'Test User' }) }] };
      }
      // Default fallback
      return { docs: [] };
    });
    mockAddDoc.mockResolvedValue({ id: 'newEvent123' }); // Mock successful addDoc
    mockUpdateDoc.mockResolvedValue(undefined); // Mock successful updateDoc
  });

  test('loads and displays facilities on mount', async () => {
    render(<CreateEventPage />);

    // Wait for the options to appear based on the mocked getDocs
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Facility A' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Facility B' })).toBeInTheDocument();
    });

    // Check if getDocs was called correctly for facilities
    expect(mockGetDocs).toHaveBeenCalledWith('mockCollection(facilities)');
  });



  test('handles error when fetching facilities fails', async () => {
    // Override mockGetDocs to simulate error
    mockGetDocs.mockRejectedValueOnce(new Error('Fetch failed'));

    render(<CreateEventPage />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch facilities/i)).toBeInTheDocument();
    });
  });

  
});