import React from "react";
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MaintenanceChart from '../components/MaintenanceChart';
import { db } from '../firebase';
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

jest.mock('../firebase', () => ({
  db: mockDb,
}));

jest.mock('firebase/firestore', () => ({
  collection: (db, path) => mockCollectionImpl(db, path),
  query: (...args) => mockQueryImpl(...args),
  where: (...args) => mockWhereImpl(...args),
  getDocs: (queryRef) => mockGetDocsImpl(queryRef),
  orderBy: (...args) => mockOrderByImpl(...args),
  limit: (...args) => mockLimitImpl(...args),
}));

// Mock react-chartjs-2
const mockChartRef = {
  current: {
    update: jest.fn(),
    options: {
      plugins: {
        legend: { labels: { color: '#374151' } },
        title: { color: '#1f2937', text: '' },
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
      ref.current = mockChartRef.current;
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

// Mock FontAwesomeIcon with test ID
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn(({ icon, spin }) => (
    <div data-testid={`fa-icon-${icon.iconName}`} className={spin ? 'fa-spin' : ''} />
  )),
}));

// Mock MutationObserver
let mockMutationObserverCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  global.MutationObserver = jest.fn((callback) => {
    mockMutationObserverCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
    };
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Initialize mock chart ref
  mockChartRef.current = {
    update: jest.fn(),
    options: {
      plugins: {
        legend: { labels: { color: '#374151' } },
        title: { color: '#1f2937', text: '' },
      },
    },
    data: {
      datasets: [{ backgroundColor: [], borderColor: [] }],
    },
  };

  // Mock document theme
  Object.defineProperty(document.documentElement, 'getAttribute', {
    value: jest.fn((attr) => attr === 'data-theme' ? 'light' : ''),
    writable: true
  });
});

afterEach(() => {
  jest.restoreAllMocks();
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
    timestamp: new Date('2023-10-01T10:00:00Z') 
  },
  { 
    id: 'rep2', 
    facilityId: 'facility2', 
    facilityName: 'Swimming Pool', 
    issue: 'Filter issue', 
    status: 'In Progress', 
    timestamp: new Date('2023-10-02T11:00:00Z') 
  },
  { 
    id: 'rep3', 
    facilityId: 'facility1', 
    facilityName: 'Main Gym', 
    issue: 'Mirror cracked', 
    status: 'Resolved', 
    timestamp: new Date('2023-10-03T12:00:00Z') 
  },
];

// --- Test Suite ---
describe('MaintenanceChart', () => {
  test('renders initial loading state', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({
        docs: mockReportsDataAll.map(r => ({ id: r.id, data: () => r }))
      });

    render(<MaintenanceChart />);

    expect(screen.getByText('Maintenance Overview')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Select Facility/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Select Facility/i })).not.toBeDisabled();
    });
  });

  test('selects a specific facility and fetches its reports', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockResolvedValueOnce({
        docs: []
      })
      .mockResolvedValueOnce({
        docs: mockReportsDataAll.slice(0, 2).map(r => ({ id: r.id, data: () => r }))
      });

    render(<MaintenanceChart />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Select Facility/i })).not.toBeDisabled();
    });

    const select = screen.getByRole('combobox', { name: /Select Facility/i });
    fireEvent.change(select, { target: { value: 'facility1' } });

    await waitFor(() => {
      expect(screen.getByText('Treadmill broken')).toBeInTheDocument();
    });
  });

  test('handles error when fetching reports', async () => {
    mockGetDocsImpl
      .mockResolvedValueOnce({
        docs: mockFacilitiesData.map(f => ({ id: f.id, data: () => ({ name: f.name }) }))
      })
      .mockRejectedValueOnce(new Error('Failed to fetch reports'));

    render(<MaintenanceChart />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load reports. Please try again.')).toBeInTheDocument();
    });
  });

});