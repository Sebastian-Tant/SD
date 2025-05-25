import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import PeakHoursChart from "../components/PeakHoursChart";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Line } from "react-chartjs-2";

// --- Mocks ---

// Mock Firebase
const mockDb = {}; // Mock db object
const mockCollectionImpl = jest.fn();
const mockDocImpl = jest.fn();
const mockGetDocsImpl = jest.fn();
const mockGetDocImpl = jest.fn();

jest.mock("../firebase", () => ({
  // Adjust path to your firebase config
  db: mockDb,
}));

jest.mock("firebase/firestore", () => ({
  collection: (db, path, ...pathSegments) =>
    mockCollectionImpl(db, path, ...pathSegments),
  getDocs: (queryRef) => mockGetDocsImpl(queryRef),
  doc: (db, path, ...pathSegments) => mockDocImpl(db, path, ...pathSegments),
  getDoc: (docRef) => mockGetDocImpl(docRef),
}));

// Mock react-chartjs-2
jest.mock("react-chartjs-2", () => ({
  Line: jest.fn(({ data, options }) => (
    <section data-testid="mock-line-chart">
      {/* Render some data to assert against */}
      <span>ChartData: {JSON.stringify(data.datasets[0].data)}</span>
      <span>YAxisLabel: {options.scales.y.title.text}</span>
    </section>
  )),
}));

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actualFramerMotion = jest.requireActual("framer-motion");
  return {
    ...actualFramerMotion, // Keep actual AnimatePresence for open/close logic
    motion: {
      // Simplify motion components for testing
      section: ({ children, ...props }) => (
        <section {...props}>{children}</section>
      ),
      section: ({ children, ...props }) => (
        <section {...props}>{children}</section>
      ),
      button: ({ children, ...props }) => (
        <button {...props}>{children}</button>
      ),
      span: ({ children, ...props }) => <span {...props}>{children}</span>,
      ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
      li: ({ children, ...props }) => <li {...props}>{children}</li>,
    },
    // If AnimatePresence causes issues, simplify it:
    // AnimatePresence: ({ children }) => <section>{children}</section>,
  };
});

// Mock FontAwesomeIcon
jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: jest.fn(({ icon }) => (
    <i data-testid={`fa-icon-${icon.iconName}`} />
  )),
}));

// --- Test Suite ---
describe("PeakHoursChart", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockCollectionImpl.mockClear();
    mockDocImpl.mockClear();
    mockGetDocsImpl.mockReset();
    mockGetDocImpl.mockReset();

    // Default mock for collection and doc to return a descriptor
    mockCollectionImpl.mockImplementation((db, path) => {
      return {
        type: "collection",
        path,
        db: mockDb, // Ensure we return the mockDb object
      };
    });
    mockDocImpl.mockImplementation((db, path, ...pathSegments) => ({
      type: "doc",
      path: [path, ...pathSegments].join("/"),
      db,
    }));

    // Default mock for facilities fetch (used by most tests)
    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      if (queryRef.path === "facilities") {
        return Promise.resolve({
          docs: [
            {
              id: "facility1",
              data: () => ({ name: "Gym", has_subfacilities: false }),
            },
            {
              id: "facility2",
              data: () => ({ name: "Pool", has_subfacilities: true }),
            },
            {
              id: "facility3",
              data: () => ({ name: "Yoga Studio", has_subfacilities: false }),
            },
          ],
        });
      }
      // Default for subfacilities or other booking calls (empty unless overridden)
      return Promise.resolve({ docs: [] });
    });

    // Default mock for individual facility doc fetch (empty bookings)
    mockGetDocImpl.mockResolvedValue({
      exists: () => true,
      data: () => ({ bookings: [] }),
    });
  });

  // Test for initial render and loading state
  /*{test('renders loading state initially and then displays chart title and default facility', async () => {
  render(<PeakHoursChart />);
  expect(screen.getByText('Loading data...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Peak Hours Analysis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Facilities/i })).toBeInTheDocument();
    expect(screen.getByText('Average afternoon bookings across all facilities')).toBeInTheDocument();
  });

  // Verify Firebase was called correctly
  expect(mockCollectionImpl).toHaveBeenCalledWith(expect.anything(), 'facilities');
  expect(mockGetDocsImpl).toHaveBeenCalledWith(expect.objectContaining({ path: 'facilities' }));
});*/

  test('fetches bookings for "All Facilities" and processes them', async () => {
    // Mock data for "All Facilities"
    mockGetDocImpl.mockImplementation(async (docRef) => {
      // For facilities without subfacilities
      if (docRef.path === "facilities/facility1") {
        // Gym
        return {
          exists: () => true,
          data: () => ({
            name: "Gym",
            bookings: [{ time: "13:00" }, { time: "14:00" }],
          }),
        };
      }
      return { exists: () => true, data: () => ({ bookings: [] }) };
    });
    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      // For facilities list and subfacilities
      if (queryRef.path === "facilities") {
        return {
          docs: [
            {
              id: "facility1",
              data: () => ({ name: "Gym", has_subfacilities: false }),
            },
            {
              id: "facility2",
              data: () => ({ name: "Pool", has_subfacilities: true }),
            },
          ],
        };
      }
      if (queryRef.path === "facilities/facility2/subfacilities") {
        // Pool's subfacilities
        return {
          docs: [
            {
              id: "sub1",
              data: () => ({
                name: "Lane 1",
                bookings: [{ time: "13:00" }, { time: "15:00" }],
              }),
            },
          ],
        };
      }
      return { docs: [] };
    });

    render(<PeakHoursChart />);

    await waitFor(() => {
      // Expected: Gym (1PM:1, 2PM:1), Pool/Lane1 (1PM:1, 3PM:1)
      // Total: 1PM:2, 2PM:1, 3PM:1, 4PM:0, 5PM:0
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "ChartData: [2,1,1,0,0]"
      );
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "YAxisLabel: Average Bookings"
      );
    });

    // Check stats cards
    expect(screen.getByText("1 PM")).toBeInTheDocument(); // Busiest time
    expect(screen.getByText("2 avg. bookings")).toBeInTheDocument(); // Busiest value
    expect(screen.getByText("4 PM")).toBeInTheDocument(); // Quietest time (or 5PM)
    expect(screen.getByText("0 avg. bookings")).toBeInTheDocument(); // Quietest value
  });

  // Test for dropdown functionality
  test("dropdown functionality: opens, closes, and selects a facility", async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByText("Peak Hours Analysis")).toBeInTheDocument();
    });

    const dropdownButton = screen.getByRole("button", {
      name: /All Facilities/i,
    });

    // Open dropdown
    fireEvent.click(dropdownButton);

    // Find and click Gym option by text
    const gymOption = await screen.findByText("Gym");
    fireEvent.click(gymOption);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Gym/i })).toBeInTheDocument();
      expect(
        screen.getByText("Afternoon bookings for Gym")
      ).toBeInTheDocument();
    });
  });
  // Test for facility without subfacilities
  test("displays specific facility data when selected (facility without subfacilities)", async () => {
    mockGetDocImpl.mockImplementation(async (docRef) => {
      if (docRef.path === "facilities/facility1") {
        // Gym
        return {
          exists: () => true,
          data: () => ({
            name: "Gym",
            bookings: [{ time: "15:00" }, { time: "15:00" }, { time: "16:00" }],
          }),
        };
      }
      return { exists: () => true, data: () => ({ bookings: [] }) };
    });

    render(<PeakHoursChart />);

    // Wait for initial load
    await waitFor(() =>
      screen.getByRole("button", { name: /All Facilities/i })
    );

    // Open dropdown and select Gym
    fireEvent.click(screen.getByRole("button", { name: /All Facilities/i }));
    const gymOption = await screen.findByText("Gym");
    fireEvent.click(gymOption);

    // Wait for updates
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Gym/i })).toBeInTheDocument();
    });

    // Verify chart data
    await waitFor(() => {
      // Expected for Gym: 1PM(0), 2PM(0), 3PM(2), 4PM(1), 5PM(0)
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "ChartData: [0,0,2,1,0]"
      );
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "YAxisLabel: Total Bookings"
      );
    });
  });

  // Test for facility with subfacilities
  test("displays specific facility data when selected (facility with subfacilities)", async () => {
    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      if (queryRef.path === "facilities") {
        return {
          docs: [
            {
              id: "facility1",
              data: () => ({ name: "Gym", has_subfacilities: false }),
            },
            {
              id: "facility2",
              data: () => ({ name: "Pool", has_subfacilities: true }),
            },
          ],
        };
      }
      if (queryRef.path === "facilities/facility2/subfacilities") {
        return {
          docs: [
            {
              id: "sub1",
              data: () => ({
                name: "Lane 1",
                bookings: [{ time: "14:00" }, { time: "14:00" }],
              }),
            },
          ],
        };
      }
      return { docs: [] };
    });

    render(<PeakHoursChart />);

    // Wait for initial load
    await waitFor(() =>
      screen.getByRole("button", { name: /All Facilities/i })
    );

    // Open dropdown and select Pool
    fireEvent.click(screen.getByRole("button", { name: /All Facilities/i }));
    const poolOption = await screen.findByText("Pool");
    fireEvent.click(poolOption);

    // Wait for updates
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Pool/i })).toBeInTheDocument();
    });

    // Verify chart data
    await waitFor(() => {
      // Expected for Pool: 1PM(0), 2PM(2), 3PM(0), 4PM(0), 5PM(0)
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "ChartData: [0,2,0,0,0]"
      );
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "YAxisLabel: Total Bookings"
      );
    });
  });

  /*test('handles empty or invalid booking times defaulting to "5 PM"', async () => {
  // Mock the facility data with invalid times
  mockGetDocImpl.mockImplementation(async (docRef) => {
    if (docRef.path === 'facilities/facility1') {
      return { 
        exists: () => true, 
        data: () => ({ 
          name: 'Gym', 
          bookings: [
            { time: '' },       // empty string
            { time: null },     // null
            { time: 'invalid' }, // invalid format
            { time: '25:00' }   // invalid hour
          ] 
        }) 
      };
    }
    return { exists: () => true, data: () => ({ bookings: [] }) };
  });

  render(<PeakHoursChart />);
  
  // Wait for initial load
  await waitFor(() => screen.getByRole('button', { name: /All Facilities/i }));

  // Open dropdown and select Gym
  fireEvent.click(screen.getByRole('button', { name: /All Facilities/i }));
  const gymOption = await screen.findByText('Gym');
  fireEvent.click(gymOption);

  // Wait for updates and verify
  await waitFor(() => {
    // Check for any non-zero value in the 5 PM slot
    const chartText = screen.getByTestId('mock-line-chart').textContent;
    const match = chartText.match(/ChartData:\s*\[(\d+),(\d+),(\d+),(\d+),(\d+)\]/);
    expect(parseInt(match[5])).toBeGreaterThan(0); // Verify 5 PM slot has bookings
    
    expect(screen.getByTestId('mock-line-chart')).toHaveTextContent('YAxisLabel: Total Bookings');
    expect(screen.getByText('5 PM')).toBeInTheDocument();
    expect(screen.getByText(/total bookings/)).toBeInTheDocument();
    expect(screen.getByText('Offer promotions during quiet periods')).toBeInTheDocument();
  });
});*/

  test('displays "No booking data available" recommendation when no data', async () => {
    // Ensure all facilities/subfacilities return no bookings
    mockGetDocImpl.mockResolvedValue({
      exists: () => true,
      data: () => ({ bookings: [] }),
    });
    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      if (queryRef.path === "facilities") {
        return {
          docs: [
            {
              id: "facility1",
              data: () => ({ name: "Gym", has_subfacilities: false }),
            },
          ],
        };
      }
      return { docs: [] }; // No subfacilities, or they have no bookings
    });

    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-line-chart")).toHaveTextContent(
        "ChartData: [0,0,0,0,0]"
      );
    });
    expect(screen.getByText("No booking data available")).toBeInTheDocument();
    // Busiest/Quietest times will be empty, values will be 0
    const busiestValueElements = screen.getAllByText(
      /0 avg\. bookings|0 total bookings/
    );
    expect(busiestValueElements.length).toBeGreaterThanOrEqual(1); // for busiest and quietest cards
  });

  describe("peakStats recommendations based on data", () => {
    // Helper to render and select "Gym" with specific booking data
    const setupAndRenderGymWithBookings = async (gymBookings) => {
      mockGetDocImpl.mockImplementation(async (docRef) => {
        // For Gym
        if (docRef.path === "facilities/facility1") {
          return {
            exists: () => true,
            data: () => ({ name: "Gym", bookings: gymBookings }),
          };
        }
        // For any "All Facilities" interim calls if any (shouldn't happen if Gym directly selected)
        return { exists: () => true, data: () => ({ bookings: [] }) };
      });
      // facilities list mock (Gym must exist)
      mockGetDocsImpl.mockImplementation(async (queryRef) => {
        if (queryRef.path === "facilities") {
          return {
            docs: [
              {
                id: "facility1",
                data: () => ({ name: "Gym", has_subfacilities: false }),
              },
            ],
          };
        }
        return { docs: [] };
      });

      render(<PeakHoursChart />);
      await waitFor(() =>
        screen.getByRole("button", { name: /All Facilities/i })
      ); // Wait for initial load

      // Open dropdown
      fireEvent.click(screen.getByRole("button", { name: /All Facilities/i }));

      // Wait for dropdown to open and find the Gym option
      const gymOption = await screen.findByText("Gym");
      fireEvent.click(gymOption);

      await waitFor(() => screen.getByRole("button", { name: /Gym/i })); // Wait for selection to apply
    };

    test('recommends "Offer promotions during quiet periods" when minValue is 0', async () => {
      // Gym bookings: 1 PM (1), rest 0. Processed data: [1,0,0,0,0]. minValue = 0.
      await setupAndRenderGymWithBookings([{ time: "13:00" }]);
      await waitFor(() => {
        expect(
          screen.getByText("Offer promotions during quiet periods")
        ).toBeInTheDocument();
      });
    });

    test('recommends "Consider adjusting pricing..." when demand is skewed (maxValue/minValue > 3) and minValue > 0', async () => {
      // Gym bookings: 1PM(4), 2PM(1), 3PM(1), 4PM(1), 5PM(1).
      // Processed data: [4,1,1,1,1]. Max=4, Min=1. Ratio=4 > 3.
      const bookings = [
        { time: "13:00" },
        { time: "13:00" },
        { time: "13:00" },
        { time: "13:00" }, // 4 at 1 PM
        { time: "14:00" },
        { time: "15:00" },
        { time: "16:00" },
        { time: "17:00" }, // 1 each for other slots
      ];
      await setupAndRenderGymWithBookings(bookings);
      await waitFor(() => {
        expect(
          screen.getByText("Consider adjusting pricing to balance demand")
        ).toBeInTheDocument();
      });
    });

    test('recommends "Demand is well distributed" otherwise (ratio <= 3 and minValue > 0)', async () => {
      // Gym bookings: 1PM(2), 2PM(1), 3PM(1), 4PM(1), 5PM(1).
      // Processed data: [2,1,1,1,1]. Max=2, Min=1. Ratio=2 <= 3.
      const bookings = [
        { time: "13:00" },
        { time: "13:00" }, // 2 at 1 PM
        { time: "14:00" },
        { time: "15:00" },
        { time: "16:00" },
        { time: "17:00" }, // 1 each for other slots
      ];
      await setupAndRenderGymWithBookings(bookings);
      await waitFor(() => {
        expect(
          screen.getByText("Demand is well distributed")
        ).toBeInTheDocument();
      });
    });
  });
});
