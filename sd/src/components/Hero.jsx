// src/components/Hero.jsx
import React from 'react';
import './css-files/hero.css';

const Hero = () => {
  return (
    <section className="hero-section">
      <header className="hero-container">
        <h1 className="hero-title">Welcome to Community Sports Hub</h1>
        <p className="hero-subtitle">
          Your premier destination for sports facilities and community events
        </p>
      </header>
    </section>
  );
};

export default Hero;