// src/components/Footer.jsx
import React from "react";
import "./css-files/footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <section className="footer-container">
        <nav className="footer-grid">
          <article className="footer-col">
            <a href="/" className="footer-logo">
              <figure className="footer-logo-icon">
                <i className="fas fa-dumbbell"></i>
              </figure>
              <span className="footer-logo-text">Community Sports Hub</span>
            </a>
            <p className="footer-description">
              Your premier destination for sports and community activities.
            </p>
          </article>

          <section className="footer-col">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-links">
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="#facilities">Facilities</a>
              </li>
              <li>
                <a href="#events">Events</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-heading">Facilities</h3>
            <ul className="footer-links">
              <li>
                <a href="#facilities">Olympic Gym</a>
              </li>
              <li>
                <a href="#facilities">Tennis Courts</a>
              </li>
              <li>
                <a href="#facilities">Padel Arena</a>
              </li>
              <li>
                <a href="#facilities">Swimming Pool</a>
              </li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-heading">Connect With Us</h3>
           {/* <nav className="social-links">
              <a href="#" aria-label="Facebook">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </nav> */}
            <address className="footer-address">
              <p>Email: info@communitysportshub.com</p>
              <p>Phone: (123) 456-7890</p>
            </address>
          </section>
        </nav>

        <footer className="footer-bottom">
          <p>&copy; 2023 Community Sports Hub. All rights reserved.</p>
          <p>Designed with passion for community and sports.</p>
        </footer>
      </section>
    </footer>
  );
};

export default Footer;