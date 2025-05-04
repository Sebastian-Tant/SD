import { useEffect, useState } from 'react';
import ReportCard from './ReportCard';
import UsageChart from './UsageChart';
import MaintenanceChart from './MaintenanceChart';
import PeakHoursChart from './PeakHoursChart';
import useTypewriter from '../hooks/useTypewriter';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './css-files/animations.css';

export default function Analytics() {
  const [cardsVisible, setCardsVisible] = useState(false);
  const titleText = "Facility Reports Dashboard";
  const typedTitle = useTypewriter(titleText);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeMaintenance: 0,
    urgentIssues: 0,
    bookingTrend: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.classList.add('loaded');
    
    const fetchData = async () => {
      try {
        // Fetch all bookings across facilities and subfacilities
        const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
        let totalBookings = 0;
        let currentMonthBookings = 0;
        let previousMonthBookings = 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Process bookings from facilities and subfacilities
        const processBookings = (bookings) => {
          if (!bookings) return;
          
          totalBookings += bookings.length;
          
          bookings.forEach(booking => {
            if (booking.bookedAt) {
              const bookingDate = new Date(booking.bookedAt);
              const bookingMonth = bookingDate.getMonth();
              const bookingYear = bookingDate.getFullYear();
              
              // Current month bookings
              if (bookingMonth === currentMonth && bookingYear === currentYear) {
                currentMonthBookings++;
              }
              // Previous month bookings
              else if (
                bookingMonth === ((currentMonth - 1 + 12) % 12) &&
                bookingYear === (currentMonth === 0 ? currentYear - 1 : currentYear)
              ) {
                previousMonthBookings++;
              }
            }
          });
        };

        for (const facilityDoc of facilitiesSnapshot.docs) {
          const facilityData = facilityDoc.data();
          
          if (facilityData.has_subfacilities) {
            // Get bookings from subfacilities
            const subfacilitiesSnapshot = await getDocs(
              collection(db, `facilities/${facilityDoc.id}/subfacilities`)
            );
            
            for (const subDoc of subfacilitiesSnapshot.docs) {
              processBookings(subDoc.data().bookings);
            }
          } else {
            processBookings(facilityData.bookings);
          }
        }

        // Fetch maintenance reports - urgent issues are those with status 'in_progress'
        const reportsQuery = query(
          collection(db, 'reports'),
          where('status', 'in', ['open', 'in progress'])
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        
        // Count urgent issues (status 'in_progress')
        const urgentReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', 'in progress')
        );
        const urgentReportsSnapshot = await getDocs(urgentReportsQuery);
        const urgentIssuesCount = urgentReportsSnapshot.size;

        // Calculate trend percentage (comparing current month with previous month)
        const trendPercentage = previousMonthBookings > 0 
          ? Math.round(((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100)
          : currentMonthBookings > 0 ? 100 : 0;

        setStats({
          totalBookings,
          activeMaintenance: reportsSnapshot.size,
          urgentIssues: urgentIssuesCount,
          bookingTrend: trendPercentage
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setIsLoading(false);
      }
    };

    fetchData();

    // Animation timers (unchanged)
    const subtitleTimer = setTimeout(() => {
      setShowSubtitle(true);
    }, titleText.length * 50 + 300);
    
    const cardsTimer = setTimeout(() => {
      setCardsVisible(true);
    }, titleText.length * 50 + 600);
    
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
          value={isLoading ? "..." : stats.totalBookings.toLocaleString()} 
          trend={
            isLoading ? "Loading..." : 
            `${Math.abs(stats.bookingTrend)}% ${stats.bookingTrend >= 0 ? 'from' : 'from'} last month`
          } 
          trendColor={stats.bookingTrend >= 0 ? "text-success" : "text-danger"} 
          icon="calendar-check" 
        />
        <ReportCard 
          title="Active Maintenance" 
          value={isLoading ? "..." : stats.activeMaintenance} 
          trend={
            isLoading ? "Loading..." : 
            `${stats.urgentIssues} urgent issues`
          } 
          trendColor="text-warning" 
          icon="tools" 
        />
      </section>

      <UsageChart />
      <MaintenanceChart />
      <PeakHoursChart />
    </main>
  );
}