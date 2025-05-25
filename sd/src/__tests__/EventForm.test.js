// CreateEventPage.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateEventPage from "../components/EventForm"; // Adjust path as needed
import { db, storage } from "../firebase"; // Adjust path as needed
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  updateDoc,
  arrayUnion,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";

// --- Mocks ---
jest.mock("../firebase", () => ({
  db: jest.fn(), // Mock the db instance itself if needed, or rely on individual function mocks
  storage: jest.fn(), // Mock the storage instance
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, path) => ({ path })), // Return an object with path for easier assertion
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: (Date.now() % 1000) * 1000000,
    })),
  },
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((...args) => ({ _type: "arrayUnion", _elements: args })), // Helper to inspect arguments
  doc: jest.fn((db, path, ...pathSegments) => ({
    // Mock doc to return an identifiable object
    id:
      pathSegments.length > 0
        ? pathSegments[pathSegments.length - 1]
        : path.split("/").pop(),
    path: `${path}/${pathSegments.join("/")}`,
    _path: path, // Store the main collection path for potential checks
    _segments: pathSegments, // Store segments
  })),
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock for URL.createObjectURL (browser API)
global.URL.createObjectURL = jest.fn(() => "mock-object-url");
global.URL.revokeObjectURL = jest.fn(); // Mock if your component uses it for cleanup

// Helper function to mock Date consistently
const mockCurrentDate = (dateString) => {
  const mockDate = new Date(dateString);
  const originalDate = global.Date;
  // @ts-ignore
  global.Date = jest.fn((...args) => {
    if (args.length) {
      // @ts-ignore
      return new originalDate(...args);
    }
    return mockDate;
  });
  global.Date.now = jest.fn(() => mockDate.getTime());
  // @ts-ignore (Ensure original Date methods are available if needed by other libraries)
  global.Date.UTC = originalDate.UTC;
  global.Date.parse = originalDate.parse;

  return mockDate;
};
let originalDate;
beforeAll(() => {
  originalDate = global.Date;
});
afterAll(() => {
  global.Date = originalDate; // Restore original Date
});

// --- Test Suite ---
describe("CreateEventPage", () => {
  // Restore Date mock and clear all mocks after each test
  afterEach(() => {
    jest.restoreAllMocks(); // Restores original implementations of spied/mocked functions
    jest.clearAllMocks(); // Clears call counts and stored arguments for all mocks
    global.Date = originalDate; // Explicitly restore Date
    global.Date.now = originalDate.now;

    // Reset file input if it exists in the DOM
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && fileInput instanceof HTMLInputElement)
      fileInput.value = "";
  });

  // Initial Data for Mocks
  const mockFacilities = [
    { id: "facility1", name: "Main Hall", location: "123 Main St" },
    {
      id: "facility2",
      name: "Conference Room A",
      location: "456 Business Ave",
    },
  ];
  const mockSubfacilitiesFacility1 = [
    { id: "subfacility1a", name: "Stage Area" },
    { id: "subfacility1b", name: "Back Room" },
  ];

  beforeEach(() => {
    // Reset mocks before each test to ensure test isolation
    getDocs.mockReset();
    addDoc.mockReset();
    updateDoc.mockReset();
    uploadBytes.mockReset();
    getDownloadURL.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    Timestamp.now.mockReturnValue({
      toDate: () => new Date("2025-05-24T10:00:00.000Z"), // Consistent timestamp for creation
      seconds: Math.floor(
        new Date("2025-05-24T10:00:00.000Z").getTime() / 1000
      ),
      nanoseconds: 0,
    });

    // Default mock for getDocs to handle different collections
    getDocs.mockImplementation((query) => {
      if (query.path === "facilities") {
        return Promise.resolve({
          docs: mockFacilities.map((fac) => ({ id: fac.id, data: () => fac })),
        });
      }
      if (query.path === "facilities/facility1/subfacilities") {
        return Promise.resolve({
          docs: mockSubfacilitiesFacility1.map((sub) => ({
            id: sub.id,
            data: () => sub,
          })),
        });
      }
      if (query.path === "facilities/facility2/subfacilities") {
        return Promise.resolve({ docs: [] }); // No subfacilities for facility2
      }
      if (query.path === "events") {
        return Promise.resolve({ docs: [] }); // No existing events by default
      }
      if (query.path === "users") {
        return Promise.resolve({
          docs: [{ id: "user1", data: () => ({ name: "Test User" }) }],
        }); // Mock one user
      }
      return Promise.resolve({ docs: [] }); // Default empty response
    });

    addDoc.mockResolvedValue({ id: "newEvent123" });
    updateDoc.mockResolvedValue(undefined);
    uploadBytes.mockResolvedValue({ ref: "mockStorageRef" });
    getDownloadURL.mockResolvedValue("http://mockurl.com/image.jpg");
    doc.mockImplementation((_db, mainPath, ...segments) => ({
      id:
        segments.length > 0
          ? segments[segments.length - 1]
          : mainPath.split("/").pop(),
      path: `${mainPath}/${segments.join("/")}`,
    }));
    arrayUnion.mockImplementation((...elements) => ({
      _type: "arrayUnion",
      _elements: elements,
    }));

    // Mock Date to a fixed point for consistent testing of time-related logic
    mockCurrentDate("2025-05-24T09:00:00.000Z"); // Current time is 9 AM UTC
  });

  test("handles image upload, preview, and deletion", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    const fileInput = screen.getByLabelText(/upload image\/gif/i);
    const testFile = new File(["(⌐□_□)"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      const imagePreview = screen.getByAltText("Event preview");
      expect(imagePreview).toBeInTheDocument();
      expect(imagePreview).toHaveAttribute("src", "mock-object-url");
    });

    const deleteButton = screen.getByRole("button", { name: "×" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByAltText("Event preview")).not.toBeInTheDocument();
      expect(fileInput.value).toBe("");
    });
  });

  test("shows error for invalid image type", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );
    const fileInput = screen.getByLabelText(/upload image\/gif/i);
    const testFile = new File(["text content"], "test.txt", {
      type: "text/plain",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Only JPG, PNG, or GIF images are allowed"
      );
    });
    expect(screen.queryByAltText("Event preview")).not.toBeInTheDocument();
  });

  test("shows error for image size exceeding 5MB", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );
    const fileInput = screen.getByLabelText(/upload image\/gif/i);
    const largeFile = new File(["a".repeat(6 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 }); // Mock file size

    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    await waitFor(() => {
      expect(
        screen.getByText("Image must be smaller than 5MB")
      ).toBeInTheDocument();
    });
    expect(screen.queryByAltText("Event preview")).not.toBeInTheDocument();
  });

  test("renders form elements correctly and fetches facilities", async () => {
    render(<CreateEventPage />);

    // Check for main heading
    expect(screen.getByRole("heading", { name: /create event/i })).toBeInTheDocument();

    // Check for input fields
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/facility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload image\/gif/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create event/i })).toBeInTheDocument();

    // Wait for facilities to be fetched and rendered
    await waitFor(() => {
      expect(screen.getByText("Main Hall")).toBeInTheDocument();
      expect(screen.getByText("Conference Room A")).toBeInTheDocument();
    });

    expect(getDocs).toHaveBeenCalledWith(collection(db, "facilities"));
  });

  test("displays facility location when selected", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    const facilitySelect = screen.getByLabelText(/facility/i);
    fireEvent.change(facilitySelect, { target: { value: "facility1" } });

    await waitFor(() => {
      expect(screen.getByText(/location: 123 main st/i)).toBeInTheDocument();
    });
  });

  test("fetches and displays subfacilities when a facility is selected", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    const facilitySelect = screen.getByLabelText(/facility/i);
    fireEvent.change(facilitySelect, { target: { value: "facility1" } });

    await waitFor(() => {
      expect(screen.getByLabelText(/subfacility \(optional\)/i)).toBeInTheDocument();
      expect(screen.getByText("Stage Area")).toBeInTheDocument();
      expect(screen.getByText("Back Room")).toBeInTheDocument();
    });

    expect(getDocs).toHaveBeenCalledWith(collection(db, "facilities", "facility1", "subfacilities"));
  });

  test("resets subfacility selection when facility changes", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    const facilitySelect = screen.getByLabelText(/facility/i);
    const subfacilitySelect = screen.getByLabelText(/subfacility \(optional\)/i);

    // Select facility1 and then a subfacility
    fireEvent.change(facilitySelect, { target: { value: "facility1" } });
    await waitFor(() => expect(screen.getByText("Stage Area")).toBeInTheDocument());
    fireEvent.change(subfacilitySelect, { target: { value: "subfacility1a" } });
    expect(subfacilitySelect).toHaveValue("subfacility1a");

    // Change facility to facility2 (which has no subfacilities)
    fireEvent.change(facilitySelect, { target: { value: "facility2" } });
    await waitFor(() => expect(screen.queryByLabelText(/subfacility \(optional\)/i)).not.toBeInTheDocument());
    expect(subfacilitySelect).toHaveValue(""); // Check if it's reset
  });

  test("submits event successfully without an image and subfacility", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Team Meeting" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    // Set times. Current mock date is 2025-05-24T09:00:00Z.
    // roundToNextHour for start time will be 2025-05-24T10:00
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T11:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    expect(submitButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(addDoc).toHaveBeenCalledWith(collection(db, "events"), {
      title: "Team Meeting",
      facilityId: "facility1",
      subfacilityId: null,
      start: "2025-05-24T10:00",
      end: "2025-05-24T11:00",
      address: "123 Main St",
      createdAt: expect.any(Object), // Timestamp.now() mock
      image: null,
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "facility1", path: "facilities/facility1" }),
      {
        blockedTimes: {
          _type: "arrayUnion",
          _elements: [
            {
              date: "2025-05-24",
              times: ["10:00"],
              eventId: "newEvent123",
            },
          ],
        },
      }
    );

    expect(getDownloadURL).not.toHaveBeenCalled();
    expect(uploadBytes).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Event created successfully.");

    // Check if form is reset
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/facility/i)).toHaveValue("");
    expect(screen.getByLabelText(/start time/i)).toHaveValue("");
    expect(screen.getByLabelText(/end time/i)).toHaveValue("");
    expect(submitButton).not.toBeDisabled();
  });

  test("submits event successfully with an image and subfacility", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Product Launch" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    await waitFor(() => expect(screen.getByLabelText(/subfacility \(optional\)/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/subfacility \(optional\)/i), {
      target: { value: "subfacility1a" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T14:00" }, // After current time
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T16:00" },
    });

    const fileInput = screen.getByLabelText(/upload image\/gif/i);
    const testFile = new File(["image content"], "event.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(uploadBytes).toHaveBeenCalledTimes(1);
    expect(getDownloadURL).toHaveBeenCalledTimes(1);

    expect(addDoc).toHaveBeenCalledWith(collection(db, "events"), {
      title: "Product Launch",
      facilityId: "facility1",
      subfacilityId: "subfacility1a",
      start: "2025-05-24T14:00",
      end: "2025-05-24T16:00",
      address: "123 Main St",
      createdAt: expect.any(Object),
      image: "http://mockurl.com/image.jpg",
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "subfacility1a",
        path: "facilities/facility1/subfacilities/subfacility1a",
      }),
      {
        blockedTimes: {
          _type: "arrayUnion",
          _elements: [
            {
              date: "2025-05-24",
              times: ["14:00", "15:00"], // 2 hours blocked
              eventId: "newEvent123",
            },
          ],
        },
      }
    );
    expect(toast.success).toHaveBeenCalledWith("Event created successfully.");
  });

  test("shows error if required fields are not filled", async () => {
    render(<CreateEventPage />);
    const submitButton = screen.getByRole("button", { name: /create event/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields.");
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  test("shows error if end time is not after start time", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Invalid Time Event" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T10:00" }, // Same as start time
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith("End time must be after start time.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("shows error if start time is in the past", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Past Event" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T08:00" }, // Before current mock time 09:00
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T09:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith("Start time cannot be in the past.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("shows error if event conflicts with existing event", async () => {
    getDocs.mockImplementation((query) => {
      if (query.path === "events") {
        return Promise.resolve({
          docs: [
            {
              id: "existingEvent1",
              data: () => ({
                facilityId: "facility1",
                subfacilityId: null,
                start: "2025-05-24T10:30",
                end: "2025-05-24T12:30",
              }),
            },
          ],
        });
      }
      if (query.path === "facilities") {
        return Promise.resolve({
          docs: mockFacilities.map((fac) => ({ id: fac.id, data: () => fac })),
        });
      }
      return Promise.resolve({ docs: [] });
    });

    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Conflicting Event" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T11:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T13:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText("Time slot conflicts with an existing event.")).toBeInTheDocument();
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("handles submission error gracefully", async () => {
    addDoc.mockRejectedValue(new Error("Firestore error"));

    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Error Event" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T11:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to create event.");
    expect(submitButton).not.toBeDisabled(); // Ensure button is re-enabled
  });

  test("sets start and end times correctly and rounds to nearest hour", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    const startTimeInput = screen.getByLabelText(/start time/i);
    const endTimeInput = screen.getByLabelText(/end time/i);

    // Test setting start time - should round to next hour (10:00 from 09:00 current mock)
    fireEvent.change(startTimeInput, { target: { value: "2025-05-24T09:30" } });
    expect(startTimeInput).toHaveValue("2025-05-24T10:00");

    // Test setting end time after start time
    fireEvent.change(endTimeInput, { target: { value: "2025-05-24T11:45" } });
    expect(endTimeInput).toHaveValue("2025-05-24T12:00");

    // Test error when setting end time before or same as start time
    fireEvent.change(endTimeInput, { target: { value: "2025-05-24T09:00" } });
    expect(toast.error).toHaveBeenCalledWith("End time must be after start time.");
    expect(endTimeInput).toHaveValue(""); // Value should reset or remain unchanged (depends on component logic, here it clears)
  });

  test("disables submit button during submission", async () => {
    // Mock addDoc to simulate a delay
    addDoc.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "newEvent123" }), 100))
    );

    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Loading Test" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T11:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Submitting...");

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    expect(submitButton).toHaveTextContent("Create Event");
  });

  test("blockTimesForEvent correctly blocks times for a subfacility", async () => {
    // This test specifically focuses on the internal blockTimesForEvent logic.
    // We can trigger it by simulating a full form submission and checking the updateDoc call.
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Subfacility Block Test" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    await waitFor(() => screen.getByLabelText(/subfacility \(optional\)/i));
    fireEvent.change(screen.getByLabelText(/subfacility \(optional\)/i), {
      target: { value: "subfacility1a" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T13:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T15:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "subfacility1a",
        path: "facilities/facility1/subfacilities/subfacility1a",
      }),
      {
        blockedTimes: {
          _type: "arrayUnion",
          _elements: [
            {
              date: "2025-05-24",
              times: ["13:00", "14:00"],
              eventId: "newEvent123",
            },
          ],
        },
      }
    );
  });

  test("blockTimesForEvent correctly blocks times for a facility (no subfacility)", async () => {
    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Facility Block Test" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility2" }, // Facility with no subfacilities by default mock
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T17:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T18:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "facility2",
        path: "facilities/facility2",
      }),
      {
        blockedTimes: {
          _type: "arrayUnion",
          _elements: [
            {
              date: "2025-05-24",
              times: ["17:00"],
              eventId: "newEvent123",
            },
          ],
        },
      }
    );
  });

  test("sendEventNotification is called and updates users' notifications", async () => {
    // Ensure getDocs for 'users' is mocked correctly
    getDocs.mockImplementation((query) => {
      if (query.path === "users") {
        return Promise.resolve({
          docs: [
            { id: "user1", data: () => ({ notifications: [] }) },
            { id: "user2", data: () => ({ notifications: [{ message: "old notification" }] }) },
          ],
        });
      }
      if (query.path === "facilities") {
        return Promise.resolve({
          docs: mockFacilities.map((fac) => ({ id: fac.id, data: () => fac })),
        });
      }
      if (query.path === "events") {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({ docs: [] });
    });

    render(<CreateEventPage />);
    await waitFor(() =>
      expect(screen.getByText("Main Hall")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Notification Event" },
    });
    fireEvent.change(screen.getByLabelText(/facility/i), {
      target: { value: "facility1" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2025-05-24T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2025-05-24T11:00" },
    });

    const submitButton = screen.getByRole("button", { name: /create event/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Expect updateDoc to have been called for each user
    expect(updateDoc).toHaveBeenCalledTimes(3); // One for facility, two for users

    // Check arguments for user updates
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user1" }),
      {
        notifications: expect.objectContaining({
          _type: "arrayUnion",
          _elements: [
            expect.objectContaining({
              message: expect.stringContaining(
                "New event: Notification Event at Main Hall on"
              ),
              read: false,
              type: "event",
            }),
          ],
        }),
      }
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user2" }),
      {
        notifications: expect.objectContaining({
          _type: "arrayUnion",
          _elements: [
            expect.objectContaining({
              message: expect.stringContaining(
                "New event: Notification Event at Main Hall on"
              ),
            }),
          ],
        }),
      }
    );
  });
});