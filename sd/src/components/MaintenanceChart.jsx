import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,  
  orderBy, 
  limit
} from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './css-files/Chart.css'; // Ensure this path is correct

ChartJS.register(ArcElement, Tooltip, Legend, Title);

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
  const chartRef = useRef(null); // To access the chart instance

  // State to hold current theme for Chart.js options
  const [currentTheme, setCurrentTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  // Effect to listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme'));
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const getChartColors = useCallback((theme) => {
    if (theme === 'dark') {
      return {
        pendingBg: 'rgba(248, 113, 113, 0.7)', // red-400
        pendingBorder: 'rgba(248, 113, 113, 1)',
        inProgressBg: 'rgba(251, 191, 36, 0.7)', // amber-400
        inProgressBorder: 'rgba(251, 191, 36, 1)',
        resolvedBg: 'rgba(52, 211, 153, 0.7)', // green-400
        resolvedBorder: 'rgba(52, 211, 153, 1)',
        noReportsBg: 'rgba(52, 211, 153, 0.7)',
        noReportsBorder: 'rgba(52, 211, 153, 1)',
        legendColor: '#e5e7eb', // gray-200
        titleColor: '#e5e7eb',
        tooltipTitleColor: '#111827', // gray-900
        tooltipBodyColor: '#374151', // gray-700
        tooltipBgColor: 'rgba(229, 231, 235, 0.95)', // gray-200 with opacity
      };
    }
    // Light theme colors (default)
    return {
      pendingBg: 'rgba(239, 68, 68, 0.7)', // red-500
      pendingBorder: 'rgba(239, 68, 68, 1)',
      inProgressBg: 'rgba(245, 158, 11, 0.7)', // amber-500
      inProgressBorder: 'rgba(245, 158, 11, 1)',
      resolvedBg: 'rgba(16, 185, 129, 0.7)', // green-500
      resolvedBorder: 'rgba(16, 185, 129, 1)',
      noReportsBg: 'rgba(16, 185, 129, 0.7)',
      noReportsBorder: 'rgba(16, 185, 129, 1)',
      legendColor: '#374151', // gray-700
      titleColor: '#1f2937', // gray-800
      tooltipTitleColor: '#ffffff',
      tooltipBodyColor: '#e5e7eb', // gray-200
      tooltipBgColor: 'rgba(31, 41, 55, 0.95)', // gray-800 with opacity
    };
  }, []);

  const updateChartData = useCallback((reportsData, theme) => {
    const colors = getChartColors(theme);

    if (!reportsData || reportsData.length === 0) {
      setChartData({
        labels: ['No reports'],
        datasets: [{
          data: [1],
          backgroundColor: [colors.noReportsBg],
          borderColor: [colors.noReportsBorder],
          borderWidth: 1,
          hoverBackgroundColor: [colors.noReportsBg],
          hoverOffset: 0,
          borderRadius: 0,
        }]
      });
      return;
    }

    const statusCounts = reportsData.reduce((acc, report) => {
      if (!report.status) return acc;
      const normalizedStatus = String(report.status).toLowerCase().trim();
      
      if (normalizedStatus.includes('progress')) acc.inProgress++;
      else if (normalizedStatus.includes('pending') || normalizedStatus.includes('open')) acc.pending++; // Include 'open' as pending
      else if (normalizedStatus.includes('resolve') || normalizedStatus.includes('closed')) acc.resolved++; // Include 'closed' as resolved
      else acc.other++; // Count other statuses if any
      return acc;
    }, { pending: 0, inProgress: 0, resolved: 0, other: 0 });
    
    const labels = ['Pending', 'In Progress', 'Resolved'];
    const data = [statusCounts.pending, statusCounts.inProgress, statusCounts.resolved];
    const backgroundColors = [colors.pendingBg, colors.inProgressBg, colors.resolvedBg];
    const borderColors = [colors.pendingBorder, colors.inProgressBorder, colors.resolvedBorder];

    if (statusCounts.other > 0) {
      labels.push('Other');
      data.push(statusCounts.other);
      // Add colors for 'Other' if you want to display it, or group into an existing category
      backgroundColors.push('rgba(156, 163, 175, 0.7)'); // gray-400
      borderColors.push('rgba(156, 163, 175, 1)');
    }

    setChartData({
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5, // Slightly thicker border
        hoverOffset: 10,
        borderRadius: 6,
      }]
    });
  }, [getChartColors]);

  const [chartData, setChartData] = useState({
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 1,
      hoverOffset: 8, // Makes segment pop out more on hover
      borderRadius: 5, // Slightly rounded corners for segments
    }]
  });

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
        setError('Failed to load facilities.');
      } finally {
        setLoadingStates(prev => ({ ...prev, facilities: false }));
      }
    };
    fetchFacilities();
  }, []);

useEffect(() => {
  const fetchReports = async () => {
    if (loadingStates.facilities) return;

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
          orderBy('timestamp', 'desc'),
          limit(5) // Only get 5 for individual facilities
        );
      }

      const querySnapshot = await getDocs(q);
      
      const reportsData = querySnapshot.docs.map((reportDoc) => {
        const data = reportDoc.data();
        return {
          id: reportDoc.id,
          ...data,
          facilityName: data.facilityName || `Facility ${data.facilityId || 'N/A'}`,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
        };
      });

      // For "All Facilities", use all reports for the chart but only show 5 most recent
      if (selectedFacility === 'All Facilities') {
        setDisplayedReports(reportsData.slice(0, 5));
        updateChartData(reportsData, currentTheme);
      } else {
        // For individual facilities, we already limited to 5
        setDisplayedReports(reportsData);
        updateChartData(reportsData, currentTheme);
      }

    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, reports: false }));
    }
  };

  fetchReports();
}, [selectedFacility, loadingStates.facilities, currentTheme, updateChartData]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Date N/A';
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString(undefined, { // Use browser's locale
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return 'Date Error';
    }
  };

  const getStatusClass = (status) => {
    const normalizedStatus = String(status || '').toLowerCase().trim();
    if (normalizedStatus.includes('pending') || normalizedStatus.includes('open')) return 'ticket-status urgent';
    if (normalizedStatus.includes('progress')) return 'ticket-status in-progress';
    if (normalizedStatus.includes('resolve') || normalizedStatus.includes('closed')) return 'ticket-status resolved';
    return 'ticket-status unknown';
  };

  const getStatusText = (status) => {
    const normalizedStatus = String(status || '').toLowerCase().trim();
    if (normalizedStatus.includes('pending') || normalizedStatus.includes('open')) return 'Pending';
    if (normalizedStatus.includes('progress')) return 'In Progress';
    if (normalizedStatus.includes('resolve') || normalizedStatus.includes('closed')) return 'Resolved';
    return status || 'Unknown';
  };

const exportToPDF = async () => {
  if (!chartSectionRef.current) return;
  setLoadingStates(prev => ({ ...prev, pdf: true }));
  setError(null);

  try {
    // Store original theme and colors
    const originalTheme = document.documentElement.getAttribute('data-theme');
    const originalColors = getChartColors(originalTheme);
    
    // Force light theme for PDF export
    document.documentElement.setAttribute('data-theme', 'light');
    
    // Get light theme colors explicitly (don't rely on currentTheme state)
    const lightColors = getChartColors('light');
    
    // Apply enhanced contrast colors for PDF export
    const pdfColors = {
      ...lightColors,
      // Enhance contrast for PDF
      pendingBg: 'rgba(239, 68, 68, 0.85)',       // Darker red
      inProgressBg: 'rgba(245, 158, 11, 0.85)',   // Darker amber
      resolvedBg: 'rgba(16, 185, 129, 0.85)',     // Darker green
      pendingBorder: 'rgba(239, 68, 68, 1)',
      inProgressBorder: 'rgba(245, 158, 11, 1)',
      resolvedBorder: 'rgba(16, 185, 129, 1)',
      tooltipBgColor: 'rgba(255, 255, 255, 0.98)', // Near-white
      tooltipTitleColor: '#111827',                // Dark gray
      tooltipBodyColor: '#374151'                  // Medium gray
    };

    // Update chart with enhanced PDF colors
    if (chartRef.current) {
      chartRef.current.options.plugins.legend.labels.color = pdfColors.legendColor;
      chartRef.current.options.plugins.title.color = pdfColors.titleColor;
      
      // Directly update dataset colors for better PDF visibility
      chartRef.current.data.datasets[0].backgroundColor = [
        pdfColors.pendingBg,
        pdfColors.inProgressBg,
        pdfColors.resolvedBg
      ];
      chartRef.current.data.datasets[0].borderColor = [
        pdfColors.pendingBorder,
        pdfColors.inProgressBorder,
        pdfColors.resolvedBorder
      ];
      
      chartRef.current.update();
    }

    // Wait for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture with enhanced settings
    const canvas = await html2canvas(chartSectionRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: true,
      // Enhance PDF quality
      quality: 1,
      removeContainer: true,
      allowTaint: true,
      // Improve text rendering
      letterRendering: true,
      // Force better color contrast
      onclone: (clonedDoc) => {
        // Ensure all text is dark for PDF
        clonedDoc.querySelectorAll('*').forEach(el => {
          if (window.getComputedStyle(el).color.includes('rgb(229, 231, 235)')) {
            el.style.color = '#374151'; // Force dark gray text
          }
        });
      }
    });

    // Restore original theme and colors immediately
    document.documentElement.setAttribute('data-theme', originalTheme);
    if (chartRef.current) {
      chartRef.current.options.plugins.legend.labels.color = originalColors.legendColor;
      chartRef.current.options.plugins.title.color = originalColors.titleColor;
      
      // Restore original dataset colors
      chartRef.current.data.datasets[0].backgroundColor = chartData.datasets[0].backgroundColor;
      chartRef.current.data.datasets[0].borderColor = chartData.datasets[0].borderColor;
      
      chartRef.current.update();
    }

    // Create PDF with enhanced quality
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pdfWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgWidth, imgHeight);
    
    const facilityNameForFile = selectedFacility === 'All Facilities' 
      ? 'All_Facilities' 
      : facilities.find(f => f.id === selectedFacility)?.name.replace(/\s+/g, '_') || selectedFacility;
    pdf.save(`Maintenance_Reports_${facilityNameForFile}.pdf`);

  } catch (err) {
    console.error('Error generating PDF:', err);
    setError('Failed to export PDF. Try again.');
  } finally {
    setLoadingStates(prev => ({ ...prev, pdf: false }));
  }
};

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%', // Makes it a doughnut chart, adjust for thickness
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: getChartColors(currentTheme).legendColor,
          font: { size: 13, family: "'Inter', sans-serif" },
          padding: 20,
          usePointStyle: true, // Use a circle for legend items
          pointStyle: 'circle',
          boxWidth: 10, // Size of the color box
          boxHeight: 10,
        },
        onHover: (event, legendItem, legend) => {
          // Dim others on hover
          const ci = legend.chart;
          if (ci.isDatasetVisible(legendItem.datasetIndex)) {
            ci.data.datasets[legendItem.datasetIndex].backgroundColored = 
              ci.data.datasets[legendItem.datasetIndex].backgroundColor.map((color, index) => 
                index === legendItem.index || legendItem.index == null ? color : color.replace(/[\d]+\)$/g, '0.3)'));
            ci.update();
          }
        },
        onLeave: (event, legendItem, legend) => {
          // Restore colors
           updateChartData(displayedReports, currentTheme); // This will re-apply original colors
        }
      },
      title: { // Add a title to the chart itself
        display: true,
        text: `Maintenance Status: ${selectedFacility === 'All Facilities' ? 'All' : facilities.find(f => f.id === selectedFacility)?.name || ''}`,
        color: getChartColors(currentTheme).titleColor,
        font: { size: 16, weight: '600', family: "'Inter', sans-serif" },
        padding: { top: 5, bottom: 15 }
      },
      tooltip: {
        enabled: true,
        backgroundColor: getChartColors(currentTheme).tooltipBgColor,
        titleColor: getChartColors(currentTheme).tooltipTitleColor,
        bodyColor: getChartColors(currentTheme).tooltipBodyColor,
        titleFont: { size: 14, family: "'Inter', sans-serif", weight: 'bold' },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          }
        }
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    layout: {
        padding: { // Add padding around the chart
            left: 5,
            right: 5,
            top: 0,
            bottom: 5
        }
    }
  };

  return (
    <section className="maintenance-chart-section" ref={chartSectionRef}>
      <div className="maintenance-chart-header">
        <div className="maintenance-title-group">
          <h2>Maintenance Overview</h2>
          <p>Status of reported facility issues.</p>
        </div>
        <select 
          className="maintenance-chart-select"
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          disabled={loadingStates.facilities || loadingStates.reports}
          aria-label="Select Facility for Maintenance Reports"
        >
          <option value="All Facilities">All Facilities</option>
          {facilities.map(facility => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      
      {error && (
        <div className="maintenance-error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {error}
        </div>
      )}
      
      <div className="maintenance-content-grid">
        <div className={`maintenance-chart-container ${loadingStates.reports ? 'loading-opacity' : ''}`}>
          {loadingStates.reports && !chartData.datasets[0]?.data?.some(d => d > 0) && (
            <div className="maintenance-loading-message chart-loading">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
              <p>Loading Chart Data...</p>
            </div>
          )}
          {(chartData.datasets[0]?.data?.every(d => d === 0) && !loadingStates.reports && !error && displayedReports.length > 0) && (
             <div className="maintenance-no-data-message chart-no-data">
                <p>No data for current selection.</p>
             </div>
           )}
          <Doughnut 
            ref={chartRef}
            data={chartData} 
            options={chartOptions}
          />
        </div>
        
        <div className={`maintenance-tickets-list ${loadingStates.reports ? 'loading-opacity' : ''}`}>
          <h3 className="maintenance-tickets-title">
            Recent Tickets
            {selectedFacility !== 'All Facilities' && facilities.find(f => f.id === selectedFacility) 
              ? ` for ${facilities.find(f => f.id === selectedFacility).name}`
              : " (All Facilities)"}
          </h3>
          
          {loadingStates.reports && displayedReports.length === 0 && (
             <div className="maintenance-loading-message tickets-loading">
                <FontAwesomeIcon icon={faSpinner} spin /> Loading tickets...
             </div>
          )}
          {!loadingStates.reports && displayedReports.length === 0 && !error && (
            <div className="maintenance-no-reports">
              No maintenance tickets found for this selection.
            </div>
          )}
          {!loadingStates.reports && displayedReports.length > 0 && (
            <ul className="report-items-list">
              {displayedReports.map(report => (
                <li key={report.id} className="maintenance-ticket-item">
                  <div className="maintenance-ticket-content">
                    <p className="maintenance-ticket-issue-title">
                      {selectedFacility === 'All Facilities' && report.facilityName 
                        ? <><span className="facility-tag">{report.facilityName}</span>: {report.issue || 'Untitled Issue'}</>
                        : report.issue || 'Untitled Issue'}
                    </p>
                    <p className="maintenance-ticket-date">
                      {formatTimestamp(report.timestamp)}
                    </p>
                  </div>
                  <span className={getStatusClass(report.status)} aria-label={`Status: ${getStatusText(report.status)}`}>
                    {getStatusText(report.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="maintenance-chart-footer">
        <button 
          className="maintenance-export-btn" 
          onClick={exportToPDF} 
          disabled={loadingStates.pdf || loadingStates.reports || (chartData.datasets[0]?.data?.every(d => d === 0) && displayedReports.length === 0)}
          aria-label="Export maintenance report as PDF"
        >
          {loadingStates.pdf ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="icon-left" />
              Generating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faDownload} className="icon-left" />
              Export PDF
            </>
          )}
        </button>
      </div>
    </section>
  );
}