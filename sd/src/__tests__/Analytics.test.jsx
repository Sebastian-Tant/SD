import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Analytics from '../components/Analytics';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { act } from 'react-dom/test-utils';

// Mock window.matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dependencies
jest.mock('firebase/firestore');
jest.mock('../firebase');

// Mock components with minimal implementations
jest.mock('../components/UsageChart', () => () => (
  <div data-testid="usage-chart">Usage Chart</div>
));

jest.mock('../components/MaintenanceChart', () => () => (
  <div data-testid="maintenance-chart">Maintenance Chart</div>
));

jest.mock('../components/PeakHoursChart', () => () => (
  <div data-testid="peak-hours-chart">Peak Hours Chart</div>
));

jest.mock('../hooks/useTypewriter', () => ({
  __esModule: true,
  default: () => "Facility Reports Dashboard"
}));

jest.mock('../components/ReportCard', () => ({ title, value, trend }) => (
  <div data-testid="report-card">
    <h3>{title}</h3>
    <div>{value}</div>
    <div>{trend}</div>
  </div>
));

describe('Analytics Component', () => {
  const mockFacilities = [
    {
      id: '1',
      data: () => ({
        name: 'Gym',
        bookings: [
          { bookedAt: new Date().toISOString() },
          { bookedAt: new Date(Date.now() - 86400000).toISOString() }
        ],
        has_subfacilities: false
      })
    },
    {
      id: '2',
      data: () => ({
        name: 'Pool',
        bookings: [],
        has_subfacilities: true
      })
    }
  ];

  const mockSubfacilities = [
    {
      id: 'sub1',
      data: () => ({
        bookings: [
          { bookedAt: new Date().toISOString() }
        ]
      })
    }
  ];

  const mockReports = [
    { id: 'r1', data: () => ({ status: 'open' }) },
    { id: 'r2', data: () => ({ status: 'in progress' }) }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset localStorage mock
    localStorageMock.clear();

    getDocs.mockImplementation((col) => {
      if (col.path && col.path.includes('subfacilities')) {
        return Promise.resolve(mockSubfacilities);
      } else if (col.path === 'reports') {
        return Promise.resolve(mockReports);
      } else if (col.type === 'query') {
        return Promise.resolve([mockReports[1]]);
      }
      return Promise.resolve(mockFacilities);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fetches and displays statistics', async () => {
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    // Check report cards by test ID instead of text content
    const reportCards = await screen.findAllByTestId('report-card');
    expect(reportCards.length).toBe(2);
  });

  test('shows all chart components', async () => {
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
      expect(screen.getByTestId('maintenance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('peak-hours-chart')).toBeInTheDocument();
    });
  });

  test('handles empty facilities data', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    // Check for empty state in report cards
    const reportCards = await screen.findAllByTestId('report-card');
    expect(reportCards[0]).toHaveTextContent('0');
  });

  test('handles error when fetching data', async () => {
    console.error = jest.fn();
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error fetching analytics data:', expect.any(Error));
    });
  });

  test('calculates booking trend correctly', async () => {
    // Mock current month as January to test year wrapping
    const realDateNow = Date.now.bind(global.Date);
    global.Date.now = jest.fn(() => new Date('2023-01-15').getTime());

    getDocs.mockImplementation((col) => {
      if (col.path && col.path.includes('subfacilities')) {
        return Promise.resolve([]);
      } else if (col.path === 'reports') {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        {
          id: '1',
          data: () => ({
            name: 'Test Facility',
            bookings: [
              { bookedAt: new Date('2023-01-10').toISOString() },
              { bookedAt: new Date('2022-12-20').toISOString() }
            ],
            has_subfacilities: false
          })
        }
      ]);
    });

    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    // Check for trend text in report cards
    const reportCards = await screen.findAllByTestId('report-card');
    expect(reportCards[0]).toHaveTextContent(/increase|decrease/);

    global.Date.now = realDateNow;
  });

  test('handles theme initialization', async () => {
    // Set a theme in localStorage
    localStorageMock.setItem('theme', 'dark');
    
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('renders report cards with correct data', async () => {
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    const reportCards = await screen.findAllByTestId('report-card');
    expect(reportCards.length).toBe(2);
    expect(reportCards[0]).toHaveTextContent('Total Bookings');
    expect(reportCards[1]).toHaveTextContent('Active Maintenance');
  });
});