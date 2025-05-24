import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTypewriter from '../hooks/useTypewriter';
import './css-files/hero.css';

const Hero = () => {
  const navigate = useNavigate();
  const [buttonVisible, setButtonVisible] = useState(false);
  const subtitleText = "Your premier destination for sports facilities and community events";
  const typedSubtitle = useTypewriter(subtitleText, 30);

  const handleExploreClick = () => {
    navigate('/explore');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setButtonVisible(true);
    }, subtitleText.length * 30 + 500);
    
    return () => clearTimeout(timer);
  }, []);

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
          {typedSubtitle}
          <span className="cursor">|</span>
        </p>
        <button 
          className={`hero-cta ${buttonVisible ? 'rise-animation' : ''}`}
          onClick={handleExploreClick}
        >
          Explore Facilities
          <span className="cta-overlay"></span>
        </button>
      </section>
    </section>
  );
};

export default Hero;