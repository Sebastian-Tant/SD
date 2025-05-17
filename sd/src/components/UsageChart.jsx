import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './css-files/Chart.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UsageChart() {
  const [timeRange, setTimeRange] = useState('30');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportData, setExportData] = useState([]);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
        const facilitiesData = [];
        
        // Process each facility
        for (const facilityDoc of facilitiesSnapshot.docs) {
          const facility = facilityDoc.data();
          let bookingCount = 0;
          
          // Count bookings in the facility itself
          if (facility.bookings && Array.isArray(facility.bookings)) {
            bookingCount += countBookingsInTimeRange(facility.bookings, timeRange);
          }
          
          // If has subfacilities, count bookings in each subfacility
          if (facility.has_subfacilities) {
            const subfacilitiesRef = collection(db, `facilities/${facilityDoc.id}/subfacilities`);
            const subfacilitiesSnapshot = await getDocs(subfacilitiesRef);
            
            for (const subfacilityDoc of subfacilitiesSnapshot.docs) {
              const subfacility = subfacilityDoc.data();
              if (subfacility.bookings && Array.isArray(subfacility.bookings)) {
                bookingCount += countBookingsInTimeRange(subfacility.bookings, timeRange);
              }
            }
          }
          
          if (bookingCount > 0) {
            facilitiesData.push({
              name: facility.name,
              count: bookingCount
            });
          }
        }
        
        // Sort all facilities by booking count for export
        const sortedFacilities = facilitiesData.sort((a, b) => b.count - a.count);
        setExportData(sortedFacilities);
        
        // Take top 5 for the chart
        const topFacilities = sortedFacilities.slice(0, 5);
        
        // Prepare chart data
        const labels = topFacilities.map(f => f.name);
        const data = topFacilities.map(f => f.count);
        
        setChartData({
          labels,
          datasets: [{
            label: 'Bookings',
            data,
            backgroundColor: [
              'rgba(79, 70, 229, 0.8)',
              'rgba(99, 102, 241, 0.8)',
              'rgba(129, 140, 248, 0.8)',
              'rgba(165, 180, 252, 0.8)',
              'rgba(199, 210, 254, 0.8)'
            ],
            borderColor: [
              'rgba(79, 70, 229, 1)',
              'rgba(99, 102, 241, 1)',
              'rgba(129, 140, 248, 1)',
              'rgba(165, 180, 252, 1)',
              'rgba(199, 210, 254, 1)'
            ],
            borderWidth: 1,
            borderRadius: 4
          }]
        });
        
      } catch (error) {
        console.error('Error fetching booking data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingData();
  }, [timeRange]);

  // Function to count bookings within the selected time range
  const countBookingsInTimeRange = (bookings, days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    return bookings.filter(booking => {
      if (!booking.bookedAt) return false;
      const bookedAt = new Date(booking.bookedAt);
      return bookedAt >= cutoffDate;
    }).length;
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  const handleExport = () => {
    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Facility Name', 'Number of Bookings'];
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    exportData.forEach(item => {
      // Escape quotes in facility names and wrap in quotes
      const escapedName = item.name.replace(/"/g, '""');
      csvRows.push([`"${escapedName}"`, item.count].join(','));
    });

    // Create CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `facility_bookings_last_${timeRange}_days.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 12
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <section className="chart-section">
        <div className="chart-header">
          <div>
            <h2>Facility Usage Trends</h2>
            <p>Loading booking statistics...</p>
          </div>
        </div>
        <div className="chart-container loading">
          Loading...
        </div>
      </section>
    );
  }

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div>
          <h2>Facility Usage Trends</h2>
          <p>Booking statistics by facility for the last {timeRange} days</p>
        </div>
        <select 
          className="chart-select" 
          value={timeRange}
          onChange={handleTimeRangeChange}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      <div className="chart-container">
        {chartData ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p>No booking data available</p>
        )}
      </div>
      <div className="chart-footer">
        <button className="export-btn" onClick={handleExport}>
          <FontAwesomeIcon icon={faDownload} className="mr-2" />
          Export as CSV
        </button>
      </div>
    </section>
  );
}