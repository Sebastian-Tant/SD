import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Facilities from './components/Facilities';
import Applications from './components/Applications';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Hero />
        <Facilities />
        <Applications/>
      </main>
      <Footer />
    </div>
  );
}

export default App;