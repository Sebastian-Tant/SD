import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Facilities from './components/Facilities';
import Applications from './components/Applications';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <section className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <Facilities />
                <Applications />
              </>
            } />
            
            <Route path="/admin" element={<AdminDashboard />} />
            

            <Route path="/admin" element={<AdminDashboard />} />

          </Routes>
        </main>
        <Footer />
      </section>
    </Router>
  );
}

export default App;