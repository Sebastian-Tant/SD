import React from 'react';
import './css-files/features.css';

const Features = () => {
  return (
    <section className="features-section">
      <section className="features-container">
        <h2 className="section-title">Why Choose Sportify?</h2>
        <section className="features-grid">
          {[
            {
              icon: '🏟️',
              title: 'Premium Facilities',
              desc: 'State-of-the-art equipment and well-maintained spaces',
            },
            {
              icon: '⏰',
              title: 'All day access',
              desc: 'Available at all popular times to play!',
            },
            {
              icon: '👥',
              title: 'Community Events',
              desc: 'Regular tournaments and social gatherings',
            },
          ].map((feature, index) => (
            <section key={index} className="feature-card">
              <section className="feature-icon">{feature.icon}</section>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </section>
          ))}
        </section>
      </section>
    </section>
  );
};

export default Features;

 