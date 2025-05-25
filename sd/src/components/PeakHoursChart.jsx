import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faClock, faLightbulb, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './css-files/Chart.css';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PeakHoursChart() {
  const [bookingData, setBookingData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeSlots = ['1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];

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
        facilitiesToProcess = [...facilities];
      } else {
        const selected = facilities.find(f => f.name === selectedFacility);
        if (selected) facilitiesToProcess = [selected];
      }

      // Collect all bookings from selected facilities/subfacilities
      for (const facility of facilitiesToProcess) {
        if (facility.has_subfacilities) {
          const subfacilitiesRef = collection(db, `facilities/${facility.id}/subfacilities`);
          const subSnapshot = await getDocs(subfacilitiesRef);
          
          for (const subDoc of subSnapshot.docs) {
            const subData = subDoc.data();
            if (subData.bookings?.length > 0) {
              allBookings = [
                ...allBookings,
                ...subData.bookings.map(b => ({
                  ...b,
                  time: b.time
                }))
              ];
            }
          }
        } else {
          const facilityDoc = await getDoc(doc(db, 'facilities', facility.id));
          const facilityData = facilityDoc.data();
          if (facilityData.bookings?.length > 0) {
            allBookings = [
              ...allBookings,
              ...facilityData.bookings.map(b => ({
                ...b,
                time: b.time
              }))
            ];
          }
        }
      }

      // Initialize time counts
      const timeCounts = {
        '1 PM': 0,
        '2 PM': 0,
        '3 PM': 0,
        '4 PM': 0,
        '5 PM': 0
      };

      // Count all bookings
      allBookings.forEach(booking => {
        if (booking.time) {
          const timeSlot = convertToTimeSlot(booking.time);
          if (timeCounts.hasOwnProperty(timeSlot)) {
            timeCounts[timeSlot]++;
          }
        }
      });

      // Convert to array in correct order
      const processedData = timeSlots.map(slot => timeCounts[slot]);

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
   // eslint-disable-next-line react-hooks/exhaustive-deps
}, [facilities, selectedFacility]);

  const convertToTimeSlot = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '5 PM';
    
    const [hoursStr] = timeString.split(':');
    const hours = parseInt(hoursStr, 10);
    
    if (isNaN(hours)) return '5 PM';
    
    if (hours === 13) return '1 PM';
    if (hours === 14) return '2 PM';
    if (hours === 15) return '3 PM';
    if (hours === 16) return '4 PM';
    if (hours === 17) return '5 PM';
    
    return hours < 13 ? '1 PM' : '5 PM';
  };

  // ... (keep all the remaining code the same, including data, options, peakStats, and the return statement)

  const data = {
    labels: timeSlots,
    datasets: [{
      label: selectedFacility === 'All Facilities' ? 'Average Bookings' : 'Total Bookings',
      data: bookingData.length > 0 ? bookingData : [0, 0, 0, 0, 0],
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
          color: 'var(--chart-text-dark)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'var(--chart-text-dark)',
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
          color: 'var(--chart-text-dark)',
          font: {
            size: 12
          }
        }
      }
    }
  };

const peakStats = () => {
  if (bookingData.length === 0 || bookingData.every(val => val === 0)) {
    return {
      busiestTime: '',
      busiestValue: 0,
      quietestTime: '',
      quietestValue: 0,
      recommendation: "No booking data available"
    };
  }

  // Match these with your timeSlots array order
  const timeSlotLabels = ['1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];
  
  let maxIndex = 0;
  let minIndex = 0;
  let maxValue = bookingData[0];
  let minValue = bookingData[0];
  
  bookingData.forEach((value, index) => {
    if (value > maxValue) {
      maxValue = value;
      maxIndex = index;
    }
    if (value < minValue) {
      minValue = value;
      minIndex = index;
    }
  });

  let recommendation;
  if (minValue === 0) {
    recommendation = "Offer promotions during quiet periods";
  } else if (maxValue / minValue > 3) {
    recommendation = "Consider adjusting pricing to balance demand";
  } else {
    recommendation = "Demand is well distributed";
  }

  return {
    busiestTime: timeSlotLabels[maxIndex] || '',
    busiestValue: maxValue,
    quietestTime: timeSlotLabels[minIndex] || '',
    quietestValue: minValue,
    recommendation
  };
};

  const stats = peakStats();

  return (
    <motion.section 
      className="chart-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="chart-header">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>Peak Hours Analysis</h2>
          <p>
            {selectedFacility === 'All Facilities' 
              ? 'Average afternoon bookings across all facilities'
              : `Afternoon bookings for ${selectedFacility}`}
          </p>
        </motion.div>

        <div className="dropdown-container" ref={dropdownRef}>
          <motion.button
            className="chart-select"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedFacility}
            <motion.span
              animate={{ rotate: isDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="dropdown-menu"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <motion.ul>
                  <motion.li
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedFacility('All Facilities');
                      setIsDropdownOpen(false);
                    }}
                  >
                    All Facilities
                  </motion.li>
                  {facilities.map(facility => (
                    <motion.li
                      key={facility.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedFacility(facility.name);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {facility.name}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <motion.div 
        className="chart-container"
        style={{ height: '300px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
      >
        {isLoading ? (
          <div className="loading-indicator">
            <motion.div
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            Loading data...
          </div>
        ) : (
          <Line data={data} options={options} />
        )}
      </motion.div>
      
      <div className="cards-parent-container">
        <motion.div 
          className="parent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flip-card">
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <p className="flip-card-title">Busiest Time</p>
                <FontAwesomeIcon icon={faChartLine} className="flip-card-icon text-indigo-400" />
                <p className="flip-card-hint">Hover to see details</p>
              </div>
              <div className="flip-card-back">
                <p className="flip-card-value">{stats.busiestTime}</p>
                <p className="flip-card-subtext">
                  {selectedFacility === 'All Facilities' 
                    ? `${stats.busiestValue} avg. bookings`
                    : `${stats.busiestValue} total bookings`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="parent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flip-card">
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <p className="flip-card-title">Quietest Time</p>
                <FontAwesomeIcon icon={faClock} className="flip-card-icon text-blue-400" />
                <p className="flip-card-hint">Hover to see details</p>
              </div>
              <div className="flip-card-back">
                <p className="flip-card-value">{stats.quietestTime}</p>
                <p className="flip-card-subtext">
                  {selectedFacility === 'All Facilities' 
                    ? `${stats.quietestValue} avg. bookings`
                    : `${stats.quietestValue} total bookings`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="parent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <div className="flip-card">
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <p className="flip-card-title">Recommendation</p>
                <FontAwesomeIcon icon={faLightbulb} className="flip-card-icon text-amber-400" />
                <p className="flip-card-hint">Hover to see details</p>
              </div>
              <div className="flip-card-back">
                <p className="flip-card-value">Tip</p>
                <p className="flip-card-subtext">{stats.recommendation}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}