import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './Chart.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';



ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UsageChart() {
  const data = {
    labels: ['Football Pitch', 'Gym', 'Tennis Court', 'Basketball Court', 'Swimming Pool'],
    datasets: [{
      label: 'Bookings',
      data: [320, 290, 180, 250, 150],
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

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div>
          <h2>Facility Usage Trends</h2>
          <p>Booking statistics by facility for the last 30 days</p>
        </div>
        <select className="chart-select">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>
      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
      <div className="chart-footer">
        <button className="export-btn">
          <FontAwesomeIcon icon="download" className="mr-2" />
          Export as CSV
        </button>
      </div>
    </section>
  );
}