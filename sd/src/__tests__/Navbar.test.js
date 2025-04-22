import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock assets
jest.mock('./assets/logo1.png', () => 'mocked-logo.png');

// Mock Notifications component
jest.mock('../components/Notifications', () => () => <div>Notifications</div>);

describe('Navbar Component', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock auth state
      auth.onAuthStateChanged.mockImplementation((callback) => {
        callback(null); // No user initially
        return jest.fn(); // Unsubscribe function
      });
    });
  
    // Test 1: Renders navbar with logo and title
    test('renders navbar with logo and title', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      expect(screen.getByText('Sportify')).toBeInTheDocument();
      expect(screen.getByAltText('Community Sports Hub Logo')).toBeInTheDocument();
    });
    
    // Test 2: Shows login button when user is not authenticated
    test('shows login button when user is not authenticated', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      // Check desktop login button
      expect(screen.getByText('Login with Google', { selector: '.auth-btn' })).toBeInTheDocument();
      // Check mobile login button (after opening menu)
      fireEvent.click(screen.getByLabelText('Toggle mobile menu'));
      expect(screen.getByText('Login with Google', { selector: '.mobile-auth-btn' })).toBeInTheDocument();
    });
    
    // Test 3: Shows mobile menu button
    test('renders mobile menu button', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
    });
    
    // Test 4: Opens mobile menu when button is clicked
    test('opens mobile menu when button is clicked', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
      fireEvent.click(mobileMenuButton);
      
      // Verify mobile-specific elements appear
      expect(screen.getByText('Facilities', { selector: '.mobile-button-nav-link' })).toBeInTheDocument();
      expect(screen.getByText('Toggle Theme', { selector: '.mobile-theme-toggle' })).toBeInTheDocument();
    });
    
    // Test 5: Renders navigation links
    test('renders navigation links', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      // Check desktop navigation links
      expect(screen.getByText('Facilities', { selector: '.button-nav-link' })).toBeInTheDocument();
      expect(screen.getByText('Bookings', { selector: '.button-nav-link' })).toBeInTheDocument();
      expect(screen.getByText('Reports', { selector: '.button-nav-link' })).toBeInTheDocument();
      
      // Open mobile menu to check mobile links
      fireEvent.click(screen.getByLabelText('Toggle mobile menu'));
      expect(screen.getByText('Facilities', { selector: '.mobile-button-nav-link' })).toBeInTheDocument();
    });
    
    // Test 6: Toggles theme
    test('toggles theme when theme toggle button is clicked', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
    
      const themeToggleButton = screen.getByRole('button', { name: /toggle theme/i });
      fireEvent.click(themeToggleButton);
    
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    
      fireEvent.click(themeToggleButton);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
    
  });
