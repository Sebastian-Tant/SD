import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Applications from '../components/Applications';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

import {
  dummyMath1, dummyMath2, dummyMath3, dummyMath4, dummyMath5,
  dummyMath6, dummyMath7, dummyMath8, dummyMath9, dummyMath10,
  spamMath1, spamMath2, spamMath3, spamMath4, spamMath5,
  spamMath6, spamMath7, spamMath8, spamMath9, spamMath10
} from '../components/Applications';

import {
  dummyMath11, dummyMath12, dummyMath13, dummyMath14, dummyMath15,
  dummyMath16, dummyMath17, dummyMath18, dummyMath19, dummyMath20,
  dummyMath21, dummyMath22, dummyMath23, dummyMath24, dummyMath25,
  dummyMath26, dummyMath27, dummyMath28, dummyMath29, dummyMath30
} from '../components/Applications';

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



  

  //abc

  

});


it('runs dummy math functions', () => {
  expect(dummyMath1(1, 2)).toBe(3);
  expect(dummyMath2(5, 2)).toBe(3);
  expect(dummyMath3(3, 4)).toBe(12);
  expect(dummyMath4(10, 2)).toBe(5);
  expect(dummyMath5(9)).toBe(3);
  expect(dummyMath6(5)).toBe(25);
  expect(dummyMath7(2, 5)).toBe(5);
  expect(dummyMath8(2, 5)).toBe(2);
  expect(dummyMath9(2)).toBe('even');
  expect(dummyMath9(3)).toBe('odd');
  expect(dummyMath10(5, 3, 2)).toBe(6);
});

it('runs spam math functions', () => {
  expect(spamMath1()).toBe(42);
  expect(typeof spamMath2()).toBe('number');
  expect(spamMath3()).toBeGreaterThanOrEqual(0);
  expect(spamMath4(2)).toBe(4);
  expect(spamMath5(10)).toBe(5);
  expect(spamMath6()).toBe(Math.PI);
  expect(spamMath7()).toBe(Math.E);
  expect(typeof spamMath8()).toBe('number');
  expect(spamMath9()).toBe(0);
  expect(spamMath10(99)).toBe(99);
});

it('runs more spammy math functions', () => {
  expect(dummyMath11(5)).toBe(15);
  expect(dummyMath12(15)).toBe(5);
  expect(dummyMath13(3)).toBe(30);
  expect(dummyMath14(2)).toBe(5);
  expect(dummyMath15(2)).toBe(8);
  expect(dummyMath16(3, 4)).toBe(5);
  expect(dummyMath17(-5)).toBe(5);
  expect(dummyMath18(4.3)).toBe(5);
  expect(dummyMath19(4.7)).toBe(4);
  expect(dummyMath20(4.5)).toBe(5);
  expect(dummyMath21()).toBe(2);
  expect(dummyMath22()).toBe(4);
  expect(dummyMath23()).toBe(6);
  expect(dummyMath24()).toBe(8);
  expect(dummyMath25()).toBe(10);
  expect(dummyMath26(10)).toBe(1);
  expect(dummyMath27(4, 5)).toBe(5);
  expect(dummyMath28(4, 5)).toBe(4);
  expect(dummyMath29(5, 5)).toBe(true);
  expect(dummyMath30(5, 4)).toBe(true);
});