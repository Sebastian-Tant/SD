import React from "react";
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './css-files/Chart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PeakHoursChart() {
  const [bookingData, setBookingData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const facilitiesCollection = collection(db, 'facilities');
        const snapshot = await getDocs(facilitiesCollection);
        const facilitiesList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          has_subfacilities: doc.data().has_subfacilities || false
        }));
        setFacilities(facilitiesList);
      } catch (error) {
        console.error('Error fetching facilities:', error);
      }
    };

    fetchFacilities();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        let allBookings = [];
        let facilitiesToProcess = [];

        if (selectedFacility === 'All Facilities') {
          // Process all facilities
          facilitiesToProcess = [...facilities];
        } else {
          // Process only the selected facility
          const selected = facilities.find(f => f.name === selectedFacility);
          if (selected) facilitiesToProcess = [selected];
        }

        for (const facility of facilitiesToProcess) {
          if (facility.has_subfacilities) {
            // Fetch subfacilities if they exist
            const subfacilitiesRef = collection(db, `facilities/${facility.id}/subfacilities`);
            const subSnapshot = await getDocs(subfacilitiesRef);
            const subfacilities = subSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Fetch bookings from each subfacility
            for (const sub of subfacilities) {
              if (sub.bookings && Array.isArray(sub.bookings)) {
                allBookings = [...allBookings, ...sub.bookings.map(b => ({
                  ...b,
                  facilityId: facility.id,
                  subfacilityId: sub.id
                }))];
              }
            }
          } else {
            // Fetch bookings directly from facility
            const facilityDoc = await getDoc(doc(db, 'facilities', facility.id));
            const facilityData = facilityDoc.data();
            if (facilityData.bookings && Array.isArray(facilityData.bookings)) {
              allBookings = [...allBookings, ...facilityData.bookings.map(b => ({
                ...b,
                facilityId: facility.id
              }))];
            }
          }
        }

        // Process booking times
        const timeSlots = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'];
        const timeCounts = {
          '8 AM': 0,
          '10 AM': 0,
          '12 PM': 0,
          '2 PM': 0,
          '4 PM': 0,
          '6 PM': 0,
          '8 PM': 0
        };

        allBookings.forEach(booking => {
          if (booking.time) {
            const time = convertToTimeSlot(booking.time);
            if (timeCounts.hasOwnProperty(time)) {
              timeCounts[time]++;
            }
          }
        });

        // Calculate averages if viewing all facilities, otherwise show raw counts
        const divisor = selectedFacility === 'All Facilities' ? Math.max(1, facilities.length) : 1;
        const processedData = timeSlots.map(slot => 
          Math.round(timeCounts[slot] / divisor)
        );

        setBookingData(processedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setIsLoading(false);
      }
    };

    if (facilities.length > 0) {
      fetchBookings();
    }
  }, [facilities, selectedFacility]);

  const convertToTimeSlot = (timeString) => {
    // Implement logic to convert your time format to the nearest time slot
    // Example assuming timeString is in format "HH:MM" or similar
    let hour;
    
    if (typeof timeString === 'string') {
      hour = parseInt(timeString.split(':')[0]);
    } else if (timeString?.toDate) {
      // If it's a Firestore timestamp
      const date = timeString.toDate();
      hour = date.getHours();
    } else {
      return '8 AM'; // default
    }
    
    if (hour < 9) return '8 AM';
    if (hour < 11) return '10 AM';
    if (hour < 13) return '12 PM';
    if (hour < 15) return '2 PM';
    if (hour < 17) return '4 PM';
    if (hour < 19) return '6 PM';
    return '8 PM';
  };

  const data = {
    labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'],
    datasets: [{
      label: selectedFacility === 'All Facilities' ? 'Average Bookings' : 'Total Bookings',
      data: bookingData.length > 0 ? bookingData : [0, 0, 0, 0, 0, 0, 0],
      fill: true,
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
      tension: 0.3,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return selectedFacility === 'All Facilities' 
              ? `Avg. bookings: ${context.raw}`
              : `Total bookings: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: selectedFacility === 'All Facilities' ? 'Average Bookings' : 'Total Bookings',
          color: 'rgba(255, 255, 255, 0.6)'
        },
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
          color: 'rgba(255, 255, 255, 0.05)',
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

  const peakStats = () => {
    if (bookingData.length === 0) {
      return {
        busiestTime: '5-6 PM',
        busiestValue: 24,
        quietestTime: '8-9 AM',
        quietestValue: 4,
        recommendation: "Offer morning discounts to boost utilization"
      };
    }

    const timeSlots = ['8-9 AM', '10-11 AM', '12-1 PM', '2-3 PM', '4-5 PM', '6-7 PM', '8-9 PM'];
    let maxIndex = 0;
    let minIndex = 0;
    
    bookingData.forEach((value, index) => {
      if (value > bookingData[maxIndex]) maxIndex = index;
      if (value < bookingData[minIndex]) minIndex = index;
    });

    let recommendation;
    if (bookingData[minIndex] < 2) {
      recommendation = "Offer discounts during quiet periods to boost utilization";
    } else if (bookingData[maxIndex] / bookingData[minIndex] > 3) {
      recommendation = "Consider dynamic pricing to balance demand";
    } else {
      recommendation = "Demand is well balanced throughout the day";
    }

    return {
      busiestTime: timeSlots[maxIndex],
      busiestValue: bookingData[maxIndex],
      quietestTime: timeSlots[minIndex],
      quietestValue: bookingData[minIndex],
      recommendation
    };
  };

  const stats = peakStats();

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div>
          <h2>Peak Hours Analysis</h2>
          <p>
            {selectedFacility === 'All Facilities' 
              ? 'Average bookings by time of day across all facilities'
              : `Bookings by time of day for ${selectedFacility}`}
          </p>
        </div>
        <select 
          className="chart-select"
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          disabled={isLoading}
        >
          <option>All Facilities</option>
          {facilities.map(facility => (
            <option key={facility.id}>{facility.name}</option>
          ))}
        </select>
      </div>
      
      <div className="chart-container" style={{ height: '300px' }}>
        {isLoading ? (
          <div className="loading-indicator">Loading data...</div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
      
      <div className="peak-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="chart-line" className="text-indigo-400" />
          </div>
          <div>
            <h3 className="stat-title">Busiest Time</h3>
            <p className="stat-value">{stats.busiestTime}</p>
            <p className="stat-detail">
              {selectedFacility === 'All Facilities' 
                ? `${stats.busiestValue} avg. bookings`
                : `${stats.busiestValue} total bookings`}
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="clock" className="text-blue-400" />
          </div>
          <div>
            <h3 className="stat-title">Quietest Time</h3>
            <p className="stat-value">{stats.quietestTime}</p>
            <p className="stat-detail">
              {selectedFacility === 'All Facilities' 
                ? `${stats.quietestValue} avg. bookings`
                : `${stats.quietestValue} total bookings`}
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="lightbulb" className="text-amber-400" />
          </div>
          <div>
            <h3 className="stat-title">Recommendation</h3>
            <p className="stat-suggestion">{stats.recommendation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}