import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import './css-files/facilities.css';

const Facilities = () => {
  const [angle, setAngle] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const spinnerRef = useRef(null);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

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
      image: "https://images.unsplash.com/photo-1613870930431-a09c7139eb33?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Padel Court"
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Swimming Pool"
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1630420598913-44208d36f9af?q=80&w=1925&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Mountain View"
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1595871151608-bc7abd1caca3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Spa Facility"
    }
  ];

  const rotate = (direction = '') => {
    setAngle(prevAngle => direction === 'prev' ? prevAngle + 45 : prevAngle - 45);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left
      rotate();
    }

    if (touchStart - touchEnd < -50) {
      // Swipe right
      rotate('prev');
    }
  };

  useEffect(() => {
    if (spinnerRef.current) {
      spinnerRef.current.style.transform = `rotateY(${angle}deg)`;
    }
  }, [angle]);

  useEffect(() => {
    if (!isHovered) {
      intervalRef.current = setInterval(() => {
        rotate();
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isHovered]);

  return (
    <section id="facilities" className="facilities-section">
      <article className="facilities-container">
        <h2 className="facilities-title">Our Premium Facilities</h2>
        
        <div 
          className="carousel-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          ref={carouselRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div id="carousel">
            <figure id="spinner" ref={spinnerRef}>
              {slides.map((slide, index) => (
                <img 
                  key={slide.id}
                  src={slide.image} 
                  alt={slide.alt} 
                  style={{ transform: `rotateY(${index * (360 / slides.length)}deg)` }}
                />
              ))}
            </figure>
          </div>
          
          {/*}
          <button 
            className="carousel-control prev"
            onClick={() => rotate('prev')}
            aria-label="Previous slide"
            onMouseEnter={() => setIsHovered(true)}
          >
            &lt;
          </button>
          <button 
            className="carousel-control next"
            onClick={() => rotate()}
            aria-label="Next slide"
            onMouseEnter={() => setIsHovered(true)}
          >
            &gt;
          </button>
          */}
          
          <Link to="/bookings" className="book-btn">
            Book Now
          </Link>
        </div>
      </article>
    </section>
  );
};

export default Facilities;