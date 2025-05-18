import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CreateEventPage from '../components/EventForm';
import '@testing-library/jest-dom';

// Complete Firebase mock with realistic responses
jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    collection: jest.fn((db, path) => ({ 
      path,
      withConverter: jest.fn()
    })),
    getDocs: jest.fn((query) => {
      if (query.path === 'facilities') {
        return Promise.resolve({
          docs: [
            { 
              id: 'fac1', 
              data: () => ({ 
                name: 'Test Facility', 
                location: 'Test Location',
                subfacilities: ['sub1', 'sub2']
              }) 
            }
          ]
        });
      }
      if (query.path.includes('subfacilities')) {
        return Promise.resolve({
          docs: [
            { id: 'sub1', data: () => ({ name: 'Subfacility 1' }) },
            { id: 'sub2', data: () => ({ name: 'Subfacility 2' }) }
          ]
        });
      }
      if (query.path === 'events') {
        return Promise.resolve({
          docs: [
            { 
              id: 'event1', 
              data: () => ({ 
                title: 'Existing Event',
                facilityId: 'fac1',
                start: '2023-01-01T10:00',
                end: '2023-01-01T12:00'
              }) 
            }
          ]
        });
      }
      if (query.path === 'users') {
        return Promise.resolve({
          docs: [
            { id: 'user1', data: () => ({ notifications: [] }) },
            { id: 'user2', data: () => ({ notifications: [] }) }
          ]
        });
      }
      return Promise.resolve({ docs: [] });
    }),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-event-id' })),
    doc: jest.fn((db, path, id) => ({ path, id })),
    updateDoc: jest.fn(() => Promise.resolve()),
    Timestamp: {
      now: jest.fn(() => ({
        toDate: () => new Date(),
        toMillis: () => 1672531200000
      }))
    },
    arrayUnion: jest.fn((item) => [item])
  };
});

jest.mock('firebase/storage', () => ({
  ref: jest.fn((storage, path) => ({ path })),
  uploadBytes: jest.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://mock-image-url.com'))
}));

jest.mock('../firebase', () => ({
  db: { mock: true },
  storage: { mock: true }
}));

describe('CreateEventPage - Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('full component lifecycle', async () => {
    // 1. Initial render and data loading
    render(<CreateEventPage />);
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });

    // 2. Test facility selection and subfacility loading
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Facility:'), { 
        target: { value: 'fac1' } 
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Subfacility 1')).toBeInTheDocument();
    });

    // 3. Test form filling and validation
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Title:'), { 
        target: { value: 'Test Event' } 
      });
      fireEvent.change(screen.getByLabelText('Start Time:'), { 
        target: { value: '2023-01-01T13:00' } 
      });
      fireEvent.change(screen.getByLabelText('End Time:'), { 
        target: { value: '2023-01-01T15:00' } 
      });
    });

    // 4. Test image upload
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(
        screen.getByLabelText('Add Image (Optional):').nextSibling,
        { target: { files: [file] } }
      );
      fireEvent.click(screen.getByText('Add Image'));
    });

    await waitFor(() => {
      expect(screen.getByAltText('Event preview')).toBeInTheDocument();
    });

    // 5. Test form submission
    await act(async () => {
      fireEvent.click(screen.getByText('Create Event'));
    });

    await waitFor(() => {
      expect(require('firebase/firestore').addDoc).toHaveBeenCalled();
    });

    // 6. Test subfacility selection path
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Subfacility:'), {
        target: { value: 'sub1' }
      });
      fireEvent.click(screen.getByText('Create Event'));
    });

    // 7. Test error paths
    jest.spyOn(require('firebase/firestore'), 'getDocs')
      .mockRejectedValueOnce(new Error('Fetch error'));
      
    jest.spyOn(require('firebase/storage'), 'uploadBytes')
      .mockRejectedValueOnce(new Error('Upload error'));

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Title:'), {
        target: { value: 'Error Test' }
      });
      fireEvent.click(screen.getByText('Create Event'));
    });
  });

  test('time validation errors', async () => {
    render(<CreateEventPage />);
    
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Title:'), {
        target: { value: 'Invalid Time Test' }
      });
      fireEvent.change(screen.getByLabelText('Start Time:'), {
        target: { value: '2023-01-01T12:00' }
      });
      fireEvent.change(screen.getByLabelText('End Time:'), {
        target: { value: '2023-01-01T10:00' } // Invalid time
      });
      fireEvent.click(screen.getByText('Create Event'));
    });

    await waitFor(() => {
      expect(screen.getByText(/End time must be after start time/i)).toBeInTheDocument();
    });
  });

  test('empty form validation', async () => {
    render(<CreateEventPage />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Create Event'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    });
  });

  test('image validation errors', async () => {
    render(<CreateEventPage />);
    
    // Test invalid file type
    await act(async () => {
      const invalidFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(
        screen.getByLabelText('Add Image (Optional):').nextSibling,
        { target: { files: [invalidFile] } }
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Only JPG, PNG, or GIF images are allowed/i)).toBeInTheDocument();
    });

    // Test file size
    await act(async () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.png', { 
        type: 'image/png' 
      });
      fireEvent.change(
        screen.getByLabelText('Add Image (Optional):').nextSibling,
        { target: { files: [largeFile] } }
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Image must be smaller than 5MB/i)).toBeInTheDocument();
    });
  });
});