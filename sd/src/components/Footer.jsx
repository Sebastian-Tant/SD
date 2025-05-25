
import React from "react";
import "./css-files/footer.css";
import { Link } from "react-router-dom";

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
                <Link to="/explore" className="nav-link">
                  Facilities
                </Link>
              </li>
             
              <li>
                <Link to="/reports" className="nav-link">
                  Reports
                </Link>
              </li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-heading">Connect With Us</h3>
            <address className="footer-address">
              <p>Email: sportify@gmail.com</p> {/* place holder gmail since we dont actually have one, same with number */}
              <p>Phone: (+27) 23 456 78910</p>
            </address>
            <nav className="social-links">
            <a
                href="https://www.linkedin.com/in/yoon-bae-park-28a850361/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 6"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/sashin-rathinasamy-97884b265/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 1"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/ndumisomaphanga/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 2"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/hadi-butt-b81603338/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 3"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/sebastian-tant-a3b847316/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 4"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/jaairdan-munusamy-60199b236/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile 5"
              >
                <i className="fab fa-linkedin"></i>
              </a>
              
            </nav>
           
          </section>
        </nav>

        <footer className="footer-bottom">
          <p>&copy; 2025 Community Sports Hub. </p>
          <p>Designed with passion for community and sports.</p>
        </footer>
      </section>
    </footer>
  );
};

export default Footer;