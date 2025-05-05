import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Analytics from '../components/Analytics';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { act } from 'react-dom/test-utils';

// Mock dependencies
jest.mock('firebase/firestore');
jest.mock('../firebase');
jest.mock('../components/UsageChart', () => () => <div data-testid="usage-chart" />);
jest.mock('../components/MaintenanceChart', () => () => <div data-testid="maintenance-chart" />);
jest.mock('../components/PeakHoursChart', () => () => <div data-testid="peak-hours-chart" />);
jest.mock('../hooks/useTypewriter', () => () => "Facility Reports Dashboard");
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

    getDocs.mockImplementation((col) => {
      if (col.path.includes('subfacilities')) {
        return Promise.resolve(mockSubfacilities);
      } else if (col.path === 'reports') {
        return Promise.resolve(mockReports);
      } else if (col.type === 'query') {
        // Urgent reports query
        return Promise.resolve([mockReports[1]]);
      }
      return Promise.resolve(mockFacilities);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders loading state initially', async () => {
    render(<Analytics />);
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays typewriter title', async () => {
    render(<Analytics />);
    expect(screen.getByText('Facility Reports Dashboard')).toBeInTheDocument();
  });

  test('fetches and displays statistics', async () => {
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total bookings
      expect(screen.getByText('2')).toBeInTheDocument(); // Active maintenance
      expect(screen.getByText('1 urgent issues')).toBeInTheDocument();
    });
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
    getDocs.mockResolvedValueOnce([]);

    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Total bookings
    });
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

    // Mock facilities with bookings in current and previous month (December)
    getDocs.mockImplementation((col) => {
      if (col.path.includes('subfacilities')) {
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
              { bookedAt: new Date('2023-01-10').toISOString() }, // Current month
              { bookedAt: new Date('2022-12-20').toISOString() }  // Previous month
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

    await waitFor(() => {
      // Should show 100% increase (1 booking this month vs 1 last month)
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    // Restore original Date.now
    global.Date.now = realDateNow;
  });

  test('animates cards and charts', async () => {
    render(<Analytics />);

    await act(async () => {
      // Advance past initial animations
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const cardsGrid = screen.getByTestId('report-card').parentElement;
      expect(cardsGrid).toHaveClass('cards-visible');
      
      const charts = document.querySelectorAll('.chart-container');
      charts.forEach(chart => {
        expect(chart).toHaveClass('visible');
      });
    });
  });
});