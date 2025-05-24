import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MaintenanceChart from '../components/MaintenanceChart';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc,
  getDoc 
} from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Mock Firebase
jest.mock('../firebase', () => ({
    db: {},
  }));
  
  jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    orderBy: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
  }));
  
  // Mock Chart.js
  jest.mock('react-chartjs-2', () => ({
    Doughnut: () => <div data-testid="doughnut-chart">Mocked Doughnut Chart</div>,
  }));
  
  // Mock FontAwesome
  jest.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: ({ icon, spin, className }) => (
      <span data-testid="font-awesome-icon" className={className} data-spin={spin}>
        {icon.name}
      </span>
    ),
  }));
  
  // Mock html2canvas and jsPDF
  jest.mock('html2canvas', () => jest.fn());
  jest.mock('jspdf', () => {
    const mockJsPDF = jest.fn(() => ({
      addImage: jest.fn(),
      save: jest.fn(),
    }));
    return mockJsPDF;
  });
  
  describe('MaintenanceChart', () => {
    const mockFacilities = [
      { id: 'fac1', name: 'Facility 1' },
      { id: 'fac2', name: 'Facility 2' },
    ];
  
    const mockReports = [
      {
        id: 'rep1',
        facilityId: 'fac1',
        issue: 'Broken pipe',
        status: 'pending',
        timestamp: { toDate: () => new Date('2023-01-01') },
      },
      {
        id: 'rep2',
        facilityId: 'fac1',
        issue: 'Electrical issue',
        status: 'in progress',
        timestamp: { toDate: () => new Date('2023-01-02') },
      },
      {
        id: 'rep3',
        facilityId: 'fac1',
        issue: 'HVAC failure',
        status: 'resolved',
        timestamp: { toDate: () => new Date('2023-01-03') },
      },
    ];
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      // Mock Firebase collection and query
      collection.mockReturnValue('mockCollection');
      query.mockReturnValue('mockQuery');
      where.mockReturnValue('mockWhere');
      orderBy.mockReturnValue('mockOrderBy');
      doc.mockReturnValue('mockDoc');
  
      // Mock getDocs for facilities
      getDocs.mockImplementation(async (q) => {
        if (q === 'mockCollection' || q === 'mockQuery') {
          return {
            docs: mockFacilities.map(fac => ({
              id: fac.id,
              data: () => ({ name: fac.name }),
            })),
          };
        }
        return {
          docs: mockReports.map(rep => ({
            id: rep.id,
            data: () => ({
              facilityId: rep.facilityId,
              issue: rep.issue,
              status: rep.status,
              timestamp: rep.timestamp,
            }),
          })),
        };
      });
  
      // Mock getDoc for facility name
      getDoc.mockImplementation(async () => ({
        exists: () => true,
        data: () => ({ name: 'Facility 1' }),
      }));
  
      // Mock html2canvas
      html2canvas.mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('mockImageData'),
      });
  
      // Mock jsPDF
      jsPDF.mockReturnValue({
        addImage: jest.fn(),
        save: jest.fn(),
      });
    });
  
    test('renders facilities dropdown after loading', async () => {
      render(<MaintenanceChart />);
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByText('All Facilities')).toBeInTheDocument();
        expect(screen.getByText('Facility 1')).toBeInTheDocument();
        expect(screen.getByText('Facility 2')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  
    test('displays chart with correct data', async () => {
      render(<MaintenanceChart />);
      await waitFor(() => {
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      });
    });
  
   
    test('changes facility selection and fetches reports', async () => {
      render(<MaintenanceChart />);
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
  
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'fac1' },
      });
  
      await waitFor(() => {
        expect(query).toHaveBeenCalledWith(
          'mockCollection',
          expect.anything(), // where clause
          expect.anything()  // orderBy clause
        );
        expect(where).toHaveBeenCalledWith('facilityId', '==', 'fac1');
      }, { timeout: 2000 });
    });
  
   
  
  });