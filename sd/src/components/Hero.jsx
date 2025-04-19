import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css-files/hero.css';

const Hero = () => {
  const navigate = useNavigate();

  const handleExploreClick = () => {
    navigate('/explore');
  };

  return (
    <section className="hero-section">
      <video autoPlay loop muted playsInline className="hero-video">
        <source src="/sports.mp4" type="video/mp4" />
      </video>
      <section className="hero-content">
        <h1 className="hero-title">
          Welcome to <span className="shining-text">Sportify</span>
        </h1>
        <p className="hero-subtitle">
          Your premier destination for sports facilities and community events
        </p>
        <button className="hero-cta" onClick={handleExploreClick}>
          Explore Facilities
        </button>
      </section>
    </section>
  );
};

export default Hero;