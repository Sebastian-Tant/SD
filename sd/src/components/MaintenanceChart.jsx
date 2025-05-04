import { useState, useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './css-files/Chart.css';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function MaintenanceChart() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChartVisible, setIsChartVisible] = useState(false); // Control chart visibility
  const chartSectionRef = useRef(null); // Ref to capture the UI section
  const chartRef = useRef(null); // Ref to the Doughnut chart
  const [chartData, setChartData] = useState({
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)', // Red for pending
        'rgba(245, 158, 11, 0.8)', // Yellow for in progress
        'rgba(16, 185, 129, 0.8)'  // Green for resolved
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      borderWidth: 1
    }]
  });

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  // Fetch facilities on component mount
  useEffect(() => {
    const fetchFacilities = async () => {
      setLoading(true);
      try {
        const facilitiesRef = collection(db, 'facilities');
        const querySnapshot = await getDocs(facilitiesRef);
        
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
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  // Fetch reports when facility selection changes
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let q;
        if (selectedFacility === 'All Facilities') {
          q = query(collection(db, 'reports'), limit(3));
        } else {
          q = query(
            collection(db, 'reports'),
            where('facilityId', '==', selectedFacility),
            limit(3)
          );
        }

        const querySnapshot = await getDocs(q);
        const reportsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
        }));

        setReports(reportsData);
        updateChartData(reportsData);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedFacility]);

  // Make chart visible after data is loaded
  useEffect(() => {
    if (!loading && chartData) {
      setIsChartVisible(true);
    }
  }, [loading, chartData]);

  // Update chart data based on reports
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

  // Get CSS class for status badge
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'ticket-status urgent';
      case 'in progress': return 'ticket-status in-progress';
      case 'resolved': return 'ticket-status resolved';
      default: return 'ticket-status';
    }
  };

  // Get display text for status
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      default: return status || 'Unknown';
    }
  };

  // Export UI to PDF
  const exportToPDF = async () => {
    if (!chartSectionRef.current || !chartRef.current) return;

    try {
      setLoading(true);

      // Ensure chart is visible
      setIsChartVisible(true);

      // Force chart re-render
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.render();
      }

      // Wait for chart to render (increased delay for animations)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(chartSectionRef.current, {
        scale: 2, // Increase resolution
        useCORS: true, // Handle cross-origin images
        backgroundColor: '#1f2937', // Solid dark background for PDF
        windowWidth: chartSectionRef.current.scrollWidth, // Full width capture
        logging: true, // Debug logs
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth * 0.9, pdfHeight / imgHeight * 0.9); // Add margin
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      pdf.addImage(imgData, 'PNG', 10, 10, imgScaledWidth, imgScaledHeight); // Add padding
      pdf.save(`Maintenance_Reports_${selectedFacility || ' tweak All_Facilities'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to export PDF');
    } finally {
      setLoading(false);
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
          disabled={loading}
        >
          <option value="All Facilities">All Facilities</option>
          {facilities.map(facility => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      
      {loading && <div className="loading-message">Loading reports...</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="maintenance-grid">
        <div className={`chart-container ${isChartVisible ? 'visible' : ''}`}>
          <Doughnut ref={chartRef} data={chartData} options={options} />
        </div>
        
        <div className="tickets-list">
          <h3 className="tickets-title">Recent Maintenance Tickets</h3>
          
          {reports.length === 0 ? (
            <div className="no-reports">
              <p>There are no maintenance reports for this facility</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="ticket-item">
                <div className="ticket-content">
                  <p className="ticket-title">{report.issue || 'No issue description'}</p>
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
        <button className="export-btn" onClick={exportToPDF} disabled={loading}>
          <FontAwesomeIcon icon={faDownload} className="mr-2" />
          Export as PDF
        </button>
      </div>
    </section>
  );
}