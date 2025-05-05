import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Applications from '../components/Applications';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Mocks
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
}));

describe('Applications Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    auth.currentUser = { uid: 'test-user' }; // Default: user is logged in
    addDoc.mockResolvedValue({ id: 'application-1' }); // Default: successful submission
  });

  // Rendering Tests
  it('renders without crashing', () => {
    render(<Applications />);
    expect(screen.getByText('Want to be an Admin or Facility Staff member?')).toBeInTheDocument();
    expect(screen.getByText('Application Form')).toBeInTheDocument();
  });

  it('renders all form fields and submit button', () => {
    render(<Applications />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Facility')).toBeInTheDocument();
    expect(screen.getByLabelText('Position')).toBeInTheDocument();
    expect(screen.getByLabelText('Why should we choose you?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Application/i })).toBeInTheDocument();
  });

  it('displays validation error for name with invalid characters', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'John123' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name must contain only letters and spaces')).toBeInTheDocument();
    });
  });

  it('displays validation error for name shorter than 2 characters', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters long')).toBeInTheDocument();
    });
  });

  it('displays validation error for name longer than 50 characters', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const longName = 'A'.repeat(51);
    fireEvent.change(nameInput, { target: { value: longName } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name must not exceed 50 characters')).toBeInTheDocument();
    });
  });


  it('displays validation error for message shorter than 10 characters', async () => {
    render(<Applications />);
    const messageInput = screen.getByLabelText('Why should we choose you?');
    fireEvent.change(messageInput, { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Message must be at least 10 characters long')).toBeInTheDocument();
    });
  });

  it('displays validation error for message longer than 500 characters', async () => {
    render(<Applications />);
    const messageInput = screen.getByLabelText('Why should we choose you?');
    const longMessage = 'A'.repeat(501);
    fireEvent.change(messageInput, { target: { value: longMessage } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Message must not exceed 500 characters')).toBeInTheDocument();
    });
  });

  it('disables submit button when there are validation errors', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'A' } }); // Invalid: too short
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Application/i })).toBeDisabled();
    });
  });

  // User Interaction Tests
  it('updates form inputs correctly', () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const facilitySelect = screen.getByLabelText('Facility');
    const positionSelect = screen.getByLabelText('Position');
    const messageInput = screen.getByLabelText('Why should we choose you?');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    expect(nameInput).toHaveValue('John Doe');
    expect(facilitySelect).toHaveValue('Gym');
    expect(positionSelect).toHaveValue('Admin');
    expect(messageInput).toHaveValue('I am a great candidate!');
  });

  it('clears validation errors when inputs are corrected', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    
    // Trigger validation error
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters long')).toBeInTheDocument();
    });

    // Correct the input
    fireEvent.change(nameInput, { target: { value: 'John' } });
    await waitFor(() => {
      expect(screen.queryByText('Name must be at least 2 characters long')).not.toBeInTheDocument();
    });
  });



  it('allows submitting another application after success', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const facilitySelect = screen.getByLabelText('Facility');
    const positionSelect = screen.getByLabelText('Position');
    const messageInput = screen.getByLabelText('Why should we choose you?');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));

    await waitFor(() => {
      expect(screen.getByText('Your application has been submitted successfully!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Another Application/i }));

    expect(screen.getByText('Application Form')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('displays error when user is not logged in', async () => {
    auth.currentUser = null; // Simulate user not logged in
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const facilitySelect = screen.getByLabelText('Facility');
    const positionSelect = screen.getByLabelText('Position');
    const messageInput = screen.getByLabelText('Why should we choose you?');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to submit an application.')).toBeInTheDocument();
    });
  });
  //abc

  it('displays error when Firebase submission fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('Firebase error'));
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const facilitySelect = screen.getByLabelText('Facility');
    const positionSelect = screen.getByLabelText('Position');
    const messageInput = screen.getByLabelText('Why should we choose you?');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));

    await waitFor(() => {
      expect(screen.getByText('Firebase error')).toBeInTheDocument();
    });
  });

  it('displays loading state while submitting', async () => {
    render(<Applications />);
    const nameInput = screen.getByLabelText('Name');
    const facilitySelect = screen.getByLabelText('Facility');
    const positionSelect = screen.getByLabelText('Position');
    const messageInput = screen.getByLabelText('Why should we choose you?');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));

    expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();
  });
});