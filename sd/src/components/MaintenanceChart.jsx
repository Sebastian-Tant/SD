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
  getDoc, 
  orderBy, 
  doc,
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
      if (loadingStates.facilities) return; // Don't fetch if facilities are still loading

      setLoadingStates(prev => ({ ...prev, reports: true }));
      setError(null);
      
      try {
        let q;
        if (selectedFacility === 'All Facilities') {
          q = query(
            collection(db, 'reports'),
            orderBy('timestamp', 'desc')
            // limit(100) // Consider limiting if dataset is very large for "All"
          );
        } else {
          q = query(
            collection(db, 'reports'),
            where('facilityId', '==', selectedFacility),
            orderBy('timestamp', 'desc')
            // limit(50)
          );
        }

        const querySnapshot = await getDocs(q);
        
        const reportsData = await Promise.all(
          querySnapshot.docs.map(async (reportDoc) => {
            const data = reportDoc.data();
            let facilityName = 'N/A';
            
            if (selectedFacility === 'All Facilities' && data.facilityId) {
              try {
                const facilityDocRef = doc(db, 'facilities', data.facilityId);
                const facilitySnap = await getDoc(facilityDocRef);
                facilityName = facilitySnap.exists() ? facilitySnap.data().name : `ID: ${data.facilityId}`;
              } catch (err) {
                console.error(`Error fetching facility name for ID ${data.facilityId}:`, err);
                facilityName = `ID: ${data.facilityId}`;
              }
            }

            return {
              id: reportDoc.id,
              ...data,
              facilityName,
              timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp) // Ensure it's a Date object
            };
          })
        );

        setDisplayedReports(reportsData.slice(0, 5)); // Show top 5 recent
        updateChartData(reportsData, currentTheme); // Pass currentTheme here

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
      // Temporarily set light theme for PDF for consistent white background
      const originalTheme = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      // Force chart to re-render with light theme colors
      if (chartRef.current) {
          chartRef.current.options.plugins.legend.labels.color = getChartColors('light').legendColor;
          chartRef.current.options.plugins.title.color = getChartColors('light').titleColor;
          chartRef.current.update();
      }
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for DOM update

      const canvas = await html2canvas(chartSectionRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff', // Explicitly white for PDF
        logging: true,
        onclone: (document) => { // Ensure all styles are applied in the cloned document
            // This is where you might re-apply styles if html2canvas has issues with CSS vars
        }
      });

      // Restore original theme
      document.documentElement.setAttribute('data-theme', originalTheme);
      if (chartRef.current) {
          chartRef.current.options.plugins.legend.labels.color = getChartColors(originalTheme).legendColor;
          chartRef.current.options.plugins.title.color = getChartColors(originalTheme).titleColor;
          chartRef.current.update();
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 2 * margin);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin; // Negative for next page
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 2 * margin);
      }
      
      const facilityNameForFile = selectedFacility === 'All Facilities' ? 'All_Facilities' : facilities.find(f => f.id === selectedFacility)?.name.replace(/\s+/g, '_') || selectedFacility;
      pdf.save(`Maintenance_Reports_${facilityNameForFile}.pdf`);

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to export PDF. Try again.');
      // Ensure theme is restored on error too
      const originalTheme = document.documentElement.getAttribute('data-theme') || 'light'; // Get current if changed
      document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || originalTheme);
       if (chartRef.current) {
          chartRef.current.options.plugins.legend.labels.color = getChartColors(localStorage.getItem('theme') || originalTheme).legendColor;
          chartRef.current.options.plugins.title.color = getChartColors(localStorage.getItem('theme') || originalTheme).titleColor;
          chartRef.current.update();
      }
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