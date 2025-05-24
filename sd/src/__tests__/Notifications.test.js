import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Notifications from '../components/Notifications';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Mock Firebase modules
jest.mock('../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid'
    }
  },
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn()
}));

describe('Notifications Component', () => {
  const mockNotifications = [
    {
      id: '1',
      message: 'Test notification 1',
      createdAt: Date.now() - 10000,
      read: false
    },
    {
      id: '2',
      message: 'Test notification 2',
      createdAt: Date.now(),
      read: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    getDoc.mockImplementation(() => new Promise(() => {}));
    
    render(<Notifications />);
    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

 
  test('fetches and displays notifications', async () => {
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({ notifications: mockNotifications })
    };
    getDoc.mockResolvedValue(mockDocSnap);
    
    await act(async () => {
      render(<Notifications />);
    });
    
    expect(screen.getByText('Test notification 1')).toBeInTheDocument();
    expect(screen.getByText('Test notification 2')).toBeInTheDocument();
    // Instead of checking for listitem role, check for notification classes
    expect(screen.getAllByText(/Test notification/).length).toBe(2);
  });

  test('sorts notifications by createdAt in descending order', async () => {
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({ notifications: mockNotifications })
    };
    getDoc.mockResolvedValue(mockDocSnap);
    
    await act(async () => {
      render(<Notifications />);
    });
    
    const notifications = screen.getAllByText(/Test notification/);
    // Check order by looking at the text content
    const notificationTexts = notifications.map(n => n.textContent);
    expect(notificationTexts).toEqual(['Test notification 2', 'Test notification 1']);
  });

  test('marks notification as read when clicked', async () => {
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({ notifications: mockNotifications })
    };
    getDoc.mockResolvedValue(mockDocSnap);
    updateDoc.mockResolvedValue();
    
    await act(async () => {
      render(<Notifications />);
    });
    
    // Find the notification container div (the one with class 'notification')
    const unreadNotification = screen.getByText('Test notification 1').closest('.notification');
    await act(async () => {
      fireEvent.click(unreadNotification);
    });
    
    expect(updateDoc).toHaveBeenCalled();
    expect(unreadNotification).toHaveClass('read');
  });

  test('handles error when fetching notifications', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getDoc.mockRejectedValue(new Error('Fetch error'));
    
    await act(async () => {
      render(<Notifications />);
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching notifications:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('handles error when marking as read', async () => {
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({ notifications: mockNotifications })
    };
    getDoc.mockResolvedValue(mockDocSnap);
    updateDoc.mockRejectedValue(new Error('Update error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<Notifications />);
    });
    
    const unreadNotification = screen.getByText('Test notification 1').closest('.notification');
    await act(async () => {
      fireEvent.click(unreadNotification);
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Error updating notification:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('does nothing when no user is logged in', async () => {
    auth.currentUser = null;
    
    await act(async () => {
      render(<Notifications />);
    });
    
    expect(getDoc).not.toHaveBeenCalled();
  });
});