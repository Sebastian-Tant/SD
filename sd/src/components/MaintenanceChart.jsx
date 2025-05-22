import React from "react";
import { useState, useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  orderBy, 
  doc 
} from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './css-files/Chart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MaintenanceChart() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [displayedReports, setDisplayedReports] = useState([]);

  const [loadingStates, setLoadingStates] = useState({
    facilities: true,
    reports: false,
    pdf: false
  });
  const [error, setError] = useState(null);
  const chartSectionRef = useRef(null);
  const chartRef = useRef(null);

  const [chartData, setChartData] = useState({
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      borderWidth: 1
    }]
  });

  // Fetch facilities on component mount
  useEffect(() => {
    const fetchFacilities = async () => {
      setLoadingStates(prev => ({ ...prev, facilities: true }));
      try {
        const querySnapshot = await getDocs(collection(db, 'facilities'));
        const facilitiesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `Facility ${doc.id}`,
          ...doc.data()
        }));
        setFacilities(facilitiesList);
      } catch (err) {
        console.error('Error fetching facilities:', err);
        setError('Failed to load facilities');
      } finally {
        setLoadingStates(prev => ({ ...prev, facilities: false }));
      }
    };

    fetchFacilities();
  }, []);

  // Fetch reports when facility selection changes
  useEffect(() => {
    const fetchReports = async () => {
      setLoadingStates(prev => ({ ...prev, reports: true }));
      setError(null);
      
      try {
        let q;
        if (selectedFacility === 'All Facilities') {
          q = query(
            collection(db, 'reports'),
            orderBy('timestamp', 'desc')
          );
        } else {
          q = query(
            collection(db, 'reports'),
            where('facilityId', '==', selectedFacility),
            orderBy('timestamp', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        
        // Process reports with facility names
        const reportsData = await Promise.all(
          querySnapshot.docs.map(async (docItem) => {
            const data = docItem.data();
            let facilityName = '';
            
            if (selectedFacility === 'All Facilities') {
              try {
                const facilityRef = doc(db, 'facilities', data.facilityId);
                const facilitySnap = await getDoc(facilityRef);
                facilityName = facilitySnap.exists() ? facilitySnap.data().name : `Facility ${data.facilityId}`;
              } catch (err) {
                console.error('Error fetching facility name:', err);
                facilityName = `Facility ${data.facilityId}`;
              }
            }

            return {
              id: docItem.id,
              ...data,
              facilityName,
              timestamp: data.timestamp?.toDate?.() || data.timestamp
            };
          })
        );

        setDisplayedReports(reportsData.slice(0, 3));

        updateChartData(reportsData);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports: ' + err.message);
      } finally {
        setLoadingStates(prev => ({ ...prev, reports: false }));
      }
    };

    if (!loadingStates.facilities) {
      fetchReports();
    }
  }, [selectedFacility, loadingStates.facilities]);

  // Update chart data based on ALL reports
  const updateChartData = (reportsData) => {
    if (!reportsData || reportsData.length === 0) {
      setChartData({
        labels: ['No reports'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(16, 185, 129, 0.8)'],
          borderColor: ['rgba(16, 185, 129, 1)'],
          borderWidth: 1,
          hoverBackgroundColor: ['rgba(16, 185, 129, 0.8)']
        }]
      });
      return;
    }

    const statusCounts = reportsData.reduce((acc, report) => {
      if (!report.status) return acc;
      
      const normalizedStatus = report.status.toString().toLowerCase().trim();
      
      if (normalizedStatus.includes('progress')) {
        acc.inProgress++;
      } else if (normalizedStatus.includes('pending')) {
        acc.pending++;
      } else if (normalizedStatus.includes('resolve')) {
        acc.resolved++;
      }
      return acc;
    }, { pending: 0, inProgress: 0, resolved: 0 });

    setChartData({
      labels: ['Pending', 'In Progress', 'Resolved'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.inProgress, statusCounts.resolved],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 1
      }]
    });
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Date not available';
    
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const getStatusClass = (status) => {
    const normalizedStatus = status?.toLowerCase()?.trim();
    if (normalizedStatus === 'pending') return 'ticket-status urgent';
    if (normalizedStatus === 'in progress') return 'ticket-status in-progress';
    if (normalizedStatus === 'resolved') return 'ticket-status resolved';
    return 'ticket-status';
  };

  const getStatusText = (status) => {
    const normalizedStatus = status?.toLowerCase()?.trim();
    if (normalizedStatus === 'pending') return 'Pending';
    if (normalizedStatus === 'in progress') return 'In Progress';
    if (normalizedStatus === 'resolved') return 'Resolved';
    return status || 'Unknown';
  };

  // Export UI to PDF
  const exportToPDF = async () => {
    if (!chartSectionRef.current) return;

    try {
      setLoadingStates(prev => ({ ...prev, pdf: true }));

      // Wait for any pending renders
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(chartSectionRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
      });

      const imgWidth = 190; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Maintenance_Reports_${selectedFacility === 'All Facilities' ? 'All_Facilities' : selectedFacility}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to export PDF');
    } finally {
      setLoadingStates(prev => ({ ...prev, pdf: false }));
    }
  };

  return (
    <section className="chart-section" ref={chartSectionRef}>
      <div className="chart-header">
        <div>
          <h2>Maintenance Reports</h2>
          <p>Current status of reported facility issues</p>
        </div>
        <select 
          className="chart-select"
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          disabled={loadingStates.facilities}
        >
          <option value="All Facilities">All Facilities</option>
          {facilities.map(facility => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      
      {loadingStates.reports && (
        <div className="loading-message">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
          Loading reports...
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      
      <div className="maintenance-grid">
        <div className="chart-container">
          <Doughnut 
            ref={chartRef} 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: '#333',
                    font: {
                      size: 12
                    }
                  }
                },
                tooltip: {
                  enabled: true,
                },
              },
            }} 
          />
        </div>
        
        <div className="tickets-list">
          <h3 className="tickets-title">
            {selectedFacility === 'All Facilities'
              ? 'Recent Maintenance Tickets (All Facilities)'
              : 'Recent Maintenance Tickets'}
          </h3>
          
          {displayedReports.length === 0 ? (
            <div className="no-reports">
              {loadingStates.reports ? 'Loading...' : 'No maintenance reports found'}
            </div>
          ) : (
            displayedReports.map(report => (
              <div key={report.id} className="ticket-item">
                <div className="ticket-content">
                  <p className="ticket-title">
                    {selectedFacility === 'All Facilities' && report.facilityName 
                      ? `${report.facilityName}: ${report.issue}`
                      : report.issue || 'No issue description'}
                  </p>
                  <p className="ticket-date">
                    Reported on {formatTimestamp(report.timestamp)}
                  </p>
                </div>
                <span className={getStatusClass(report.status)}>
                  {getStatusText(report.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="chart-footer">
        <button 
          className="button export-btn" 
          onClick={exportToPDF} 
          disabled={loadingStates.pdf || loadingStates.reports}
        >
          {loadingStates.pdf ? (
            <span className="button__text">Generating PDF...</span>
          ) : (
            <>
              <span className="button__text">Export as PDF</span>
              <span className="button__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35">
                  <path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z"></path>
                  <path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z"></path>
                  <path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z"></path>
                </svg>
              </span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}