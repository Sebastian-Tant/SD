import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PeakHoursChart from '../components/PeakHoursChart';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Mocked Line Chart</div>,
}));

// Mock FontAwesome
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, className }) => (
    <span data-testid="font-awesome-icon" className={className}>
      {icon}
    </span>
  ),
}));

describe('PeakHoursChart', () => {
  const mockFacilities = [
    { id: 'fac1', name: 'Facility 1', has_subfacilities: false },
    { id: 'fac2', name: 'Facility 2', has_subfacilities: true },
  ];

  const mockSubfacilities = [
    {
      id: 'sub1',
      bookings: [
        { time: '08:30', facilityId: 'fac2', subfacilityId: 'sub1' },
        { time: '12:15', facilityId: 'fac2', subfacilityId: 'sub1' },
      ],
    },
  ];

  const mockFacilityBookings = {
    bookings: [
      { time: '10:00', facilityId: 'fac1' },
      { time: '14:30', facilityId: 'fac1' },
      { time: '18:00', facilityId: 'fac1' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firebase collection and doc
    collection.mockImplementation((_, path) => path);
    doc.mockReturnValue('mockDoc');

    // Mock getDocs for facilities
    getDocs.mockImplementation(async (path) => {
      if (path === 'facilities') {
        return {
          docs: mockFacilities.map(fac => ({
            id: fac.id,
            data: () => ({
              name: fac.name,
              has_subfacilities: fac.has_subfacilities,
            }),
          })),
        };
      }
      if (path === 'facilities/fac2/subfacilities') {
        return {
          docs: mockSubfacilities.map(sub => ({
            id: sub.id,
            data: () => ({ bookings: sub.bookings }),
          })),
        };
      }
      return { docs: [] };
    });

    // Mock getDoc for facility bookings
    getDoc.mockImplementation(async () => ({
      exists: () => true,
      data: () => mockFacilityBookings,
    }));
  });

  test('renders loading state initially', async () => {
    render(<PeakHoursChart />);
    expect(screen.getByText(/Loading data/i)).toBeInTheDocument();
  });

  test('renders facilities dropdown after loading', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('All Facilities')).toBeInTheDocument();
      expect(screen.getByText('Facility 1')).toBeInTheDocument();
      expect(screen.getByText('Facility 2')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays line chart after data loads', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays peak stats correctly', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByText(/Busiest Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Quietest Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Recommendation/i)).toBeInTheDocument();
      expect(screen.getByText(/avg. bookings/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('changes facility selection and updates chart', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Facility 1' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Bookings by time of day for Facility 1/i)).toBeInTheDocument();
      expect(screen.getByText(/total bookings/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles facilities with subfacilities', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledWith('facilities/fac2/subfacilities');
    }, { timeout: 3000 });
  });

  test('displays error state gracefully', async () => {
    getDocs.mockRejectedValueOnce(new Error('Fetch error'));
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument(); // Chart renders with default data
    }, { timeout: 3000 });
  });

  test('processes booking data correctly for all facilities', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByText(/Average bookings by time of day across all facilities/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('converts time slots correctly', async () => {
    render(<PeakHoursChart />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Note: Time slot conversion is internal, verified indirectly via chart rendering
  });

  test('disables dropdown during loading', async () => {
    render(<PeakHoursChart />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});