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
    jest.clearAllMocks();
    auth.currentUser = { uid: 'test-user' };
    addDoc.mockResolvedValue({ id: 'application-1' });
  });

  // Initial State Coverage
  it('renders with initial form state', () => {
    render(<Applications />);
    // These assertions should ensure lines 40-41 and 47-48 are covered
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Facility')).toHaveValue('');
    expect(screen.getByLabelText('Position')).toHaveValue('');
    expect(screen.getByLabelText('Why should we choose you?')).toHaveValue('');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a facility')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a position')).not.toBeInTheDocument();
    expect(screen.queryByText('Message must be at least 10 characters long')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Application/i })).not.toBeDisabled();
    expect(screen.queryByText('Firebase error')).not.toBeInTheDocument();
    expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
  });

  // validateForm Function Coverage
  it('validates all form fields on submit and shows errors', async () => {
    render(<Applications />);
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Please select a facility')).toBeInTheDocument();
      expect(screen.getByText('Please select a position')).toBeInTheDocument();
      expect(screen.queryByText('Message must be at least 10 characters long')).not.toBeInTheDocument(); // Message is optional and empty is valid
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Facility'), { target: { value: 'Invalid' } });
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Wrong' } });
    fireEvent.change(screen.getByLabelText('Why should we choose you?'), { target: { value: 'Short' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters long')).toBeInTheDocument();
      expect(screen.getByText('Invalid facility selected')).toBeInTheDocument();
      expect(screen.getByText('Invalid position selected')).toBeInTheDocument();
      expect(screen.getByText('Message must be at least 10 characters long')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Valid Name' } });
    fireEvent.change(screen.getByLabelText('Facility'), { target: { value: 'Gym' } });
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('Why should we choose you?'), { target: { value: 'This is a valid message' } });
    await waitFor(() => {
      expect(screen.queryByText('Name must be at least 2 characters long')).not.toBeInTheDocument();
      expect(screen.queryByText('Invalid facility selected')).not.toBeInTheDocument();
      expect(screen.queryByText('Invalid position selected')).not.toBeInTheDocument();
      expect(screen.queryByText('Message must be at least 10 characters long')).not.toBeInTheDocument();
    });
  });

  it('scrolls to top on mount', () => {
    const mockScrollTo = jest.fn();
    global.scrollTo = mockScrollTo;
    render(<Applications />);
    expect(mockScrollTo).toHaveBeenCalledWith(0, 0);
  });

  // Existing tests - keeping them for completeness
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
    const submitButton = screen.getByRole('button', { name: /Submit Application/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(facilitySelect, { target: { value: 'Gym' } });
    fireEvent.change(positionSelect, { target: { value: 'Admin' } });
    fireEvent.change(messageInput, { target: { value: 'I am a great candidate!' } });

    fireEvent.click(submitButton);
    expect(submitButton).toHaveTextContent('Submitting...');
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });
});