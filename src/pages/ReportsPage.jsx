import { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ReportCard from '../components/ReportCard/ReportCard';
import UsageChart from '../components/charts/UsageChart';
import MaintenanceChart from '../components/charts/MaintenanceChart';
import PeakHoursChart from '../components/charts/PeakHoursChart';
import useTypewriter from '../hooks/useTypewriter';
import '../styles/globals.css';
import '../styles/animations.css';

export default function ReportsPage() {
  const [cardsVisible, setCardsVisible] = useState(false);
  const titleText = "Facility Reports Dashboard";
  const typedTitle = useTypewriter(titleText);
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    document.body.classList.add('loaded');
    
    // Start typing animation
    const subtitleTimer = setTimeout(() => {
      setShowSubtitle(true);
    }, titleText.length * 50 + 300); // Wait for title to finish + 300ms
    
    // Animate cards after subtitle appears
    const cardsTimer = setTimeout(() => {
      setCardsVisible(true);
    }, titleText.length * 50 + 600);
    
    // Then animate charts after a slight delay
    const chartsTimer = setTimeout(() => {
      const charts = document.querySelectorAll('.chart-container');
      charts.forEach(chart => {
        chart.classList.add('visible');
      });
    }, titleText.length * 50 + 900);

    return () => {
      clearTimeout(subtitleTimer);
      clearTimeout(cardsTimer);
      clearTimeout(chartsTimer);
    };
  }, []);

  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content">
        <section className="page-header">
          <h1 className="page-title">
            {typedTitle}
            <span className="cursor">|</span>
          </h1>
          <p className={`page-subtitle transition-opacity duration-500 ${showSubtitle ? 'opacity-100' : 'opacity-0'}`}>
            Analytics and insights for better facility management
          </p>
        </section>

        {/* Stats Summary Cards */}
        <section className={`cards-grid ${cardsVisible ? 'cards-visible' : ''}`}>
          <ReportCard 
            title="Total Bookings" 
            value="1,248" 
            trend="12% from last month" 
            trendColor="text-success" 
            icon="calendar-check" 
          />
          <ReportCard 
            title="Active Maintenance" 
            value="8" 
            trend="2 urgent issues" 
            trendColor="text-danger" 
            icon="tools" 
          />
          <ReportCard 
            title="Member Satisfaction" 
            value="92%" 
            trend="4% improvement" 
            trendColor="text-success" 
            icon="thumbs-up" 
          />
        </section>

        <UsageChart />
        <MaintenanceChart />
        <PeakHoursChart />
      </main>

      <Footer />
    </div>
  );
}