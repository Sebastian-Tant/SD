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

  test('displays typewriter title', async () => {
    render(<Analytics />);
    expect(screen.getByText('Facility Reports Dashboard')).toBeInTheDocument();
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


});