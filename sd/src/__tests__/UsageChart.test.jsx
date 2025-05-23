import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UsageChart from '../components/UsageChart';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Mock dependencies
jest.mock('firebase/firestore');
jest.mock('../firebase');
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span>Icon</span>
}));

jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Mock Chart</div>,
}));

describe('UsageChart Component', () => {
  const mockFacilitiesData = [
    {
      id: '1',
      data: () => ({
        name: 'Gym',
        bookings: [
          { bookedAt: new Date(Date.now() - 10 * 86400000).toISOString() }, // 10 days ago
          { bookedAt: new Date(Date.now() - 5 * 86400000).toISOString() },  // 5 days ago
          { bookedAt: 'invalid-date' } // Should be filtered out
        ],
        has_subfacilities: false
      })
    },
    {
      id: '2',
      data: () => ({
        name: 'Pool',
        bookings: [
          { bookedAt: new Date(Date.now() - 35 * 86400000).toISOString() }, // 35 days ago (should be excluded for 30 days)
        ],
        has_subfacilities: true
      })
    }
  ];

  const mockSubfacilitiesData = [
    {
      id: 'sub1',
      data: () => ({
        bookings: [
          { bookedAt: new Date(Date.now() - 15 * 86400000).toISOString() }, // 15 days ago
        ]
      })
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getDocs.mockImplementation((query) => {
      if (query.path.includes('subfacilities')) {
        return Promise.resolve(mockSubfacilitiesData);
      }
      return Promise.resolve(mockFacilitiesData);
    });
  });

  test('renders loading state initially', () => {
    render(<UsageChart />);
    expect(screen.getByText('Loading booking statistics...')).toBeInTheDocument();
  });

  test('fetches and displays data for default time range (30 days)', async () => {
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith(collection(db, 'facilities'));
      expect(screen.getByText('Booking statistics by facility for the last 30 days')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  test('changes time range when select is updated', async () => {
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(screen.getByText('Booking statistics by facility for the last 30 days')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } });
    
    await waitFor(() => {
      expect(screen.getByText('Booking statistics by facility for the last 7 days')).toBeInTheDocument();
    });
  });

  test('handles empty data state', async () => {
    getDocs.mockResolvedValueOnce([]);
    
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(screen.getByText('No booking data available')).toBeInTheDocument();
    });
  });

  test('shows alert when trying to export with no data', async () => {
    // Override mock to return empty data
    getDocs.mockResolvedValueOnce([]);
    window.alert = jest.fn();

    render(<UsageChart />);
    
    await waitFor(() => {
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export as CSV'));
    
    expect(window.alert).toHaveBeenCalledWith('No data to export');
  });
  
  test('filters bookings based on time range', async () => {
    render(<UsageChart />);
    
    // Initial load with 30 days range
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });

    // Change to 7 days range
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } });
    
    await waitFor(() => {
      // Should refetch data with new time range
      expect(getDocs).toHaveBeenCalledTimes(2); // Initial call + new time range
    });
  });

  test('includes subfacility bookings in count', async () => {
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith(collection(db, 'facilities'));
      // Should also call for subfacilities
      expect(getDocs).toHaveBeenCalledWith(expect.objectContaining({
        path: expect.stringContaining('subfacilities')
      }));
    });
  });

  test('handles error when fetching data', async () => {
    console.error = jest.fn(); // Suppress error logging
    getDocs.mockRejectedValueOnce(new Error('Failed to fetch'));
    
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error fetching booking data:', expect.any(Error));
      expect(screen.getByText('No booking data available')).toBeInTheDocument();
    });
  });

  test('does not show facilities with zero bookings', async () => {
    getDocs.mockResolvedValueOnce([
      {
        id: '1',
        data: () => ({
          name: 'Empty Facility',
          bookings: [],
          has_subfacilities: false
        })
      }
    ]);
    
    render(<UsageChart />);
    
    await waitFor(() => {
      expect(screen.getByText('No booking data available')).toBeInTheDocument();
    });
  });

});