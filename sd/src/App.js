// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; // Add this import
import 'react-toastify/dist/ReactToastify.css'; // Add this import
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Explore from './components/Explore';
import Applications from './components/Applications';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import './App.css';
import AddFacility from "./components/AddFacility";
import BookFacility from './components/BookFacility';
import Analytics from './components/Analytics';
import BookingPage from './components/BookingPage';
import ReportsPage from './components/ReportsPage';
import Features from './components/Features';
import Events from './components/Events';
import EventForm from './components/EventForm';
import MyBookings from './components/MyBookings';
import ApplicationStatus from './components/ApplicationStatus'; 

function ScrollToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      className={`scroll-to-top-btn${visible ? ' show' : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}

function App() {
  return (
    <Router>
      <section className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Home Route */}
            <Route path="/" element={
              <>
                <Hero />
                <Features />
                <Applications/>
              </>
            } />
            <Route path="/explore" element={<Explore />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/add-facility" element={<AddFacility />} />
            <Route path="/facility/:id/book" element={<BookFacility />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/application-status" element={<ApplicationStatus />} />
            <Route path="/bookings" element={<BookingPage />} />
            <Route path="/reports" element={<ReportsPage/>} />
            <Route path="/events" element={<Events />} />
            <Route path="/add-event" element={<EventForm />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton />
        {/* Add ToastContainer here */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </section>
    </Router>
  );
}

export default App;