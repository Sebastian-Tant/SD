// src/__tests__/Navbar.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils'; // Import act

// Mock the entire firebase module BEFORE importing anything from it
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  },
  db: {}, // Mock db if you use it, or specifically doc, getDoc, onSnapshot
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  provider: {}, // Mock provider if needed
}));

// Now import the mocked firebase functions
import { auth, db, doc, getDoc, onSnapshot } from '../firebase';

// Mock the useNavigate hook (keep this as it was)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, className, onClick }) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
}));

// Clear mocks before each test to ensure isolation
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('theme', 'dark');
  // Reset specific mocks to their initial jest.fn() state if needed for fresh tests
  auth.onAuthStateChanged.mockClear();
  auth.signInWithPopup.mockClear();
  auth.signOut.mockClear();
  getDoc.mockClear();
  onSnapshot.mockClear();
  doc.mockClear();
  mockNavigate.mockClear(); // Clear the navigate mock too
});

// Helper function to render Navbar within MemoryRouter
const renderNavbar = async (initialEntries = ['/']) => {
  let rendered;
  await act(async () => { // Use async act for initial render
    rendered = render(
      <MemoryRouter initialEntries={initialEntries}>
        <Navbar />
      </MemoryRouter>
    );
  });
  return rendered;
};


describe('Navbar Component - Initial Render and Theme Toggle', () => {
  test('toggles theme from dark to light and back', async () => { // Make test async
    // Ensure onAuthStateChanged is mocked for initial render
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null); // No user logged in initially
      return jest.fn();
    });

    await renderNavbar(); // Await the render

    // Initial theme check (should be dark by default)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByLabelText(/Toggle theme/i).querySelector('.fa-moon')).toBeInTheDocument();

    // Toggle to light theme
    fireEvent.click(screen.getByLabelText(/Toggle theme/i));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByLabelText(/Toggle theme/i).querySelector('.fa-sun')).toBeInTheDocument();

    // Toggle back to dark theme
    fireEvent.click(screen.getByLabelText(/Toggle theme/i));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByLabelText(/Toggle theme/i).querySelector('.fa-moon')).toBeInTheDocument();
  });
});



describe('Navbar Component - User Authentication (Logged In - Resident)', () => {
  const mockResidentUser = {
    uid: 'user123',
    displayName: 'Test Resident',
    email: 'resident@example.com',
    photoURL: 'resident.jpg',
    role: 'Resident',
  };

  
 
});

describe('Navbar Component - User Authentication (Logged In - Admin)', () => {
  const mockAdminUser = {
    uid: 'admin123',
    displayName: 'Admin User',
    email: 'admin@example.com',
    photoURL: 'admin.jpg',
    role: 'Admin',
  };

  
});