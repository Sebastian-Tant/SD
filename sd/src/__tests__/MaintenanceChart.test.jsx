import React from "react";
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MaintenanceChart from '../components/MaintenanceChart'; // Adjust path if necessary
import { db } from '../firebase'; // Adjust path if necessary
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

// --- Mocks ---
const mockDb = {};
const mockCollectionImpl = jest.fn();
const mockQueryImpl = jest.fn();
const mockWhereImpl = jest.fn();
const mockGetDocsImpl = jest.fn();
const mockOrderByImpl = jest.fn();
const mockLimitImpl = jest.fn();

jest.mock('../firebase', () => ({ // Adjust path if necessary
  db: mockDb,
}));

jest.mock('firebase/firestore', () => ({
  collection: (db, path) => mockCollectionImpl(db, path),
  query: (...args) => mockQueryImpl(...args),
  where: (...args) => mockWhereImpl(...args),
  getDocs: (queryRef) => mockGetDocsImpl(queryRef),
  orderBy: (...args) => mockOrderByImpl(...args),
  limit: (...args) => mockLimitImpl(...args),
  Timestamp: {
    fromDate: (date) => ({
      toDate: () => date, // Mock toDate() method
      // Add other Timestamp methods if your component uses them
    }),
  }
}));

// Mock react-chartjs-2
const mockChartRef = {
  current: {
    update: jest.fn(),
    options: {
      plugins: {
        legend: { labels: { color: '#374151' } }, // Initial light theme color
        title: { color: '#1f2937', text: '' },    // Initial light theme color
      },
    },
    data: {
      datasets: [{ backgroundColor: [], borderColor: [] }],
    },
  },
};

jest.mock('react-chartjs-2', () => ({
  Doughnut: jest.fn(({ data, options, ref }) => {
    if (ref) {
      // When the component uses the ref, it gets our mockChartRef.
      // The component can then update mockChartRef.current.options or .data directly.
      // Chart.js also updates the instance's options when the options prop changes.
      ref.current = mockChartRef.current;
      // Simulate Chart.js updating the instance's options when the prop changes
      if (options && mockChartRef.current) {
        mockChartRef.current.options = JSON.parse(JSON.stringify(options)); // Deep copy to avoid shared references
        mockChartRef.current.data = JSON.parse(JSON.stringify(data));
      }
    }
    return (
      <div data-testid="mock-doughnut-chart">
        <span>ChartData: {JSON.stringify(data.datasets[0].data)}</span>
        <span>ChartLabels: {JSON.stringify(data.labels)}</span>
        <span>ChartTitle: {options.plugins.title.text}</span>
      </div>
    );
  }),
}));

// Mock FontAwesomeIcon
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn(({ icon, spin }) => (
    <div data-testid={`fa-icon-${icon.iconName}`} className={spin ? 'fa-spin' : ''} />
  )),
}));

// Mock html2canvas and jsPDF for PDF export tests
jest.mock('html2canvas', () => jest.fn().mockResolvedValue({
  toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,...'),
  width: 1000,
  height: 800,
}));
jest.mock('jspdf', () => {
  const mockSave = jest.fn();
  const mockAddImage = jest.fn();
  return jest.fn().mockImplementation(() => ({
    save: mockSave,
    addImage: mockAddImage,
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      }
    }
  }));
});


// --- Global Mocks & Spies ---
let mockMutationObserverCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
let getAttributeSpy;
let setAttributeSpy;

beforeAll(() => {
  global.MutationObserver = jest.fn((callback) => {
    mockMutationObserverCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
    };
  });

  // Spy on document.documentElement.getAttribute and setAttribute
  // This is safer than Object.defineProperty for existing DOM methods
  if (document && document.documentElement) {
    getAttributeSpy = jest.spyOn(document.documentElement, 'getAttribute');
    setAttributeSpy = jest.spyOn(document.documentElement, 'setAttribute');
  } else {
    // Fallback if JSDOM isn't set up as expected (should not happen with RTL)
    const mockDocElement = { getAttribute: jest.fn(), setAttribute: jest.fn() };
    getAttributeSpy = jest.spyOn(mockDocElement, 'getAttribute');
    setAttributeSpy = jest.spyOn(mockDocElement, 'setAttribute');
  }
});

beforeEach(() => {
  jest.clearAllMocks(); // Clears all mocks, including spies

  // Reset spy implementations for each test
  getAttributeSpy.mockImplementation((attr) => (attr === 'data-theme' ? 'light' : null));
  setAttributeSpy.mockImplementation(jest.fn());


  // Initialize mock chart ref (refreshed for each test)
  // The Doughnut mock will ensure ref.current points to this and updates it
  // based on passed props.
  mockChartRef.current = {
    update: jest.fn(),
    options: {
      plugins: {
        legend: { labels: { color: '#374151' } }, // Default light
        title: { color: '#1f2937', text: '' },    // Default light
      },
    },
    data: {
      datasets: [{
        data: [0,0,0], // Initial state before data load
        backgroundColor: [],
        borderColor: [],
      }],
       labels: ['Pending', 'In Progress', 'Resolved'],
    },
  };


  // Mock Firestore query implementations
  mockCollectionImpl.mockImplementation((db, path) => ({ db, path, type: 'collection' }));
  mockQueryImpl.mockImplementation((collectionRef, ...constraints) => {
    // This simplified mock just returns the collection ref and constraints
    // For more complex query testing, you might need a more elaborate mock
    return { collectionRef, constraints };
  });
  mockWhereImpl.mockImplementation((field, op, value) => ({ field, op, value, type: 'where' }));
  mockOrderByImpl.mockImplementation((field, direction) => ({ field, direction, type: 'orderBy' }));
  mockLimitImpl.mockImplementation((count) => ({ count, type: 'limit' }));
});

afterAll(() => {
  // Restore spies
  getAttributeSpy.mockRestore();
  setAttributeSpy.mockRestore();
});


// --- Test Data ---
const mockFacilitiesData = [
  { id: 'facility1', name: 'Main Gym' },
  { id: 'facility2', name: 'Swimming Pool' },
  { id: 'facility3', name: 'Yoga Studio' },
];

const mockReportsDataAll = [
  {
    id: 'rep1',
    facilityId: 'facility1',
    facilityName: 'Main Gym',
    issue: 'Treadmill broken',
    status: 'Pending',
    timestamp: { toDate: () => new Date('2023-10-01T10:00:00Z') }
  },
  {
    id: 'rep2',
    facilityId: 'facility2',
    facilityName: 'Swimming Pool',
    issue: 'Filter issue',
    status: 'In Progress',
    timestamp: { toDate: () => new Date('2023-10-02T11:00:00Z') }
  },
  {
    id: 'rep3',
    facilityId: 'facility1',
    facilityName: 'Main Gym',
    issue: 'Mirror cracked',
    status: 'Resolved',
    timestamp: { toDate: () => new Date('2023-10-03T12:00:00Z') }
  },
];

// --- Test Suite (Original Tests from User) ---
describe('MaintenanceChart (User Original Tests)', () => {
  test('renders initial loading state', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({ // facilities
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({ // reports for "All Facilities"
        docs: mockReportsDataAll.map(r => ({ id: r.id, data: () => r }))
      });

    render(<MaintenanceChart />);

    expect(screen.getByText('Maintenance Overview')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Select Facility/i })).toBeDisabled(); // Initially disabled

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Select Facility/i })).not.toBeDisabled();
    });
  });

  test('selects a specific facility and fetches its reports', async () => {
    const facility1Reports = mockReportsDataAll.filter(r => r.facilityId === 'facility1');
    mockGetDocsImpl
      .mockResolvedValueOnce({ // facilities
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({ // initial reports for "All Facilities" (can be empty for this test's focus)
        docs: []
      })
      .mockResolvedValueOnce({ // reports for facility1
        docs: facility1Reports.map(r => ({ id: r.id, data: () => r }))
      });

    render(<MaintenanceChart />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Select Facility/i })).not.toBeDisabled();
    });

    const select = screen.getByRole('combobox', { name: /Select Facility/i });
    fireEvent.change(select, { target: { value: 'facility1' } });

    await waitFor(() => {
      expect(screen.getByText('Treadmill broken')).toBeInTheDocument();
      expect(screen.getByText('Mirror cracked')).toBeInTheDocument();
      expect(screen.queryByText('Filter issue')).not.toBeInTheDocument();
    });
  });


  test('handles error when fetching reports', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({ // facilities
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockRejectedValueOnce(new Error('Simulated Firestore Error')); // Error fetching reports

    render(<MaintenanceChart />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load reports. Please try again.')).toBeInTheDocument();
    });
  });
});


describe('MaintenanceChart - Data Rendering and Interaction (Additional Tests)', () => {
  const mockFacilities = [
    { id: 'facility1', name: 'Alpha Site' },
    { id: 'facility2', name: 'Bravo Site' },
  ];

  // Timestamps need to be Firestore Timestamp like objects or convertible by your component
  const mockReportsFacility1 = [
    { id: 'repF1-1', facilityId: 'facility1', facilityName: 'Alpha Site', issue: 'Generator Offline', status: 'Pending', timestamp: { toDate: () => new Date('2024-05-20T08:00:00Z') } },
    { id: 'repF1-2', facilityId: 'facility1', facilityName: 'Alpha Site', issue: 'AC Unit Leak', status: 'In Progress', timestamp: { toDate: () => new Date('2024-05-19T14:30:00Z') } },
  ];

  const mockReportsFacility2 = [
    { id: 'repF2-1', facilityId: 'facility2', facilityName: 'Bravo Site', issue: 'Door Jammed', status: 'Resolved', timestamp: { toDate: () => new Date('2024-05-21T10:15:00Z') } },
  ];

  const mockAllReports = [
    ...mockReportsFacility1,
    ...mockReportsFacility2,
    { id: 'repAll-3', facilityId: 'facility1', facilityName: 'Alpha Site', issue: 'Light fixture broken', status: 'Closed', timestamp: { toDate: () => new Date('2024-05-18T09:00:00Z') } },
    { id: 'repAll-4', facilityId: 'facility2', facilityName: 'Bravo Site', issue: 'Window cracked', status: 'Open', timestamp: { toDate: () => new Date('2024-05-17T11:00:00Z') } },
    { id: 'repAll-5', facilityId: 'facility1', facilityName: 'Alpha Site', issue: 'Server room too hot', status: 'progress', timestamp: { toDate: () => new Date('2024-05-16T16:00:00Z') } },
    { id: 'repAll-6', facilityId: 'facility2', facilityName: 'Bravo Site', issue: 'Printer offline', status: 'Pending investigation', timestamp: { toDate: () => new Date('2024-05-15T12:00:00Z') } },
    { id: 'repAll-7', facilityId: 'facility1', facilityName: 'Alpha Site', issue: 'Unknown issue', status: 'Delayed', timestamp: { toDate: () => new Date('2024-05-14T10:00:00Z') } },
  ];


  test('renders "All Facilities" correctly with various report statuses and updates chart', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({ // Fetch facilities
        docs: mockFacilities.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({ // Fetch reports for "All Facilities"
        docs: mockAllReports.map(r => ({ id: r.id, data: () => r }))
      });

    render(<MaintenanceChart />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('All Facilities');
      // Chart data based on mockAllReports:
      // Pending: repF1-1, repAll-4 (Open), repAll-6 (Pending investigation) => 3
      // In Progress: repF1-2, repAll-5 (progress) => 2
      // Resolved: repF2-1, repAll-3 (Closed) => 2
      // Other: repAll-7 (Delayed) => 1
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartData: [3,2,2,1]');
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartLabels: ["Pending","In Progress","Resolved","Other"]');
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartTitle: Maintenance Status: All');
    });

    // Check for 5 most recent tickets displayed (order by timestamp desc in component logic)
    // The mockAllReports are not sorted by date here, but the component sorts them.
    // Most recent: repF2-1 (Door Jammed), repF1-1 (Generator Offline), repF1-2 (AC Unit Leak), repAll-3 (Light fixture), repAll-4 (Window cracked)
    expect(screen.getByText(/Door Jammed/i)).toBeInTheDocument();
    expect(screen.getByText(/Generator Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/AC Unit Leak/i)).toBeInTheDocument();
    expect(screen.getByText(/Light fixture broken/i)).toBeInTheDocument();
    expect(screen.getByText(/Window cracked/i)).toBeInTheDocument();
    expect(screen.queryByText(/Server room too hot/i)).not.toBeInTheDocument(); // 6th if sorted by date
  });

  test('displays "No reports" message and chart for a facility with no reports', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({ // Fetch facilities
        docs: mockFacilities.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({ // Fetch reports for "All Facilities" (can be empty)
        docs: []
      })
      .mockResolvedValueOnce({ // Fetch reports for "facility2" - empty
        docs: []
      });

    render(<MaintenanceChart />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'facility2' } });

    await waitFor(() => {
      expect(screen.getByText('No maintenance tickets found for this selection.')).toBeInTheDocument();
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartLabels: ["No reports"]');
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartData: [1]'); // As per component logic for no reports
      expect(screen.getByTestId('mock-doughnut-chart')).toHaveTextContent('ChartTitle: Maintenance Status: Bravo Site');
      expect(screen.getByText('Recent Tickets for Bravo Site')).toBeInTheDocument();
    });
  });
});
