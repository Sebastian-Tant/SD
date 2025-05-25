import React from 'react';
import { FaClock, FaUsers } from 'react-icons/fa';
import { GiSoccerField } from 'react-icons/gi';
import './css-files/features.css';

const Features = () => {
  return (
    <section className="features-section">
      <section className="features-container">
        <h2 className="section-title">Why Choose Sportify?</h2>
        <section className="cards">
          {[
            {
              icon: <GiSoccerField className="feature-icon" />,
              title: 'Premium Facilities',
              desc: 'State-of-the-art equipment and well-maintained spaces',
              colorClass: 'red'
            },
            {
              icon: <FaClock className="feature-icon" />,
              title: 'All day access',
              desc: 'Available at all popular times to play!',
              colorClass: 'blue'
            },
            {
              icon: <FaUsers className="feature-icon" />,
              title: 'Community Events',
              desc: 'Regular tournaments and social gatherings',
              colorClass: 'green'
            },
          ].map((feature, index) => (
            <section key={index} className={`card ${feature.colorClass}`}>
              {feature.icon}
              <p className="tip">{feature.title}</p>
              <p className="second-text">{feature.desc}</p>
            </section>
          ))}
        </section>
        <section className="ball-track">
          <section className="ball soccer-ball"></section>
          <section className="ball basketball"></section>
          <section className="ball tennis-ball"></section>
        </section>
      </section>
    </section>
  );
};

export default Features;