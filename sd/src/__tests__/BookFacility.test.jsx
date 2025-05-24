// BookFacility.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BookFacility from "../components/BookFacility"; // Adjust path as needed
import { toast } from "react-toastify";

// --- Mocking Firebase ---
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockArrayUnion = jest.fn();
const mockCollectionImpl = jest.fn(); // Renamed to avoid conflict with the name 'mockCollection' in older tests if any
const mockDocImpl = jest.fn(); // Renamed

jest.mock("../firebase", () => ({
  db: {}, // Mock db object
  auth: {
    currentUser: null, // Start with no user logged in
  },
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollectionImpl(...args),
  getDocs: (...args) => mockGetDocs(...args),
  getDoc: (...args) => mockGetDoc(...args),
  doc: (...args) => mockDocImpl(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  arrayUnion: (...args) => mockArrayUnion(...args),
}));

// --- Mocking React Router ---
const mockUseLocation = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => mockUseLocation(),
}));

// --- Mocking Google Maps API ---
const mockUseLoadScript = jest.fn();
jest.mock("@react-google-maps/api", () => ({
  useLoadScript: (...args) => mockUseLoadScript(...args),
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker"></div>,
}));

// --- Mocking react-toastify ---
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

// --- Helper to create mock Firestore doc ---
const createMockDoc = (data, id = "mockId") => ({
  id,
  data: () => data,
  exists: () => (data !== undefined && data !== null), // Ensure exists is true if data is provided
});

const createMockQuerySnapshot = (docs) => ({
  docs,
  empty: docs.length === 0,
  forEach: (callback) => docs.forEach(callback),
});

// --- Sample Data ---
const sampleFacilities = [
  {
    id: "facility1",
    name: "Main Hall",
    capacity: 100,
    images: ["image1.jpg"],
    address: "123 Main St",
    coordinates: { lat: 1, lng: 1 },
    bookings: []
  },
  {
    id: "facility2",
    name: "Sports Field",
    capacity: 50,
    images: ["image2.jpg"],
    location: "Near Park Entrance",
    coordinates: { lat: 2, lng: 2 },
    bookings: []
  },
];
const sampleSubfacilitiesFacility1 = [
  { id: "sub1", name: "Court A", capacity: 10, bookings: [] },
  { id: "sub2", name: "Court B", capacity: 8, bookings: [] },
];

const sampleUser = { uid: "testUser123", notifications: [] };

describe("BookFacility Component", () => {
  let onFacilitySelectMock;

  beforeEach(() => {
    jest.clearAllMocks();
    onFacilitySelectMock = jest.fn();

    // **CRITICAL FIX: Implement mockCollectionImpl and mockDocImpl to return objects with 'path'**
    mockCollectionImpl.mockImplementation((db, ...pathSegments) => {
      return { path: pathSegments.join('/') };
    });
    mockDocImpl.mockImplementation((db, ...pathSegments) => {
      return { path: pathSegments.join('/') };
    });

    mockUseLoadScript.mockReturnValue({ isLoaded: true, loadError: null });
    mockUseLocation.mockReturnValue({ state: {} });
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    require("../firebase").auth.currentUser = { uid: sampleUser.uid };

    // Default mockGetDocs implementation
    mockGetDocs.mockImplementation(async (ref) => {
      if (!ref || !ref.path) {
        console.error("Default mockGetDocs: received invalid ref", ref);
        return createMockQuerySnapshot([]);
      }
    //   console.log(`Default mockGetDocs called for path: ${ref.path}`);
      if (ref.path === "facilities") {
        return createMockQuerySnapshot(sampleFacilities.map(f => createMockDoc(f, f.id)));
      }
      if (ref.path === "facilities/facility1/subfacilities") {
        return createMockQuerySnapshot(sampleSubfacilitiesFacility1.map(sf => createMockDoc(sf, sf.id)));
      }
      if (ref.path.endsWith("/subfacilities")) { // General case for subfacilities
        return createMockQuerySnapshot([]); // Default to no subfacilities for others
      }
      if (ref.path === "events") {
        return createMockQuerySnapshot([]);
      }
      return createMockQuerySnapshot([]);
    });

    // Default mockGetDoc implementation
    mockGetDoc.mockImplementation(async (docRef) => {
      if (!docRef || !docRef.path) {
        console.error("Default mockGetDoc: received invalid docRef", docRef);
        return createMockDoc(undefined, 'errorId'); // Represents a non-existent doc
      }
    //   console.log(`Default mockGetDoc called for path: ${docRef.path}`);
      const pathParts = docRef.path.split('/');
      if (pathParts[0] === "facilities" && pathParts.length === 2) { // e.g., facilities/facility1
        const facilityId = pathParts[1];
        const facility = sampleFacilities.find(f => f.id === facilityId);
        return createMockDoc(facility || { bookings: [] }, facilityId);
      }
      if (pathParts[0] === "facilities" && pathParts[2] === "subfacilities" && pathParts.length === 4) { // e.g., facilities/facility1/subfacilities/sub1
        const facilityId = pathParts[1];
        const subfacilityId = pathParts[3];
        if (facilityId === "facility1") {
            const subfacility = sampleSubfacilitiesFacility1.find(sf => sf.id === subfacilityId);
            return createMockDoc(subfacility || { bookings: [] }, subfacilityId);
        }
        return createMockDoc({ bookings: [] }, subfacilityId); // Default for other subfacilities
      }
      if (docRef.path === `users/${sampleUser.uid}`) {
        return createMockDoc(sampleUser, sampleUser.uid);
      }
      return createMockDoc({ bookings: [] });
    });

    mockUpdateDoc.mockResolvedValue(undefined);
    mockArrayUnion.mockImplementation(data => ({ _mockedArrayUnionItem: data })); // Make it a bit more identifiable
  });

  test("renders loading state for maps", () => {
    mockUseLoadScript.mockReturnValue({ isLoaded: false, loadError: null });
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    expect(screen.getByText("Loading Maps...")).toBeInTheDocument();
  });

  test("renders error state for maps", () => {
    mockUseLoadScript.mockReturnValue({
      isLoaded: false,
      loadError: new Error("Map Load Error"),
    });
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    expect(screen.getByText("Error loading maps")).toBeInTheDocument();
  });

  test("renders and fetches facilities", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    expect(screen.getByText("Book a Facility")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Main Hall (Capacity: 100)" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Sports Field (Capacity: 50)" })).toBeInTheDocument();
    });
    
    expect(mockGetDocs).toHaveBeenCalledWith(expect.objectContaining({ path: "facilities" }));
  });


  test("selects a facility, calls onFacilitySelect, and shows subfacilities", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Main Hall (Capacity: 100)" })).toBeInTheDocument();
    });

    const facilitySelect = screen.getByLabelText("Select Facility");
    fireEvent.change(facilitySelect, { target: { value: "facility1" } });

    await waitFor(() => {
      expect(onFacilitySelectMock).toHaveBeenCalledWith("image1.jpg");
      expect(screen.getByLabelText("Select Court/Field")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Court A (Capacity: 10)" })).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
      expect(screen.getByTestId("google-map")).toBeInTheDocument();
    });
    expect(mockGetDocs).toHaveBeenCalledWith(expect.objectContaining({ path: "facilities/facility1/subfacilities" }));
  });

  test("handles facility selection with no subfacilities", async () => {
    const facility3Data = {
        id: "facility3",
        name: "Meeting Room",
        capacity: 20,
        images: ["image3.jpg"],
        bookings: [],
    };
    // Override global mockGetDocs for this test
    mockGetDocs.mockImplementation(async (ref) => {
        if (!ref || !ref.path) return createMockQuerySnapshot([]);
        if (ref.path === "facilities") {
            return createMockQuerySnapshot([createMockDoc(facility3Data, facility3Data.id)]);
        }
        if (ref.path === "facilities/facility3/subfacilities") {
            return createMockQuerySnapshot([]); // No subfacilities
        }
        if (ref.path === "events") {
            return createMockQuerySnapshot([]);
        }
        return createMockQuerySnapshot([]);
    });
    mockGetDoc.mockImplementation(async (docRef) => { // Also ensure getDoc returns this facility's data
        if (!docRef || !docRef.path) return createMockDoc(undefined, 'error');
        if (docRef.path === "facilities/facility3") {
            return createMockDoc(facility3Data, facility3Data.id);
        }
        if (docRef.path === `users/${sampleUser.uid}`) {
            return createMockDoc(sampleUser, sampleUser.uid);
        }
        return createMockDoc({ bookings: [] });
    });


    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Meeting Room (Capacity: 20)" })).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText("Select Facility"), {
      target: { value: "facility3" },
    });

    await waitFor(() => {
      expect(onFacilitySelectMock).toHaveBeenCalledWith("image3.jpg");
      expect(screen.queryByLabelText("Select Court/Field")).not.toBeInTheDocument();
    });
    expect(mockGetDocs).toHaveBeenCalledWith(expect.objectContaining({ path: "facilities/facility3/subfacilities" }));
  });

 test('shows "fully booked" message if no times are available', async () => {
    const bookedFacilityData = {
      ...sampleFacilities[0], // Main Hall
      id: "facility1_booked", // Use a distinct ID if needed, or ensure sampleFacilities[0] is this one
      name: "Booked Hall",
      bookings: [
        { date: "2025-07-05", time: "13:00", status: "approved" },
        { date: "2025-07-05", time: "14:00", status: "approved" },
        { date: "2025-07-05", time: "15:00", status: "approved" },
        { date: "2025-07-05", time: "16:00", status: "approved" },
        { date: "2025-07-05", time: "17:00", status: "approved" },
      ],
    };
  
    mockGetDocs.mockImplementation(async (ref) => {
      if (!ref || !ref.path) return createMockQuerySnapshot([]);
      if (ref.path === "facilities") {
        // Ensure this facility is part of the initial list
        return createMockQuerySnapshot([createMockDoc(bookedFacilityData, bookedFacilityData.id), ...sampleFacilities.slice(1).map(f=>createMockDoc(f,f.id))]);
      }
      if (ref.path === `facilities/${bookedFacilityData.id}/subfacilities`) {
        return createMockQuerySnapshot([]);
      }
      if (ref.path === "events") {
        return createMockQuerySnapshot([]);
      }
      return createMockQuerySnapshot([]);
    });
  
    mockGetDoc.mockImplementation(async (docRef) => {
      if (!docRef || !docRef.path) return createMockDoc(undefined);
      if (docRef.path === `facilities/${bookedFacilityData.id}`) {
        return createMockDoc(bookedFacilityData, bookedFacilityData.id);
      }
      if (docRef.path === `users/${sampleUser.uid}`) {
        return createMockDoc(sampleUser, sampleUser.uid);
      }
      return createMockDoc({ bookings: [] });
    });

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: `${bookedFacilityData.name} (Capacity: ${bookedFacilityData.capacity})` }));
    
    fireEvent.change(screen.getByLabelText("Select Facility"), {
        target: { value: bookedFacilityData.id },
    })
  
    fireEvent.change(screen.getByLabelText("Select Date"), {
      target: { value: "2025-07-05" },
    });

    await waitFor(() => {
      expect(screen.getByText("Facility is fully booked for this day. Please choose another day.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /13:00/ })).not.toBeInTheDocument();
    });
});

  // --- NEW TEST CASES START HERE ---

  test("successfully submits a booking for a facility without subfacilities", async () => {
    // Use facility2 (Sports Field) which will be configured by default beforeEach mocks
    // to have no subfacilities (as facilities/facility2/subfacilities returns []).

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => screen.getByRole("option", { name: "Sports Field (Capacity: 50)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility2" } });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateString = futureDate.toISOString().split("T")[0];
    
    await waitFor(() => screen.getByLabelText("Select Date"));
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: dateString } });

    await waitFor(() => expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "13:00" }));

    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "facilities/facility2" }),
        { bookings: expect.objectContaining({ _mockedArrayUnionItem: expect.anything() }) }
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${sampleUser.uid}` }),
        { notifications: expect.objectContaining({ _mockedArrayUnionItem: expect.objectContaining({ message: expect.stringContaining("Sports Field")})}) }
      );
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(`Booking request submitted for Sports Field on ${dateString} at 13:00 for 5 people.`)
      );
      expect(screen.queryByRole("button", { name: "13:00" })).not.toBeInTheDocument();
    });
  });


  test("attendee input defaults to 1, updates, and does not show 'at least 1' warning for 0 input", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    const attendeesInput = screen.getByLabelText("Number of Attendees");
    expect(attendeesInput.value).toBe("1");

    fireEvent.change(attendeesInput, { target: { value: "5" } });
    expect(attendeesInput.value).toBe("5");

    fireEvent.change(attendeesInput, { target: { value: "" } });
    expect(attendeesInput.value).toBe("1");

    fireEvent.change(attendeesInput, { target: { value: "0" } });
    expect(attendeesInput.value).toBe("1");

    await waitFor(() => { // Use waitFor to allow state updates to propagate
        expect(screen.queryByText("Number of attendees must be at least 1")).not.toBeInTheDocument();
    });
  });


  test("displays capacity warning when attendees exceed facility capacity", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Sports Field (Capacity: 50)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility2" } });

    const attendeesInput = screen.getByLabelText("Number of Attendees");
    fireEvent.change(attendeesInput, { target: { value: "51" } });

    await waitFor(() => {
      expect(screen.getByText("This facility only accommodates 50 people")).toBeInTheDocument();
    });

    fireEvent.change(attendeesInput, { target: { value: "50" } });
    await waitFor(() => {
      expect(screen.queryByText("This facility only accommodates 50 people")).not.toBeInTheDocument();
    });
  });

  test("displays capacity warning when attendees exceed subfacility capacity", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    await waitFor(() => screen.getByRole("option", { name: "Court A (Capacity: 10)" }));
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub1" } });

    const attendeesInput = screen.getByLabelText("Number of Attendees");
    // await waitFor(() => { /* ensure subfacility selection has processed */ }); // May not be needed if previous waits are sufficient
    fireEvent.change(attendeesInput, { target: { value: "11" } });

    await waitFor(() => {
      expect(screen.getByText("This court/field only accommodates 10 people")).toBeInTheDocument();
    });

    fireEvent.change(attendeesInput, { target: { value: "10" } });
    await waitFor(() => {
      expect(screen.queryByText("This court/field only accommodates 10 people")).not.toBeInTheDocument();
    });
  });

  test("shows login error if user is not logged in on submit", async () => {
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    require("../firebase").auth.currentUser = null;

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateString = futureDate.toISOString().split("T")[0];
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: dateString } });

    await waitFor(() => screen.getByRole("button", { name: "13:00" }));
    fireEvent.click(screen.getByRole("button", { name: "13:00" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You must be logged in to make a booking.");
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });
test("successfully submits a booking for a facility without subfacilities", async () => {
    // Using facility2 (Sports Field) which is set up by default in beforeEach
    // to have no subfacilities and to be available.
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    require("../firebase").auth.currentUser = { uid: sampleUser.uid }; // Ensure user is logged in

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Sports Field (Capacity: 50)" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Select Facility"), {
      target: { value: "facility2" }, // Sports Field
    });

    await waitFor(() => {
      // Verify no subfacility dropdown appears
      expect(screen.queryByLabelText("Select Court/Field")).not.toBeInTheDocument();
      // Verify onFacilitySelect was called with facility2's image
      expect(onFacilitySelectMock).toHaveBeenCalledWith("image2.jpg");
    });

    fireEvent.change(screen.getByLabelText("Number of Attendees"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Select Date"), {
      target: { value: "2025-08-10" }, // Future date
    });

    await waitFor(() => {
      // Default times should be available: 13:00, 14:00, etc.
      expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "13:00" }));

    await waitFor(() => {
        expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Booking request submitted for Sports Field on 2025-08-10 at 13:00 for 5 people. Waiting for admin approval."
      );
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2); // Once for user notifications, once for facility bookings
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${sampleUser.uid}` }),
        { notifications: expect.anything() } // More specific check can be added if needed
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "facilities/facility2" }), // Booking on facility itself
        {
          bookings: {
            _mockedArrayUnionItem: expect.objectContaining({
              userId: sampleUser.uid,
              date: "2025-08-10",
              time: "13:00",
              attendees: 5,
              status: "pending",
              facilityId: "facility2",
              facilityName: "Sports Field",
            }),
          },
        }
      );
    });
      // Check that the time slot is removed from available times
      expect(screen.queryByRole("button", { name: "13:00" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument(); // Other times should still be there
  });

 
  test("displays capacity warning when attendees exceed facility capacity (no subfacility selected)", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Sports Field (Capacity: 50)" }));

    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility2" } }); // Sports Field, capacity 50

    await waitFor(() => {
        expect(screen.getByLabelText("Number of Attendees")).toHaveAttribute("max", "50");
    });

    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "51" } });

    await waitFor(() => {
      expect(screen.getByText("This facility only accommodates 50 people")).toBeInTheDocument();
    });
     // Also test that it clears when attendees are valid again
    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "10" } });
    await waitFor(() => {
        expect(screen.queryByText("This facility only accommodates 50 people")).not.toBeInTheDocument();
    });
  });

  test("displays capacity warning when attendees exceed subfacility capacity", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    await waitFor(() => screen.getByRole("option", { name: "Court A (Capacity: 10)" }));
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub1" } }); // Court A, capacity 10

    await waitFor(() => {
        expect(screen.getByLabelText("Number of Attendees")).toHaveAttribute("max", "10");
    });

    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "11" } });

    await waitFor(() => {
      expect(screen.getByText("This court/field only accommodates 10 people")).toBeInTheDocument();
    });

    // Also test that it clears when attendees are valid again
    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "5" } });
    await waitFor(() => {
        expect(screen.queryByText("This court/field only accommodates 10 people")).not.toBeInTheDocument();
    });
  });

  test("prevents booking submission if user is not logged in", async () => {
    // @ts-ignore
    // eslint-disable-next-line no-import-assign
    require("../firebase").auth.currentUser = null; // User not logged in

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));

    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });
    await waitFor(() => screen.getByRole("option", { name: "Court A (Capacity: 10)" }));
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub1" } });
    fireEvent.change(screen.getByLabelText("Number of Attendees"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2025-09-01" } });

    await waitFor(() => screen.getByRole("button", { name: "13:00" }));
    fireEvent.click(screen.getByRole("button", { name: "13:00" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You must be logged in to make a booking.");
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  test("date change resets selected time and fetches new available times", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    await waitFor(() => screen.getByRole("option", { name: "Court A (Capacity: 10)" }));
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub1" } });

    // Select initial date and time
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2025-08-20" } });
    await waitFor(() => screen.getByRole("button", { name: "13:00" }));
    fireEvent.click(screen.getByRole("button", { name: "13:00" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "13:00" })).toHaveClass("selected"));

    // Change date
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2025-08-21" } });

    await waitFor(() => {
      // Selected time should be reset
      expect(screen.queryByRole("button", { name: /13:00.*selected/ })).not.toBeInTheDocument(); // Check it's not selected
      expect(screen.getByRole("button", { name: "13:00" })).not.toHaveClass("selected");
      // Confirm button should disappear as no time is selected
      expect(screen.queryByRole("button", { name: "Confirm Booking" })).not.toBeInTheDocument();
    });

    // mockGetDoc should have been called for the new date to fetch available times
    // (it will be called inside useEffect for fetchAvailableTimes)
    // This is a bit indirect to test, but the effect is that time slots are shown for the new date.
    // Let's ensure it tried to get subfacility bookings for the new date.
    // The beforeEach mockGetDoc will handle returning bookings for facility1/sub1
    // We expect `WorkspaceAvailableTimes` to run, which calls `getDoc` for the subfacility.
    expect(mockGetDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "facilities/facility1/subfacilities/sub1" }));
    await waitFor(() => {
        // Available times for the new date should be visible
        expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument();
    });
  });

  

  test("attendees input defaults to 1 if non-numeric or less than 1 value is entered", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    const attendeesInput = screen.getByLabelText("Number of Attendees");
    expect(attendeesInput).toHaveValue(1); // Initial value

    fireEvent.change(attendeesInput, { target: { value: "0" } });
    expect(attendeesInput).toHaveValue(1); // Should be reset to 1 by handleAttendeesChange

    fireEvent.change(attendeesInput, { target: { value: "-5" } });
    expect(attendeesInput).toHaveValue(1); // Should be reset to 1

    fireEvent.change(attendeesInput, { target: { value: "abc" } }); // Non-numeric
    expect(attendeesInput).toHaveValue(1); // Should be reset to 1 (parseInt will return NaN, then || 1)

    fireEvent.change(attendeesInput, { target: { value: "3" } });
    expect(attendeesInput).toHaveValue(3); // Valid value
  });

  test("displays message to select date if facility is selected but date is not", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));

    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    await waitFor(() => {
      // Date is not yet selected
      expect(screen.getByLabelText("Select Date")).toHaveValue("");
      // Time slots section should show the placeholder message
      expect(screen.getByText("Please select a date to see available times.")).toBeInTheDocument();
    });
  });

  test("filters available times based on events blocking a facility (no subfacility selected)", async () => {
    // Event from 14:00 to 16:00 for facility2 on 2025-10-01
    const eventBlockingFacility = {
      id: "event1",
      facilityId: "facility2",
      subfacilityId: null, // Blocks the whole facility
      start: new Date("2025-10-01T14:00:00").toISOString(),
      end: new Date("2025-10-01T16:00:00").toISOString(), // Blocks 14:00, 15:00
      title: "Facility Wide Event"
    };

    mockGetDocs.mockImplementation(async (ref) => {
      if (!ref || !ref.path) return createMockQuerySnapshot([]);
      if (ref.path === "facilities") {
        return createMockQuerySnapshot(sampleFacilities.map(f => createMockDoc(f, f.id)));
      }
      if (ref.path === "facilities/facility2/subfacilities") { // facility2 has no subfacilities
        return createMockQuerySnapshot([]);
      }
      if (ref.path === "events") {
        return createMockQuerySnapshot([createMockDoc(eventBlockingFacility, eventBlockingFacility.id)]);
      }
      return createMockQuerySnapshot([]);
    });

    // Ensure mockGetDoc for facility2 returns its data correctly (especially bookings which should be empty for this test)
    mockGetDoc.mockImplementation(async (docRef) => {
        if (!docRef || !docRef.path) return createMockDoc(undefined);
        if (docRef.path === "facilities/facility2") {
            const facility = sampleFacilities.find(f => f.id === "facility2");
            return createMockDoc(facility ? {...facility, bookings: []} : { bookings: [] }, "facility2");
        }
        if (docRef.path.startsWith("users/")) {
            return createMockDoc(sampleUser, sampleUser.uid);
        }
        return createMockDoc({ bookings: [] });
    });


    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Sports Field (Capacity: 50)" }));

    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility2" } });
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2025-10-01" } });

    await waitFor(() => {
      // All times: 13:00, 14:00, 15:00, 16:00, 17:00
      // Event blocks 14:00, 15:00
      // Expected available: 13:00, 16:00, 17:00
      expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "14:00" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "15:00" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "16:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "17:00" })).toBeInTheDocument();
    });
  });

  test("filters available times based on events blocking a specific subfacility", async () => {
    const eventBlockingSubfacility = {
      id: "eventSub1",
      facilityId: "facility1",
      subfacilityId: "sub1", // Blocks only Court A
      start: new Date("2025-10-02T15:00:00").toISOString(),
      end: new Date("2025-10-02T17:00:00").toISOString(), // Blocks 15:00, 16:00 for sub1
      title: "Court A Tournament"
    };

    mockGetDocs.mockImplementation(async (ref) => {
        if (!ref || !ref.path) return createMockQuerySnapshot([]);
        if (ref.path === "facilities") {
            return createMockQuerySnapshot(sampleFacilities.map(f => createMockDoc(f, f.id)));
        }
        if (ref.path === "facilities/facility1/subfacilities") {
            return createMockQuerySnapshot(sampleSubfacilitiesFacility1.map(sf => createMockDoc(sf, sf.id)));
        }
        if (ref.path === "events") {
            return createMockQuerySnapshot([createMockDoc(eventBlockingSubfacility, eventBlockingSubfacility.id)]);
        }
        return createMockQuerySnapshot([]);
    });

    mockGetDoc.mockImplementation(async (docRef) => {
        if (!docRef || !docRef.path) return createMockDoc(undefined);
        const pathParts = docRef.path.split('/');
        if (pathParts[0] === "facilities" && pathParts.length === 2) {
            const facility = sampleFacilities.find(f => f.id === pathParts[1]);
            return createMockDoc(facility || { bookings: [] }, pathParts[1]);
        }
        if (pathParts[0] === "facilities" && pathParts[2] === "subfacilities" && pathParts.length === 4) {
            if (pathParts[1] === "facility1") {
                const subfacility = sampleSubfacilitiesFacility1.find(sf => sf.id === pathParts[3]);
                // Ensure bookings are empty for this test on the subfacility itself to isolate event blocking
                return createMockDoc(subfacility ? {...subfacility, bookings: []} : { bookings: [] }, pathParts[3]);
            }
        }
        if (docRef.path.startsWith("users/")) {
            return createMockDoc(sampleUser, sampleUser.uid);
        }
        return createMockDoc({ bookings: [] });
    });

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));

    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });
    await waitFor(() => screen.getByRole("option", { name: "Court A (Capacity: 10)" }));
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub1" } }); // Court A
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2025-10-02" } });

    await waitFor(() => {
      // All times: 13:00, 14:00, 15:00, 16:00, 17:00
      // Event blocks 15:00, 16:00 for sub1
      // Expected available: 13:00, 14:00, 17:00
      expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "15:00" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "16:00" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "17:00" })).toBeInTheDocument();
    });

    // Additionally, check that Court B (sub2) on the same date is NOT affected by this event
    fireEvent.change(screen.getByLabelText("Select Court/Field"), { target: { value: "sub2" } }); // Court B

    await waitFor(() => {
      // For Court B, all times should be available as the event was specific to Court A
      expect(screen.getByRole("button", { name: "13:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "15:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "16:00" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "17:00" })).toBeInTheDocument();
    });
  });

  test("initializes with facilityId from location state", async () => {
    const initialFacilityId = "facility2"; // Sports Field
    mockUseLocation.mockReturnValue({ state: { facilityId: initialFacilityId } });

    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => {
      // Check if "Sports Field" is selected
      expect(screen.getByLabelText("Select Facility")).toHaveValue(initialFacilityId);
      // Check if onFacilitySelect was called for Sports Field
      expect(onFacilitySelectMock).toHaveBeenCalledWith("image2.jpg"); // Image of facility2
      // Check if location/map for Sports Field is shown
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("Near Park Entrance")).toBeInTheDocument(); // Location string for facility2
      expect(screen.getByTestId("google-map")).toBeInTheDocument();
    });

    // Also ensure subfacilities (if any for the pre-selected one) are loaded
    // facility2 has no subfacilities by default in our mocks
    expect(screen.queryByLabelText("Select Court/Field")).not.toBeInTheDocument();
  });

   test("shows 'FULLY BOOKED' in subfacility dropdown if subfacility has all 5 time slots booked with 'approved' status for a selected date", async () => {
    const dateWithFullSubfacility = "2025-11-01";
    const fullyBookedSubfacilityData = {
        ...sampleSubfacilitiesFacility1[0], // Court A
        id: "sub1_full",
        name: "Court A Fully Booked",
        bookings: [ // All 5 slots booked and approved for this date
            { date: dateWithFullSubfacility, time: "13:00", status: "approved" },
            { date: dateWithFullSubfacility, time: "14:00", status: "approved" },
            { date: dateWithFullSubfacility, time: "15:00", status: "approved" },
            { date: dateWithFullSubfacility, time: "16:00", status: "approved" },
            { date: dateWithFullSubfacility, time: "17:00", status: "approved" },
        ],
    };
    const otherSubfacilityData = sampleSubfacilitiesFacility1[1]; // Court B

    mockGetDocs.mockImplementation(async (ref) => {
        if (!ref || !ref.path) return createMockQuerySnapshot([]);
        if (ref.path === "facilities") {
            return createMockQuerySnapshot(sampleFacilities.map(f => createMockDoc(f, f.id)));
        }
        if (ref.path === "facilities/facility1/subfacilities") {
            return createMockQuerySnapshot([
                createMockDoc(fullyBookedSubfacilityData, fullyBookedSubfacilityData.id),
                createMockDoc(otherSubfacilityData, otherSubfacilityData.id)
            ]);
        }
        if (ref.path === "events") return createMockQuerySnapshot([]);
        return createMockQuerySnapshot([]);
    });
     // mockGetDoc needs to return the subfacility data when it's fetched for available times.
    mockGetDoc.mockImplementation(async (docRef) => {
        if (!docRef || !docRef.path) return createMockDoc(undefined);
        const pathParts = docRef.path.split('/');
        if (docRef.path === `facilities/facility1/subfacilities/${fullyBookedSubfacilityData.id}`) {
            return createMockDoc(fullyBookedSubfacilityData, fullyBookedSubfacilityData.id);
        }
        if (docRef.path === `facilities/facility1/subfacilities/${otherSubfacilityData.id}`) {
            return createMockDoc(otherSubfacilityData, otherSubfacilityData.id);
        }
        if (pathParts[0] === "facilities" && pathParts.length === 2) {
            const facility = sampleFacilities.find(f => f.id === pathParts[1]);
            return createMockDoc(facility, pathParts[1]);
        }
         if (docRef.path.startsWith("users/")) return createMockDoc(sampleUser, sampleUser.uid);
        return createMockDoc({ bookings: [] });
    });


    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);
    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    // Select the date for which the subfacility is fully booked
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: dateWithFullSubfacility } });

    await waitFor(() => {
        const subfacilitySelect = screen.getByLabelText("Select Court/Field");
        // Find the option for the fully booked subfacility
        // The name includes " - FULLY BOOKED" and it should be disabled
        const fullyBookedOption = screen.getByRole("option", { name: `${fullyBookedSubfacilityData.name} (Capacity: ${fullyBookedSubfacilityData.capacity}) - FULLY BOOKED`});
        expect(fullyBookedOption).toBeInTheDocument();
        expect(fullyBookedOption).toBeDisabled();

        // The other subfacility should be normal
        const otherOption = screen.getByRole("option", { name: `${otherSubfacilityData.name} (Capacity: ${otherSubfacilityData.capacity})` });
        expect(otherOption).toBeInTheDocument();
        expect(otherOption).toBeEnabled();
    });
  });
  test("changing date resets selected time and fetches new available times", async () => {
    render(<BookFacility onFacilitySelect={onFacilitySelectMock} />);

    await waitFor(() => screen.getByRole("option", { name: "Main Hall (Capacity: 100)" }));
    fireEvent.change(screen.getByLabelText("Select Facility"), { target: { value: "facility1" } });

    const date1 = "2025-12-01";
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: date1 } });

    await waitFor(() => screen.getByRole("button", { name: "13:00" }));
    fireEvent.click(screen.getByRole("button", { name: "13:00" }));
    expect(screen.getByRole("button", { name: "13:00" })).toHaveClass("selected");

    // Configure mockGetDoc to return fresh (empty) bookings for facility1 on the new date
    const originalGetDoc = mockGetDoc.getMockImplementation();
    mockGetDoc.mockImplementation(async (docRef) => {
        if (docRef && docRef.path === "facilities/facility1") {
            const facilityData = sampleFacilities.find(f => f.id === "facility1");
            return createMockDoc({ ...facilityData, bookings: [] }, "facility1"); // No bookings for this specific call
        }
        return originalGetDoc(docRef); // Fallback to original mock for other paths
    });


    const date2 = "2025-12-02";
    fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: date2 } });

    await waitFor(() => {
      const timeSlots = screen.getAllByRole("button", { name: /\d{2}:\d{2}/ });
      timeSlots.forEach(slot => expect(slot).not.toHaveClass("selected"));
      expect(screen.queryByRole("button", { name: "Confirm Booking" })).not.toBeInTheDocument();
    });
    expect(mockGetDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "facilities/facility1" }));
  });
});