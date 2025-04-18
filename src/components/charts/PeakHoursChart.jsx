import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Chart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PeakHoursChart() {
  const data = {
    labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'],
    datasets: [{
      label: 'Average Bookings',
      data: [4, 8, 12, 15, 18, 24, 14],
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

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div>
          <h2>Peak Hours Analysis</h2>
          <p>Average bookings by time of day across all facilities</p>
        </div>
        <select className="chart-select">
          <option>All Facilities</option>
          <option>Football Pitch</option>
          <option>Gym</option>
          <option>Tennis Court</option>
        </select>
      </div>
      
      <div className="chart-container" style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
      
      <div className="peak-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="chart-line" className="text-indigo-400" />
          </div>
          <div>
            <h3 className="stat-title">Busiest Time</h3>
            <p className="stat-value">5-6 PM</p>
            <p className="stat-detail">24 avg. bookings</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="clock" className="text-blue-400" />
          </div>
          <div>
            <h3 className="stat-title">Quietest Time</h3>
            <p className="stat-value">8-9 AM</p>
            <p className="stat-detail">4 avg. bookings</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FontAwesomeIcon icon="lightbulb" className="text-amber-400" />
          </div>
          <div>
            <h3 className="stat-title">Recommendation</h3>
            <p className="stat-suggestion">Offer morning discounts to boost utilization</p>
          </div>
        </div>
      </div>
    </section>
  );
}