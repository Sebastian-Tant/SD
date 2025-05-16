// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Facilities from './components/Facilities';
import Explore from './components/Explore'; // Import the new Explore page
import Applications from './components/Applications';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import './App.css';
import AddFacility from "./components/AddFacility";
import BookFacility from './components/BookFacility';

import BookingPage from './components/BookingPage';
import ReportsPage from './components/ReportsPage';
import Features from './components/Features';


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
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Home Route */}
            <Route path="/" element={
              <>
                <Hero />
               < Features />
                <Facilities />
              </>
            } />
            <Route path="/explore" element={<Explore />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/add-facility" element={<AddFacility />} />
            <Route path="/facility/:id/book" element={<BookFacility />} />
          
            <Route path="/applications" element={<Applications />} />
            <Route path="/bookings" element={<BookingPage />} />
            <Route path="/reports" element={<ReportsPage/>} />

          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton />
      </div>
    </Router>
  );
}

export default App;