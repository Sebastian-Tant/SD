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
jest.mock('../components/ReportCard', () => ({ title, value, trend, trendColor, icon }) => (
  <div data-testid="report-card">
    <h3>{title}</h3>
    <div data-testid="report-card-value">{value}</div>
    <div data-testid="report-card-trend" className={trendColor}>{trend} <span data-testid="report-card-icon">{icon}</span></div>
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
        return Promise.resolve({ docs: mockSubfacilities });
      } else if (col.path === 'reports') {
        return Promise.resolve({ docs: mockReports });
      } else if (col.type === 'query' && col._delegate._where && col._delegate._where[0].fieldPath.segments[0] === 'status' && col._delegate._where[0].opStr === '==' && col._delegate._where[0].value === 'in progress') {
        return Promise.resolve({ docs: [mockReports[1]] });
      } else if (col.type === 'query' && col._delegate._where && col._delegate._where[0].fieldPath.segments[0] === 'status' && col._delegate._where[0].opStr === 'in' && JSON.stringify(col._delegate._where[0].value) === JSON.stringify(['open', 'in progress'])) {
        return Promise.resolve({ docs: mockReports });
      }
      return Promise.resolve({ docs: mockFacilities });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders initial title with cursor', () => {
    render(<Analytics />);
    expect(screen.getByText('Facility Reports Dashboard|')).toBeInTheDocument();
  });

  test('renders initial subtitle with opacity 0', () => {
    render(<Analytics />);
    const subtitle = screen.getByText('Analytics and insights for better facility management');
    expect(subtitle).toHaveClass('opacity-0');
  });

  test('shows subtitle after title animation timeout', async () => {
    render(<Analytics />);
    act(() => {
      jest.advanceTimersByTime("Facility Reports Dashboard".length * 50 + 300);
    });
    await waitFor(() => {
      const subtitle = screen.getByText('Analytics and insights for better facility management');
      expect(subtitle).toHaveClass('opacity-100');
    });
  });

  test('renders report cards with loading state initially', () => {
    render(<Analytics />);
    expect(screen.getByTestId('report-card')).toBeInTheDocument();
    expect(screen.getByTestId('report-card-value')).toHaveTextContent('...');
    expect(screen.getByTestId('report-card-trend')).toHaveTextContent('Loading...');
  });

  test('renders report cards with fetched data', async () => {
    render(<Analytics />);

    await act(async () => {
      await jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByTestId('report-card', { name: /Total Bookings/i })).toBeInTheDocument();
      expect(screen.getByTestId('report-card-value', { container: screen.getByTestId('report-card', { name: /Total Bookings/i }) })).toHaveTextContent('3');
      expect(screen.getByTestId('report-card-trend', { container: screen.getByTestId('report-card', { name: /Total Bookings/i }) })).toHaveTextContent(/0% from last month/i);
      expect(screen.getByTestId('report-card-icon', { container: screen.getByTestId('report-card', { name: /Total Bookings/i }) })).toHaveTextContent('calendar-check');

      expect(screen.getByTestId('report-card', { name: /Active Maintenance/i })).toBeInTheDocument();
      expect(screen.getByTestId('report-card-value', { container: screen.getByTestId('report-card', { name: /Active Maintenance/i }) })).toHaveTextContent('2');
      expect(screen.getByTestId('report-card-trend', { container: screen.getByTestId('report-card', { name: /Active Maintenance/i }) })).toHaveTextContent('1 urgent issues');
      expect(screen.getByTestId('report-card-icon', { container: screen.getByTestId('report-card', { name: /Active Maintenance/i }) })).toHaveTextContent('tools');
    });
  });

  test('applies correct trend color for booking trend', async () => {
    // Mock a positive booking trend
    getDocs.mockImplementationOnce(() => Promise.resolve({
      docs: [
        { id: '1', data: () => ({ bookings: [{ bookedAt: new Date().toISOString() }, { bookedAt: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString() }], has_subfacilities: false }) }
      ]
    }));
    render(<Analytics />);
    await act(async () => {
      await jest.runAllTimers();
    });
    await waitFor(() => {
      expect(screen.getByTestId('report-card-trend', { container: screen.getByTestId('report-card', { name: /Total Bookings/i }) })).toHaveClass('text-success');
    });

    // Mock a negative booking trend
    jest.clearAllMocks();
    getDocs.mockImplementationOnce(() => Promise.resolve({
      docs: [
        { id: '1', data: () => ({ bookings: [{ bookedAt: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString() }, { bookedAt: new Date().toISOString() }], has_subfacilities: false }) }
      ]
    }));
    render(<Analytics />);
    await act(async () => {
      await jest.runAllTimers();
    });
    await waitFor(() => {
      expect(screen.getByTestId('report-card-trend', { container: screen.getByTestId('report-card', { name: /Total Bookings/i }) })).toHaveClass('text-danger');
    });
  });

  test('sets body class to "loaded" on mount', () => {
    render(<Analytics />);
    expect(document.body.classList.contains('loaded')).toBe(true);
  });

  test('clears animation timeouts on unmount', () => {
    const component = render(<Analytics />);
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout');

    component.unmount();

    expect(mockClearTimeout).toHaveBeenCalledTimes(3);
  });

  test('makes cards visible after animation timeout', async () => {
    render(<Analytics />);
    const cardsGrid = screen.getByTestId('report-card').parentElement;
    expect(cardsGrid).not.toHaveClass('cards-visible');

    act(() => {
      jest.advanceTimersByTime("Facility Reports Dashboard".length * 50 + 600);
    });

    await waitFor(() => {
      expect(cardsGrid).toHaveClass('cards-visible');
    });
  });

  test('makes charts visible after animation timeout', async () => {
    render(<Analytics />);
    const usageChart = screen.getByTestId('usage-chart');
    const maintenanceChart = screen.getByTestId('maintenance-chart');
    const peakHoursChart = screen.getByTestId('peak-hours-chart');

    expect(usageChart.parentElement).not.toHaveClass('visible');
    expect(maintenanceChart.parentElement).not.toHaveClass('visible');
    expect(peakHoursChart.parentElement).not.toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime("Facility Reports Dashboard".length * 50 + 900);
    });

    await waitFor(() => {
      expect(usageChart.parentElement).toHaveClass('visible');
      expect(maintenanceChart.parentElement).toHaveClass('visible');
      expect(peakHoursChart.parentElement).toHaveClass('visible');
    });
  });
});