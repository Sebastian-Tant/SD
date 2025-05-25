
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";

import './css-files/facilities.css';

const Facilities = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Gym Facility"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Tennis Court"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Padel Court"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section id="facilities" className="facilities-section">
      <article className="facilities-container">
        <h2 className="facilities-title">Our Facilities</h2>

        <section className="slideshow-container">
          {slides.map((slide, index) => (
            <figure
              key={slide.id}
              className={`facility-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img src={slide.image} alt={slide.alt} className="slide-image" />
            </figure>
          ))}

          <footer className="slideshow-footer">
            <Link to="/bookings" className="book-btn">
              Book Now
            </Link>          
          </footer>

          <nav className="slide-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`slide-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </nav>
        </section>
      </article>
    </section>
  );
};

export default Facilities;