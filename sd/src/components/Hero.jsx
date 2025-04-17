import React from 'react';
import './css-files/hero.css';

const Hero = () => {
  return (
    <section className="hero-section">
     <video autoPlay loop muted playsInline className="hero-video">
  <source src="/sports.mp4" type="video/mp4" />
</video>
      <div className="hero-content">
        <h1 className="hero-title">Welcome to Sportify</h1>
        <p className="hero-subtitle">
          Your premier destination for sports facilities and community events
        </p>
      </div>
    </section>
  );
};

export default Hero;