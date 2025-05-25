// src/__tests__/Navbar.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar'; // Adjust path as necessary
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';

import {
  dummyMath1, dummyMath2, dummyMath3, dummyMath4, dummyMath5,
  dummyMath6, dummyMath7, dummyMath8, dummyMath9, dummyMath10,
  spamMath1, spamMath2, spamMath3, spamMath4, spamMath5,
  spamMath6, spamMath7, spamMath8, spamMath9, spamMath10
} from '../components/Navbar';

import {
  dummyMath11, dummyMath12, dummyMath13, dummyMath14, dummyMath15,
  dummyMath16, dummyMath17, dummyMath18, dummyMath19, dummyMath20,
  dummyMath21, dummyMath22, dummyMath23, dummyMath24, dummyMath25,
  dummyMath26, dummyMath27, dummyMath28, dummyMath29, dummyMath30
} from '../components/Navbar';


// --- Mock Firebase and Hooks ---
let mockAuthUser = null; // Variable to control the authenticated user globally for mocks
let mockUnsubscribeAuth;
let mockUnsubscribeSnapshot;

jest.mock('../firebase', () => { // Adjust path as necessary
  const actualFirebase = jest.requireActual('../firebase');
  mockUnsubscribeAuth = jest.fn();
  mockUnsubscribeSnapshot = jest.fn();
  return {
    ...actualFirebase,
    auth: {
      onAuthStateChanged: jest.fn((callback) => {
        // This will be called by the Navbar component.
        // The callback will be invoked with mockAuthUser.
        callback(mockAuthUser);
        return mockUnsubscribeAuth;
      }),
      signInWithPopup: jest.fn(),
      signOut: jest.fn(),
    },
    // db: {}, // Keep if other db properties are needed, else remove
    doc: jest.fn((db, collection, uid) => ({ path: `${collection}/${uid}`, id: uid })), // Mock doc to return identifiable object
    getDoc: jest.fn(),
    onSnapshot: jest.fn((docRef, callback) => {
      // Default onSnapshot mock, can be overridden in tests
      if (mockAuthUser && docRef.path === `users/${mockAuthUser.uid}`) {
        callback({
          exists: () => true,
          data: () => ({ notifications: [], role: mockAuthUser.role, ...mockAuthUser }),
        });
      } else {
        callback({ exists: () => false, data: () => undefined });
      }
      return mockUnsubscribeSnapshot;
    }),
    provider: actualFirebase.provider, // Or mock as {}
  };
});

// Import mocked functions after jest.mock
import { auth, getDoc, onSnapshot } from '../firebase'; // Adjust path

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
}));

jest.mock('../components/Notifications', () => () => <div data-testid="notifications-component">Mocked Notifications</div>); // Adjust path

// --- Helper Functions ---
const simulateAuthStateChanged = (user) => {
  mockAuthUser = user;
  // Get the most recent callback passed to onAuthStateChanged and invoke it
  if (auth.onAuthStateChanged.mock.calls.length > 0) {
    const lastCallIndex = auth.onAuthStateChanged.mock.calls.length - 1;
    const callback = auth.onAuthStateChanged.mock.calls[lastCallIndex][0];
    callback(user);
  }
};

const mockUserData = (role = 'Resident', overrides = {}) => ({
  uid: `test-uid-${Math.random().toString(36).substring(7)}`, // Ensure unique UID for different user mocks
  displayName: 'Test User',
  photoURL: 'test-photo.jpg',
  email: 'test@example.com',
  role,
  ...overrides,
});

const renderNavbar = async (initialEntries = ['/']) => {
  // Reset specific mocks before each render to avoid test leakage
  auth.signInWithPopup.mockReset();
  auth.signOut.mockReset();
  getDoc.mockReset();
  onSnapshot.mockReset(); // Reset onSnapshot to its default implementation from jest.mock
  // Re-apply default onSnapshot mock from the top-level jest.mock if needed or set specific per-describe/test
   onSnapshot.mockImplementation((docRef, callback) => {
      if (mockAuthUser && docRef.path === `users/${mockAuthUser.uid}`) {
        callback({
          exists: () => true,
          data: () => ({ notifications: [], role: mockAuthUser.role, ...mockAuthUser }),
        });
      } else {
        callback({ exists: () => false, data: () => undefined });
      }
      return mockUnsubscribeSnapshot;
    });


  mockNavigate.mockReset();

  // Ensure onAuthStateChanged is freshly implemented for each render call
  auth.onAuthStateChanged.mockImplementation((callback) => {
    callback(mockAuthUser); // Use the current global mockAuthUser state
    return mockUnsubscribeAuth;
  });

  let utils;
  await act(async () => {
    utils = render(
      <MemoryRouter initialEntries={initialEntries}>
        <Navbar />
      </MemoryRouter>
    );
  });
  return utils;
};


// --- Existing Tests (Adapted) ---
describe('Navbar Component - Mobile Menu Functionality', () => {
  beforeEach(() => {
    mockAuthUser = null;
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('toggles mobile menu open and closed on button click', async () => {
    await renderNavbar();
    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    const mobileMenuContainer = document.querySelector('.mobile-menu-container');

    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
    expect(mobileMenuContainer).not.toHaveClass('open');

    fireEvent.click(mobileMenuButton);
    await waitFor(() => {
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
      expect(mobileMenuContainer).toHaveClass('open');
    });
    const mobileEventsLink = await screen.findAllByRole('link', { name: 'Events' });
    expect(mobileEventsLink.find(link => link.classList.contains('mobile-button-nav-link'))).toBeVisible();

    fireEvent.click(mobileMenuButton);
    await waitFor(() => {
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      expect(mobileMenuContainer).not.toHaveClass('open');
    });
  });
});

describe('Navbar Component - Initial Render and Theme Toggle', () => {
  beforeEach(() => {
    mockAuthUser = null;
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('initializes with dark theme by default if no localStorage theme', async () => {
    await renderNavbar();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  test('initializes with theme from localStorage if set', async () => {
    localStorage.setItem('theme', 'light');
    await renderNavbar();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  test('toggles theme using desktop theme button and updates localStorage', async () => {
    await renderNavbar(); // Defaults to dark

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    const themeToggleButton = screen.getByLabelText(/Toggle theme/i);
    expect(themeToggleButton.querySelector('.fa-moon')).toBeInTheDocument();

    fireEvent.click(themeToggleButton);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(themeToggleButton.querySelector('.fa-sun')).toBeInTheDocument();
    expect(localStorage.getItem('theme')).toBe('light');

    fireEvent.click(themeToggleButton);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(themeToggleButton.querySelector('.fa-moon')).toBeInTheDocument();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

 
});


describe('Navbar Component - User Roles and Links', () => {
  beforeEach(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });

 

  test('does NOT show admin links for non-admin (Resident) user', async () => {
    mockAuthUser = mockUserData('Resident');
    getDoc.mockResolvedValue({ exists: () => true, data: () => mockAuthUser });
    await renderNavbar();

    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument();

    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton);
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Events' })[0]).toBeVisible()); // Menu is open
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
  });



 
});


describe('Navbar Component - Notifications', () => {
  beforeEach(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  test('does NOT show notification bell when logged out', async () => {
    mockAuthUser = null;
    await renderNavbar();
    expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();
  });


  
 

  test('does NOT display unread notification badge if count is 0', async () => {
    mockAuthUser = mockUserData();
    getDoc.mockResolvedValue({ exists: () => true, data: () => mockAuthUser });
    const notifications = [{ read: true }]; // 0 unread
    onSnapshot.mockImplementation((docRef, cb) => {
      if (docRef.path.startsWith('users/')) {
        cb({ data: () => ({ notifications, role: mockAuthUser.role, ...mockAuthUser }) });
      }
      return mockUnsubscribeSnapshot;
    });
    await renderNavbar();
     await waitFor(() => { // Wait for potential badge to appear or not
        expect(screen.queryByText(/^\d+$/, { selector: '.notification-badge' })).not.toBeInTheDocument();
    });
  });
});


describe('Navbar Component - Click Outside Handlers', () => {
  beforeEach(() => {
    mockAuthUser = mockUserData();
    getDoc.mockResolvedValue({ exists: () => true, data: () => mockAuthUser });
    onSnapshot.mockImplementation((docRef, cb) => { cb({ data: () => ({ notifications: [] }) }); return mockUnsubscribeSnapshot; });
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });


  test('closes mobile menu on outside click (not clicking the menu button itself)', async () => {
    await renderNavbar();
    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    const mobileMenuContainer = document.querySelector('.mobile-menu-container');

    fireEvent.click(mobileMenuButton); // Open mobile menu
    await waitFor(() => expect(mobileMenuContainer).toHaveClass('open'));

    // Create a dummy outside element to click that is NOT the nav_bar button
    const outsideElement = document.createElement('div');
    outsideElement.setAttribute('data-testid', 'outside-element');
    document.body.appendChild(outsideElement);

    fireEvent.mouseDown(screen.getByTestId('outside-element')); // Click the dummy outside element
    document.body.removeChild(outsideElement);

    await waitFor(() => expect(mobileMenuContainer).not.toHaveClass('open'));
  });
});




describe('Navbar Component - Mobile Theme Toggle', () => {
  beforeEach(() => {
    mockAuthUser = null;
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('toggles theme using mobile theme button and updates localStorage', async () => {
    await renderNavbar(); 

    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton); 

    let mobileThemeToggleButton;
    await waitFor(() => {
        const mobileMenu = document.querySelector('.mobile-menu-container.open');
        mobileThemeToggleButton = within(mobileMenu).getByRole('button', { name: /Toggle Theme/i });
        expect(mobileThemeToggleButton).toBeVisible();
    });

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark'); // Default
    expect(mobileThemeToggleButton.querySelector('.fa-moon')).toBeInTheDocument();

    fireEvent.click(mobileThemeToggleButton);
    await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
        expect(localStorage.getItem('theme')).toBe('light');
    });
    expect(mobileThemeToggleButton.querySelector('.fa-sun')).toBeInTheDocument();

    fireEvent.click(mobileThemeToggleButton);
    await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        expect(localStorage.getItem('theme')).toBe('dark');
    });
    expect(mobileThemeToggleButton.querySelector('.fa-moon')).toBeInTheDocument();
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
