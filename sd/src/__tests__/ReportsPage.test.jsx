import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import ReportsPage from '../components/ReportsPage';
import { act } from 'react-dom/test-utils';

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