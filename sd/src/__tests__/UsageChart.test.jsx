/**
 * @jest-environment jsdom
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import UsageChart from "../components/UsageChart";

// --- Mocks ---
const mockDb = {};
const mockCollectionImpl = jest.fn();
const mockGetDocsImpl = jest.fn();

jest.mock("../firebase", () => ({
  db: mockDb,
}));

jest.mock("firebase/firestore", () => ({
  collection: (db, path, ...pathSegments) =>
    mockCollectionImpl(db, path, ...pathSegments),
  getDocs: (queryRef) => mockGetDocsImpl(queryRef),
}));

jest.mock("react-chartjs-2", () => ({
  Bar: jest.fn(({ data, options }) => (
    <section data-testid="mock-bar-chart">
      <span>ChartLabels: {JSON.stringify(data.labels)}</span>
      <span>ChartData: {JSON.stringify(data.datasets?.[0]?.data || [])}</span>
      <span>TickColor: {options.scales.y.ticks.color}</span>
    </section>
  )),
}));

jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: jest.fn(({ icon }) => (
    <i data-testid={`fa-icon-${icon.iconName}`} />
  )),
}));

// Mock MutationObserver
let mockMutationObserverCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
global.MutationObserver = jest.fn((callback) => {
  mockMutationObserverCallback = callback;
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
    takeRecords: jest.fn(),
  };
});

// --- Test Data ---
const today = new Date("2024-01-31T12:00:00Z");
const mockFacilityBookings = (daysAgo) => ({
  toDate: () => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return date;
  },
});

const facilitiesData = [
  {
    id: "f1",
    name: "Gym",
    bookings: [
      { bookedAt: mockFacilityBookings(5) },
      { bookedAt: mockFacilityBookings(15) },
      { bookedAt: mockFacilityBookings(45) },
      { bookedAt: mockFacilityBookings(100) },
    ],
    has_subfacilities: false,
  },
  {
    id: "f2",
    name: "Pool",
    bookings: [{ bookedAt: mockFacilityBookings(2) }],
    has_subfacilities: true,
  },
  {
    id: "sf2_1",
    parentFacilityId: "f2",
    name: "Lane 1",
    bookings: [
      { bookedAt: mockFacilityBookings(3) },
      { bookedAt: mockFacilityBookings(20) },
    ],
  },
  {
    id: "f3",
    name: "Yoga Studio",
    bookings: [
      { bookedAt: mockFacilityBookings(1) },
      { bookedAt: mockFacilityBookings(8) },
      { bookedAt: mockFacilityBookings(35) },
      { bookedAt: mockFacilityBookings(65) },
      { bookedAt: mockFacilityBookings(85) },
    ],
    has_subfacilities: false,
  },
  {
    id: "f4",
    name: "Squash Court",
    bookings: [],
    has_subfacilities: true,
  },
  {
    id: "sf4_1",
    parentFacilityId: "f4",
    name: "Court A",
    bookings: [
      { bookedAt: mockFacilityBookings(4) },
      { bookedAt: mockFacilityBookings(25) },
    ],
  },
  {
    id: "f5",
    name: "Sauna",
    bookings: [{ bookedAt: mockFacilityBookings(200) }],
    has_subfacilities: false,
  },
  {
    id: "f6",
    bookings: [{ bookedAt: mockFacilityBookings(1) }],
    has_subfacilities: false,
  },
];

describe("UsageChart", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  beforeEach(() => {
    mockCollectionImpl.mockImplementation((db, path) => {
      // Return a mock query reference
      return { path };
    });

    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      const path = queryRef.path;
      if (path === "facilities") {
        return {
          docs: facilitiesData
            .filter((f) => !f.parentFacilityId)
            .map((f) => ({
              id: f.id,
              data: () => ({
                name: f.name,
                bookings: f.bookings,
                has_subfacilities: f.has_subfacilities,
              }),
            })),
        };
      }
      const subfacilityMatch = path.match(/facilities\/(f\d+)\/subfacilities/);
      if (subfacilityMatch) {
        const parentId = subfacilityMatch[1];
        return {
          docs: facilitiesData
            .filter((f) => f.parentFacilityId === parentId)
            .map((sf) => ({
              id: sf.id,
              data: () => ({ name: sf.name, bookings: sf.bookings }),
            })),
        };
      }
      return { docs: [] };
    });

    // Mock window.getComputedStyle
    global.window.getComputedStyle = jest.fn(() => ({
      getPropertyValue: () => "rgba(255, 255, 255, 0.6)",
    }));

    // Mock document.documentElement
    document.documentElement.getAttribute = jest.fn(() => "dark");

    global.URL.createObjectURL = jest.fn(() => "mock-url");
    global.URL.revokeObjectURL = jest.fn();
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("changes time range and updates chart data (7 days)", async () => {
    render(<UsageChart />);
    await waitFor(() =>
      expect(
        screen.queryByText("Loading data, please wait...")
      ).not.toBeInTheDocument()
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "7" } });

    expect(
      screen.getByText("Loading data, please wait...")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        'ChartLabels: ["Pool","Gym","Yoga Studio","Squash Court","Unnamed Facility f6"]'
      );
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        "ChartData: [2,1,1,1,1]"
      );
    });
  });

  test("handles facilities with no name gracefully", async () => {
    render(<UsageChart />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        /"Unnamed Facility f6"/
      );
    });
  });

  test("displays empty state when no booking data for top facilities", async () => {
    mockGetDocsImpl.mockImplementation(async () => ({ docs: [] }));

    render(<UsageChart />);
    await waitFor(() => {
      expect(screen.getByText("No Booking Data Found")).toBeInTheDocument();
      expect(screen.queryByTestId("mock-bar-chart")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Export as CSV/i })
      ).toBeDisabled();
    });
  });

  test("displays error state if fetching data fails", async () => {
    mockGetDocsImpl.mockRejectedValueOnce(new Error("Firestore fetch failed"));

    render(<UsageChart />);
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load booking data. Please try again later.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Oops! Something went wrong.")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("mock-bar-chart")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Export as CSV/i })
      ).toBeDisabled();
    });
  });

  test("exports data to CSV correctly", async () => {
    render(<UsageChart />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Export as CSV/i })
      ).not.toBeDisabled()
    );

    const exportButton = screen.getByRole("button", { name: /Export as CSV/i });
    fireEvent.click(exportButton);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test("handles facility with bookings only in subfacilities", async () => {
    render(<UsageChart />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        /"Squash Court"/
      );
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        /ChartData: .*2.*]/
      );
    });
  });

  test("countBookingsInTimeRange handles various bookedAt formats and invalid data", async () => {
    mockGetDocsImpl.mockImplementation(async (queryRef) => {
      if (queryRef.path === "facilities") {
        return {
          docs: [
            {
              id: "f_mixed",
              data: () => ({
                name: "Mixed Booking Facility",
                bookings: [
                  { bookedAt: mockFacilityBookings(5) },
                  {
                    bookedAt: new Date(
                      new Date(today).setDate(today.getDate() - 10)
                    ).toISOString(),
                  },
                  {
                    bookedAt: new Date(
                      new Date(today).setDate(today.getDate() - 25)
                    ).getTime(),
                  },
                  { bookedAt: null },
                  { bookedAt: "invalid-date-string" },
                  {},
                ],
                has_subfacilities: false,
              }),
            },
          ],
        };
      }
      return { docs: [] };
    });

    render(<UsageChart />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        'ChartLabels: ["Mixed Booking Facility"]'
      );
      expect(screen.getByTestId("mock-bar-chart")).toHaveTextContent(
        "ChartData: [3]"
      );
    });
  });

  test("disconnects MutationObserver on unmount", () => {
    const { unmount } = render(<UsageChart />);
    expect(mockObserve).toHaveBeenCalled();
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  test("export button is disabled when exportData is empty", async () => {
    mockGetDocsImpl.mockImplementation(async () => ({ docs: [] }));
    render(<UsageChart />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Export as CSV/i })
      ).toBeDisabled();
    });
  });
});
