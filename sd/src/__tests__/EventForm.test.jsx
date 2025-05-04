import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventForm from '../components/EventForm'; 
import { collection, getDocs, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

// Mock Firebase functions
jest.mock('firebase/firestore');
jest.mock('../firebase');

const mockFacilities = [
  { id: 'fac1', name: 'Facility 1', location: 'Location 1' },
  { id: 'fac2', name: 'Facility 2', location: 'Location 2' }
];

const mockSubfacilities = [
  { id: 'sub1', name: 'Subfacility 1' },
  { id: 'sub2', name: 'Subfacility 2' }
];

const mockEvents = [
  {
    id: 'event1',
    title: 'Existing Event',
    facilityId: 'fac1',
    start: '2023-01-01T10:00:00',
    end: '2023-01-01T12:00:00'
  }
];

describe('EventForm', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock getDocs for facilities
    getDocs.mockImplementation((query) => {
      if (query.path.includes('facilities') && !query.path.includes('subfacilities')) {
        return Promise.resolve({
          docs: mockFacilities.map(fac => ({
            id: fac.id,
            data: () => ({ ...fac })
          }))
        });
      }
      if (query.path.includes('subfacilities')) {
        return Promise.resolve({
          docs: mockSubfacilities.map(sub => ({
            id: sub.id,
            data: () => ({ ...sub })
          }))
        });
      }
      if (query.path.includes('events')) {
        return Promise.resolve({
          docs: mockEvents.map(evt => ({
            id: evt.id,
            data: () => ({ ...evt })
          }))
        });
      }
      return Promise.resolve({ docs: [] });
    });

    // Mock addDoc for events
    addDoc.mockResolvedValue({ id: 'newEvent' });

    // Mock updateDoc for notifications
    updateDoc.mockResolvedValue({});
  });

  test('renders the form correctly', async () => {
    render(<EventForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Facility-Blocking Event')).toBeInTheDocument();
      expect(screen.getByLabelText('Title:')).toBeInTheDocument();
      expect(screen.getByLabelText('Facility:')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Time:')).toBeInTheDocument();
      expect(screen.getByLabelText('End Time:')).toBeInTheDocument();
    });
  });

  test('loads facilities on mount', async () => {
    render(<EventForm />);
    
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith(collection(db, 'facilities'));
      expect(screen.getAllByRole('option').length).toBe(mockFacilities.length + 1); // +1 for default option
    });
  });

  test('loads subfacilities when facility is selected', async () => {
    render(<EventForm />);
    
    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith(collection(db, 'facilities', 'fac1', 'subfacilities'));
      expect(screen.getByText('Subfacility:')).toBeInTheDocument();
    });
  });

  test('shows facility location when facility is selected', async () => {
    render(<EventForm />);
    
    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    expect(screen.getByText('Location: Location 1')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<EventForm />);
    
    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
    });
  });

  test('validates end time is after start time', async () => {
    render(<EventForm />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Start Time:'), { target: { value: '2023-01-01T12:00' } });
    fireEvent.change(screen.getByLabelText('End Time:'), { target: { value: '2023-01-01T10:00' } });

    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(screen.getByText('End time must be after start time.')).toBeInTheDocument();
    });
  });

  test('detects time conflicts for facility', async () => {
    render(<EventForm />);
    
    // Fill in form with conflicting times
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Start Time:'), { target: { value: '2023-01-01T11:00' } });
    fireEvent.change(screen.getByLabelText('End Time:'), { target: { value: '2023-01-01T13:00' } });

    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(screen.getByText('Time slot conflicts with an existing event.')).toBeInTheDocument();
    });
  });

  test('successfully submits valid event', async () => {
    render(<EventForm />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Start Time:'), { target: { value: '2023-01-02T10:00' } });
    fireEvent.change(screen.getByLabelText('End Time:'), { target: { value: '2023-01-02T12:00' } });

    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(collection(db, 'events'), {
        title: 'Test Event',
        facilityId: 'fac1',
        subfacilityId: null,
        start: '2023-01-02T10:00',
        end: '2023-01-02T12:00',
        address: 'Location 1',
        createdAt: expect.any(Object)
      });
    });
  });

  test('sends notifications when event is created', async () => {
    render(<EventForm />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Start Time:'), { target: { value: '2023-01-02T10:00' } });
    fireEvent.change(screen.getByLabelText('End Time:'), { target: { value: '2023-01-02T12:00' } });

    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith(collection(db, 'users'));
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  test('handles errors when fetching facilities', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch'));
    
    render(<EventForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch facilities.')).toBeInTheDocument();
    });
  });

  test('resets form after successful submission', async () => {
    render(<EventForm />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Start Time:'), { target: { value: '2023-01-02T10:00' } });
    fireEvent.change(screen.getByLabelText('End Time:'), { target: { value: '2023-01-02T12:00' } });

    await waitFor(() => {
      const facilitySelect = screen.getByLabelText('Facility:');
      fireEvent.change(facilitySelect, { target: { value: 'fac1' } });
    });

    fireEvent.click(screen.getByText('Create Event'));

    await waitFor(() => {
      expect(screen.getByLabelText('Title:').value).toBe('');
      expect(screen.getByLabelText('Start Time:').value).toBe('');
      expect(screen.getByLabelText('End Time:').value).toBe('');
      expect(screen.getByLabelText('Facility:').value).toBe('');
    });
  });
});