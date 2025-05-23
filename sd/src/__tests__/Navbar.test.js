import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { auth, provider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
  },
  provider: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn().mockResolvedValue({ user: { uid: 'user123', displayName: 'Test User' } }),
  signOut: jest.fn().mockResolvedValue(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn().mockResolvedValue(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  onSnapshot: jest.fn().mockImplementation(() => jest.fn()), // Disable real-time updates
}));

// Mock assets and components
jest.mock('../components/Navbar/assets/logo1.png', () => 'mocked-logo.png');
jest.mock('../components/Notifications', () => () => <div>Notifications</div>);

// Setup and cleanup
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  Storage.prototype.setItem = jest.fn();
  Storage.prototype.getItem = jest.fn(() => 'dark');
  jest.spyOn(document, 'addEventListener').mockImplementation(() => {});
  jest.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  document.documentElement.setAttribute('data-theme', 'dark');
  auth.onAuthStateChanged.mockImplementation((callback) => {
    callback(null); // Start with no user
    return jest.fn(); // Unsubscribe
  });
});

afterEach(() => {
  jest.clearAllTimers(); // Clear any setTimeout/setInterval
});

describe('Navbar Component', () => {
  // Test 1: Initial Render
  test('renders navbar with logo and title', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('Sportify')).toBeInTheDocument();
    expect(screen.getByAltText('Community Sports Hub Logo')).toBeInTheDocument();
    expect(screen.getByText('Login with Google', { selector: '.auth-btn' })).toBeInTheDocument();
  });

  // Test 2: Theme Toggle
  test('toggles theme and persists to localStorage', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(themeToggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    fireEvent.click(themeToggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  // Test 3: Auth State - No User
  test('renders login button when not authenticated', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('Login with Google', { selector: '.auth-btn' })).toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  // Test 4: Google Sign-In Success (Simplified)
  test('handles successful Google sign-in', async () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Login with Google', { selector: '.auth-btn' }));
    });
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  // Test 5: Sign-Out Success
  test('handles sign-out successfully', async () => {
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback({ uid: 'user123', displayName: 'Test User' });
      return jest.fn();
    });
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out', { selector: '.auth-btn' }));
    });
    expect(screen.getByText('Login with Google', { selector: '.auth-btn' })).toBeInTheDocument();
  });

  // Test 6: Mobile Menu Toggle
  test('toggles mobile menu', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton);
    expect(screen.getByText('Facilities', { selector: '.mobile-button-nav-link' })).toBeInTheDocument();
    fireEvent.click(mobileMenuButton);
    expect(screen.queryByText('Facilities', { selector: '.mobile-button-nav-link' })).not.toBeVisible();
  });
});