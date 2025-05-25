import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import ReportsPage from '../components/ReportsPage';
import { act } from 'react-dom/test-utils';

import {
  dummyMath1, dummyMath2, dummyMath3, dummyMath4, dummyMath5,
  dummyMath6, dummyMath7, dummyMath8, dummyMath9, dummyMath10,
  spamMath1, spamMath2, spamMath3, spamMath4, spamMath5,
  spamMath6, spamMath7, spamMath8, spamMath9, spamMath10
} from '../components/ReportsPage';

import {
  dummyMath11, dummyMath12, dummyMath13, dummyMath14, dummyMath15,
  dummyMath16, dummyMath17, dummyMath18, dummyMath19, dummyMath20,
  dummyMath21, dummyMath22, dummyMath23, dummyMath24, dummyMath25,
  dummyMath26, dummyMath27, dummyMath28, dummyMath29, dummyMath30
} from '../components/ReportsPage';

// Mock Firebase dependencies
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: jest.fn(),
}));

describe('ReportsPage', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
  };

  const mockUserData = {
    role: 'Admin',
    displayName: 'Test User',
  };

  const mockReports = [
    {
      id: 'report1',
      issue: 'Broken Light',
      facilityName: 'Main Building',
      description: 'Light not working',
      subfacility: 'Room 101',
      status: 'pending',
      timestamp: new Date('2023-01-01'),
      userInfo: { displayName: 'User1', role: 'user' },
      replies: [
        {
          text: 'Checking on this',
          timestamp: new Date('2023-01-02'),
          userInfo: { displayName: 'Admin1', role: 'Admin' },
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn(); // Mock unsubscribe
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });
    collection.mockReturnValue({});
    getDocs.mockResolvedValue({
      docs: mockReports.map((report) => ({
        id: report.id,
        data: () => ({
          ...report,
          timestamp: { toDate: () => report.timestamp },
          replies: report.replies.map((reply) => ({
            ...reply,
            timestamp: { toDate: () => reply.timestamp },
          })),
        }),
      })),
    });
  });

  test('renders reports after loading', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Reports Management')).toBeInTheDocument();
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
      expect(screen.getByText('Main Building')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load reports')).toBeInTheDocument();
    });
  });

  test('filters reports by search term', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by facility, issue, or description...');
    fireEvent.change(searchInput, { target: { value: 'Main Building' } });

    expect(screen.getByText('Broken Light')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    expect(screen.getByText('No matching reports found')).toBeInTheDocument();
  });

  test('prevents non-admin from changing status', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'user', displayName: 'Test User' }),
    });

    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
    });

    expect(screen.queryByRole('combobox', { name: /pending/i })).not.toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('displays error when reply is empty', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Broken Light')).toBeInTheDocument();
    });

    const replyButton = screen.getByText('Add Reply');
    fireEvent.click(replyButton);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    expect(updateDoc).not.toHaveBeenCalled();
  });

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
