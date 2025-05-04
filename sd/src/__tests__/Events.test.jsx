import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // Import MemoryRouter
import Events from '../components/Events';
import { db } from '../firebase'; // Adjust path if necessary
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// --- Mock Firebase Modules ---
jest.mock('../firebase', () => ({
  db: jest.fn(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  arrayUnion: jest.fn((...args) => ({ type: 'arrayUnion', args })),
  arrayRemove: jest.fn((...args) => ({ type: 'arrayRemove', args })),
  Timestamp: { // Keep Timestamp mock if needed, though not directly used here
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
}));

// Mock Firebase Auth
let mockAuthCallback = null; // Store the onAuthStateChanged callback
const mockCurrentUser = jest.fn(() => null); // Function to get current mock user state
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    // Mock the auth instance returned by getAuth
    currentUser: mockCurrentUser(), // Provide current user state
    onAuthStateChanged: jest.fn((callback) => {
      mockAuthCallback = callback; // Capture the callback
      // Simulate initial state check (e.g., logged out)
      callback(mockCurrentUser());
      return jest.fn(() => { mockAuthCallback = null; }); // Return unsubscribe function
    }),
  })),
  onAuthStateChanged: jest.fn((auth, callback) => { // Also mock top-level if used directly (though component uses getAuth()...)
      mockAuthCallback = callback;
      callback(mockCurrentUser());
      return jest.fn(() => { mockAuthCallback = null; });
  }),
}));

// --- Mock Data ---
const mockFacilities = {
  fac1: { name: 'Main Hall', location: 'Building A', capacity: 100 },
  fac2: { name: 'Gym', location: 'Building B', capacity: 50 },
};

const mockSubFacilities = {
  sub1: { name: 'Stage', capacity: 20 },
};

const mockEvents = [
  {
    id: 'event1',
    data: {
      title: 'Community Gathering',
      facilityId: 'fac1',
      subfacilityId: null,
      start: '2025-06-15T18:00:00Z',
      end: '2025-06-15T20:00:00Z',
      address: 'Building A Main Hall', // Example address override
      attendees: ['user123'],
      cover_image_url: 'image1.jpg',
    },
  },
  {
    id: 'event2',
    data: {
      title: 'Sports Day',
      facilityId: 'fac2',
      subfacilityId: null,
      start: '2025-07-10T09:00:00Z',
      end: '2025-07-10T15:00:00Z',
      location: 'Building B Sports Field', // Example location field
      attendees: [],
      // No cover_image_url, should use placeholder
    },
  },
  {
    id: 'event3',
    data: {
        title: 'Small Workshop',
        facilityId: null, // Example: maybe uses only subfacility? Or independent location
        subfacilityId: 'sub1',
        start: '2025-08-01T14:00:00Z',
        end: '2025-08-01T16:00:00Z',
        location: 'Stage Area',
        attendees: Array(20).fill(0).map((_, i) => `user${i}`), // Make it full based on subfacility capacity
        cover_image_url: 'image3.jpg',
    }
  }
];

// Helper to create mock snapshots
const createMockSnapshot = (docs) => ({
  docs: docs.map((doc) => ({
    id: doc.id,
    data: () => doc.data,
  })),
});

// Mock window alerts/confirmations
global.alert = jest.fn();
global.confirm = jest.fn();

// Helper function to simulate auth state change
const simulateAuthStateChange = (user) => {
  mockCurrentUser.mockReturnValue(user); // Update the current user state
  if (mockAuthCallback) {
    mockAuthCallback(user); // Trigger the callback
  }
};

describe('Events Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.mockReturnValue(null); // Default to logged out
    mockAuthCallback = null; // Reset callback capture

    // Default successful Firestore mocks
    collection.mockImplementation((_, path) => `mock/collection/${path}`);
    doc.mockImplementation((_, path, id) => `mock/doc/${path}/${id}`);
    getDocs.mockImplementation(async (query) => {
      if (query === 'mock/collection/events') return createMockSnapshot(mockEvents);
      if (query === 'mock/collection/facilities') return createMockSnapshot(Object.entries(mockFacilities).map(([id, data]) => ({ id, data })));
      if (query === 'mock/collection/subfacilities') return createMockSnapshot(Object.entries(mockSubFacilities).map(([id, data]) => ({ id, data })));
      return createMockSnapshot([]);
    });
    getDoc.mockResolvedValue({ exists: () => false, data: () => null }); // Default: user doc not found or no role
    updateDoc.mockResolvedValue();
    deleteDoc.mockResolvedValue();
    confirm.mockReturnValue(true); // Default confirm to true
  });

  const renderComponent = () => render(
    // Wrap with MemoryRouter because component uses <Link>
    <MemoryRouter>
      <Events />
    </MemoryRouter>
  );

  test('renders title, add event link, and events when data is available', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /All Events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add New Event/i })).toHaveAttribute('href', '/add-event');

    // Wait for events to load and check for titles
    await waitFor(() => {
      expect(screen.getByText('Community Gathering')).toBeInTheDocument();
      expect(screen.getByText('Sports Day')).toBeInTheDocument();
       expect(screen.getByText('Small Workshop')).toBeInTheDocument();
    });

    // Check formatting and details of one event
    const event1Card = screen.getByText('Community Gathering').closest('.event-card');
    expect(event1Card).toHaveTextContent(/Sunday, June 15, 2025 • 08:00 PM - 10:00 PM/); // Adjust expected time based on SAST (UTC+2)
    expect(event1Card).toHaveTextContent(/Location: Building A Main Hall/i); // Uses address field
    expect(event1Card).toHaveTextContent(/Capacity: 99/i); // 100 capacity - 1 attendee
    expect(event1Card).toHaveTextContent(/(1 attending)/i);
    expect(within(event1Card).getByRole('img', {name: 'Community Gathering'})).toHaveAttribute('src', 'image1.jpg');

    // Check placeholder image for event without cover_image_url
     const event2Card = screen.getByText('Sports Day').closest('.event-card');
     expect(within(event2Card).getByRole('img', {name: 'Sports Day'})).toHaveAttribute('src', expect.stringContaining('https://via.placeholder.com'));

  });

  test('renders "No events found" when no events are fetched', async () => {
    getDocs.mockImplementation(async (query) => {
      if (query === 'mock/collection/events') return createMockSnapshot([]); // No events
      if (query === 'mock/collection/facilities') return createMockSnapshot(Object.entries(mockFacilities).map(([id, data]) => ({ id, data })));
      if (query === 'mock/collection/subfacilities') return createMockSnapshot(Object.entries(mockSubFacilities).map(([id, data]) => ({ id, data })));
      return createMockSnapshot([]);
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No events found./i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Community Gathering')).not.toBeInTheDocument();
  });

    // --- Authentication and Role Tests ---

  test('shows RSVP buttons and no delete buttons when logged out', async () => {
      renderComponent(); // Starts logged out by default mock
      await waitFor(() => expect(screen.getByText('Community Gathering')).toBeInTheDocument());

      // Check RSVP buttons exist (text might vary, check presence)
      const rsvpButtons = screen.getAllByRole('button', { name: /RSVP|Cancel RSVP|Event Full/i });
      expect(rsvpButtons.length).toBe(mockEvents.length);

      // Check delete buttons are NOT present
      expect(screen.queryByRole('button', { name: /Delete Event/i })).not.toBeInTheDocument();
  });

  test('shows correct RSVP state and no delete buttons for regular user', async () => {
      const mockUser = { uid: 'user123', email: 'test@test.com' };
      // Mock user role fetch (regular user)
      getDoc.mockImplementation(async (docRef) => {
          if (docRef === 'mock/doc/users/user123') {
              return { exists: () => true, data: () => ({ role: 'user' }) };
          }
          return { exists: () => false, data: () => null };
      });

      renderComponent();
      simulateAuthStateChange(mockUser); // Log in user

      // Wait for UI update after auth change and potential role fetch
      await waitFor(() => {
        // Event 1: User 'user123' is attending
        const event1RsvpButton = screen.getByText('Community Gathering').closest('.event-card').querySelector('.rsvp-btn');
        expect(event1RsvpButton).toHaveTextContent(/Cancel RSVP/i);

        // Event 2: User 'user123' is NOT attending
        const event2RsvpButton = screen.getByText('Sports Day').closest('.event-card').querySelector('.rsvp-btn');
        expect(event2RsvpButton).toHaveTextContent(/^RSVP$/i); // Exact match for RSVP
      });

      // Check delete buttons are still NOT present
       expect(screen.queryByRole('button', { name: /Delete Event/i })).not.toBeInTheDocument();
  });


  // --- RSVP Functionality Tests ---
    test('handles RSVP click when not logged in', async () => {
        renderComponent(); // Logged out
        await waitFor(() => expect(screen.getByText('Sports Day')).toBeInTheDocument());

        const event2RsvpButton = screen.getByText('Sports Day').closest('.event-card').querySelector('.rsvp-btn');
        await userEvent.click(event2RsvpButton);

        expect(alert).toHaveBeenCalledWith("Please sign in to RSVP to events");
        expect(updateDoc).not.toHaveBeenCalled();
    });

    test('handles RSVP click and cancellation when logged in', async () => {
        const mockUser = { uid: 'newUser456', email: 'new@test.com' };
        getDoc.mockImplementation(async (docRef) => { // Mock user role
            if (docRef === 'mock/doc/users/newUser456') return { exists: () => true, data: () => ({ role: 'user' }) };
            return { exists: () => false, data: () => null };
        });

        renderComponent();
        simulateAuthStateChange(mockUser); // Log in

        await waitFor(() => expect(screen.getByText('Sports Day')).toBeInTheDocument());
        const event2Card = screen.getByText('Sports Day').closest('.event-card');
        const event2RsvpButton = event2Card.querySelector('.rsvp-btn');

        // 1. Click RSVP
        expect(event2RsvpButton).toHaveTextContent(/^RSVP$/i);
        await userEvent.click(event2RsvpButton);

        await waitFor(() => {
            // Check Firestore update for adding attendee
            expect(updateDoc).toHaveBeenCalledWith(
                'mock/doc/events/event2', // event ref
                { attendees: { type: 'arrayUnion', args: ['newUser456'] } }
            );
             // Check Firestore update for sending notification
            expect(updateDoc).toHaveBeenCalledWith(
                'mock/doc/users/newUser456', // user ref
                 expect.objectContaining({ // Contains notification object
                    notifications: {
                        type: 'arrayUnion',
                        args: [expect.objectContaining({ message: expect.stringContaining('You have successfully RSVP'), eventId: 'event2' })]
                    }
                 })
            );
            // Check button text updates locally
            expect(event2RsvpButton).toHaveTextContent(/Cancel RSVP/i);
        });
         // Check capacity text updated (50 capacity, now 1 attending)
         expect(event2Card).toHaveTextContent(/Capacity: 49/i);
         expect(event2Card).toHaveTextContent(/(1 attending)/i);


        // 2. Click Cancel RSVP
        await userEvent.click(event2RsvpButton);

         await waitFor(() => {
            // Check Firestore update for removing attendee
            expect(updateDoc).toHaveBeenCalledWith(
                'mock/doc/events/event2',
                { attendees: { type: 'arrayRemove', args: ['newUser456'] } }
            );
             // Check Firestore update for sending cancellation notification
             expect(updateDoc).toHaveBeenCalledWith(
                'mock/doc/users/newUser456',
                 expect.objectContaining({
                    notifications: {
                        type: 'arrayUnion',
                        args: [expect.objectContaining({ message: expect.stringContaining('RSVP for "Sports Day" has been cancelled'), eventId: 'event2' })]
                    }
                 })
            );
            // Check button text updates back
            expect(event2RsvpButton).toHaveTextContent(/^RSVP$/i);
        });
         // Check capacity text updated back (50 capacity, 0 attending)
         expect(event2Card).toHaveTextContent(/Capacity: 50/i);
         expect(event2Card).toHaveTextContent(/(0 attending)/i);
    });

    test('disables RSVP button and shows "Event Full" when capacity is met', async () => {
         const mockUser = { uid: 'anotherUser789', email: 'another@test.com' };
         getDoc.mockImplementation(async (docRef) => { // Mock user role
            if (docRef === 'mock/doc/users/anotherUser789') return { exists: () => true, data: () => ({ role: 'user' }) };
            return { exists: () => false, data: () => null };
        });

        renderComponent();
        simulateAuthStateChange(mockUser); // Log in

        await waitFor(() => expect(screen.getByText('Small Workshop')).toBeInTheDocument());
        const event3Card = screen.getByText('Small Workshop').closest('.event-card');
        const event3RsvpButton = event3Card.querySelector('.rsvp-btn');

        // Check capacity and attendee count (Subfacility capacity 20, attendees 20)
        expect(event3Card).toHaveTextContent(/Capacity: 0/i);
        expect(event3Card).toHaveTextContent(/(20 attending)/i);

        // Check button state for a user NOT already attending
        expect(event3RsvpButton).toHaveTextContent(/Event Full/i);
        expect(event3RsvpButton).toBeDisabled();
    });


  // --- Delete Functionality Tests ---

 
  

    

});