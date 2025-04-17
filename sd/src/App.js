// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Facilities from './components/Facilities';
import Explore from './components/Explore'; // Import the new Explore page
import Applications from './components/Applications';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import './App.css';
import FacilityForm from "./components/FacilityForm";
import ViewFacility from './components/ViewFacility';
import BookFacility from './components/BookFacility';
import Events from './components/Events';
import EventForm from './components/EventForm';




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
                <Facilities />
                <Applications />
              </>
            } />
            {/* Explore Page Route */}
            <Route path="/explore" element={<Explore />} />
            {/* Admin Dashboard Route */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/add-facility" element={<FacilityForm />} />
            <Route path="/facility/:id" element={<ViewFacility />} />
            <Route path="/facility/:id/book" element={<BookFacility />} />
            <Route path="/events" element={<Events />} />
            <Route path="/add-event" element={<EventForm />} />
            
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;