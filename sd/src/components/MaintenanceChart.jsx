import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Chart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MaintenanceChart() {
  const data = {
    labels: ['Completed', 'In Progress', 'Pending', 'Urgent'],
    datasets: [{
      data: [15, 8, 12, 3],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20,
          font: {
            size: 12
          }
        }
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
    cutout: '70%'
  };

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div>
          <h2>Maintenance Reports</h2>
          <p>Current status of reported facility issues</p>
        </div>
        <select className="chart-select">
          <option>All Facilities</option>
          <option>Football Pitch</option>
          <option>Gym</option>
          <option>Tennis Court</option>
        </select>
      </div>
      
      <div className="maintenance-grid">
        <div className="chart-container" style={{ height: '280px' }}>
          <Doughnut data={data} options={options} />
        </div>
        
        <div className="tickets-list">
          <h3 className="tickets-title">Recent Maintenance Tickets</h3>
          <div className="ticket-item">
            <div className="ticket-content">
              <p className="ticket-title">Football Pitch - Lighting</p>
              <p className="ticket-date">Reported 2 days ago</p>
            </div>
            <span className="ticket-status in-progress">In Progress</span>
          </div>
          
          <div className="ticket-item">
            <div className="ticket-content">
              <p className="ticket-title">Gym - Treadmill #3</p>
              <p className="ticket-date">Reported 5 days ago</p>
            </div>
            <span className="ticket-status urgent">Urgent</span>
          </div>
          
          <div className="ticket-item">
            <div className="ticket-content">
              <p className="ticket-title">Basketball Court - Net</p>
              <p className="ticket-date">Reported 1 day ago</p>
            </div>
            <span className="ticket-status new">New</span>
          </div>
        </div>
      </div>
      
      <div className="chart-footer">
        <button className="export-btn">
          <FontAwesomeIcon icon="download" className="mr-2" />
          Export as PDF
        </button>
      </div>
    </section>
  );
}