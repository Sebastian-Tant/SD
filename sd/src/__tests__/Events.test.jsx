import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Events from "../components/Events";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Mock Firebase Modules
jest.mock("../firebase", () => ({
  db: {},
}));

// Mock Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  arrayUnion: jest.fn((...args) => args),
  arrayRemove: jest.fn((...args) => args),
}));

// Mock Firebase Auth
let mockAuthCallback = null;
const mockCurrentUser = jest.fn(() => null);
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({
    currentUser: mockCurrentUser(),
    onAuthStateChanged: jest.fn((callback) => {
      mockAuthCallback = callback;
      callback(mockCurrentUser());
      return jest.fn(() => {
        mockAuthCallback = null;
      });
    }),
  })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    mockAuthCallback = callback;
    callback(mockCurrentUser());
    return jest.fn(() => {
      mockAuthCallback = null;
    });
  }),
}));

// Mock Data
const mockFacilities = {
  fac1: { name: "Main Hall", location: "Building A", capacity: 100 },
  fac2: { name: "Gym", location: "Building B", capacity: 50 },
};

const mockSubFacilities = {
  sub1: { name: "Stage", capacity: 20 },
};

const mockEvents = [
  {
    id: "event1",
    title: "Community Gathering",
    facilityId: "fac1",
    subfacilityId: null,
    start: "2025-06-15T18:00:00Z",
    end: "2025-06-15T20:00:00Z",
    address: "Building A Main Hall",
    attendees: ["user123"],
    image: "image1.jpg",
  },
  {
    id: "event2",
    title: "Sports Day",
    facilityId: "fac2",
    subfacilityId: null,
    start: "2025-07-10T09:00:00Z",
    end: "2025-07-10T15:00:00Z",
    location: "Building B Sports Field",
    attendees: [],
  },
  {
    id: "event3",
    title: "Small Workshop",
    facilityId: null,
    subfacilityId: "sub1",
    start: "2025-08-01T14:00:00Z",
    end: "2025-08-01T16:00:00Z",
    location: "Stage Area",
    attendees: Array(20)
      .fill(0)
      .map((_, i) => `user${i}`),
    image: "image3.jpg",
  },
];

const createMockSnapshot = (docs) => ({
  docs: docs.map((doc) => ({
    id: doc.id || Math.random().toString(),
    data: () => ({ ...doc }),
  })),
});

global.alert = jest.fn();
global.confirm = jest.fn(() => true);

const simulateAuthStateChange = (user) => {
  mockCurrentUser.mockReturnValue(user);
  if (mockAuthCallback) mockAuthCallback(user);
};

describe("Events Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.mockReturnValue(null);
    mockAuthCallback = null;

    collection.mockImplementation((_, path) => path);
    doc.mockImplementation((_, path, id) => `${path}/${id}`);
    getDoc.mockResolvedValue({ exists: () => false, data: () => null });
    updateDoc.mockResolvedValue();
    deleteDoc.mockResolvedValue();
    confirm.mockReturnValue(true);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Events />
      </MemoryRouter>
    );

  test("renders loading and then displays events", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Community Gathering")).toBeInTheDocument();
      expect(screen.getByText("Sports Day")).toBeInTheDocument();
      expect(screen.getByText("Small Workshop")).toBeInTheDocument();
    });
  });

  test('shows "No events found" when no events exist', async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot([]);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("No events found.")).toBeInTheDocument();
    });
  });

  test("shows RSVP buttons when logged out", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    renderComponent();

    await waitFor(() => {
      const rsvpButtons = screen.getAllByRole("button", {
        name: /RSVP|Cancel RSVP|Event Full/i,
      });
      expect(rsvpButtons.length).toBeGreaterThan(0);
      expect(
        screen.queryByRole("button", { name: /Delete/i })
      ).not.toBeInTheDocument();
    });
  });

  test("shows correct RSVP state for logged in user", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user" }),
    });
    simulateAuthStateChange({ uid: "user123" });

    renderComponent();

    await waitFor(() => {
      const event1Button = screen
        .getByText("Community Gathering")
        .closest(".event-card")
        .querySelector(".rsvp-btn");
      expect(event1Button).toHaveTextContent("Cancel RSVP");

      const event2Button = screen
        .getByText("Sports Day")
        .closest(".event-card")
        .querySelector(".rsvp-btn");
      expect(event2Button).toHaveTextContent("RSVP");
    });
  });

  test("handles RSVP click when not logged in", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    renderComponent();

    await waitFor(() => {
      const rsvpButton = screen
        .getByText("Sports Day")
        .closest(".event-card")
        .querySelector(".rsvp-btn");
      fireEvent.click(rsvpButton);
      expect(alert).toHaveBeenCalledWith("Please sign in to RSVP to events");
    });
  });

  test("handles RSVP and cancellation when logged in", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user" }),
    });
    simulateAuthStateChange({ uid: "newUser456" });

    renderComponent();

    await waitFor(async () => {
      const eventCard = screen.getByText("Sports Day").closest(".event-card");
      const rsvpButton = eventCard.querySelector(".rsvp-btn");

      // RSVP
      fireEvent.click(rsvpButton);
      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith("events/event2", {
          attendees: ["newUser456"],
        });
        expect(rsvpButton).toHaveTextContent("Cancel RSVP");
      });

      // Cancel RSVP
      fireEvent.click(rsvpButton);
      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith("events/event2", {
          attendees: ["newUser456"],
        });
        expect(rsvpButton).toHaveTextContent("RSVP");
      });
    });
  });

  test("shows delete buttons for admin", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Admin" }),
    });
    simulateAuthStateChange({ uid: "admin123" });

    renderComponent();

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole("button", { name: /🗑️/i });
      expect(deleteButtons.length).toBe(mockEvents.length);
    });
  });

  test("handles event deletion", async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Admin" }),
    });
    simulateAuthStateChange({ uid: "admin123" });

    renderComponent();

    await waitFor(async () => {
      const deleteButton = screen
        .getByText("Sports Day")
        .closest(".event-card")
        .querySelector(".delete-btn");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteDoc).toHaveBeenCalledWith("events/event2");
        expect(alert).toHaveBeenCalledWith("Event deleted successfully");
      });
    });
  });
 
  test("prioritizes address over location field", async () => {
    const eventWithBoth = {
      id: "eventWithBoth",
      title: "Event With Both Fields",
      address: "123 Main St",
      location: "Secondary Location",
      start: "2025-01-01T12:00:00Z",
      end: "2025-01-01T14:00:00Z",
      attendees: [],
    };

    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot([eventWithBoth]);
      // ... other mocks
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
      expect(screen.queryByText("Secondary Location")).not.toBeInTheDocument();
    });
  });
 
  
  test("shows placeholder image when no image provided", async () => {
    const noImageEvent = {
      id: "noImageEvent",
      title: "No Image Event",
      start: "2025-01-01T12:00:00Z",
      end: "2025-01-01T14:00:00Z",
      attendees: [],
    };

    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot([noImageEvent]);
      // ... other mocks
    });

    renderComponent();

    await waitFor(() => {
      const img = screen.getByAltText("No Image Event");
      expect(img).toHaveAttribute(
        "src",
        "https://via.placeholder.com/300x180?text=No+Image"
      );
    });
  });
  test("does not show admin features for non-admin users", async () => {
    const mockUser = { uid: "regularUser" };
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user" }),
    });
    simulateAuthStateChange(mockUser);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText("Add New Event")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: /Delete/i })).toHaveLength(
        0
      );
    });
  });
 
  test("handles error when fetching user role", async () => {
    const mockUser = { uid: "user123" };
    getDoc.mockRejectedValueOnce(new Error("Role fetch failed"));
    simulateAuthStateChange(mockUser);

    renderComponent();

    await waitFor(() => {
      // Should default to regular user privileges
      expect(screen.queryByText("Add New Event")).not.toBeInTheDocument();
    });
  });
 test('handles error when fetching user role by setting default "user" role', async () => {
  const mockUser = { uid: 'user123' };
  getDoc.mockRejectedValueOnce(new Error('Failed to fetch role'));
  simulateAuthStateChange(mockUser);

  renderComponent();

  await waitFor(() => {
    expect(screen.queryByText('Add New Event')).not.toBeInTheDocument();
    expect(screen.getAllByText(/RSVP/i).length).toBeGreaterThan(0);
  });
});test('does not cause issues with duplicate auth state handlers', async () => {
  // This test verifies the component works despite the duplicate useEffect
  getDocs.mockImplementation(async (path) => {
    if (path === 'events') return createMockSnapshot(mockEvents);
    // ... other mocks
  });

  renderComponent();

  await waitFor(() => {
    expect(screen.getByText('Community Gathering')).toBeInTheDocument();
  });
});
  test("scrolls to top when component mounts", async () => {
    window.scrollTo = jest.fn();
    renderComponent();

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });
  test('shows "Event Full" when capacity is reached', async () => {
    getDocs.mockImplementation(async (path) => {
      if (path === "events") return createMockSnapshot(mockEvents);
      if (path === "facilities")
        return createMockSnapshot(
          Object.entries(mockFacilities).map(([id, data]) => ({ id, ...data }))
        );
      if (path === "subfacilities")
        return createMockSnapshot(
          Object.entries(mockSubFacilities).map(([id, data]) => ({
            id,
            ...data,
          }))
        );
      return createMockSnapshot([]);
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user" }),
    });
    simulateAuthStateChange({ uid: "anotherUser789" });

    renderComponent();

    await waitFor(() => {
      const eventCard = screen
        .getByText("Small Workshop")
        .closest(".event-card");
      const rsvpButton = eventCard.querySelector(".rsvp-btn");

      expect(rsvpButton).toHaveTextContent("Event Full");
      expect(rsvpButton).toBeDisabled();
    });
  });
});
