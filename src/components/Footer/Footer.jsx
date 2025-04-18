import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="/" className="footer-logo">
              <div className="logo-icon">
                <FontAwesomeIcon icon="futbol" />
              </div>
              <span className="logo-text">Community Sports Hub</span>
            </a>
            <p className="footer-description">
              Your premier destination for sports and community activities.
            </p>
          </div>

          <nav className="footer-links">
            <h3 className="footer-heading">Quick Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/#facilities">Facilities</a></li>
              <li><a href="/booking">Book Now</a></li>
              <li><a href="/report">Reports</a></li>
            </ul>
          </nav>

          <nav className="footer-links">
            <h3 className="footer-heading">Account</h3>
            <ul>
              <li><a href="#">Profile</a></li>
              <li><a href="#">Settings</a></li>
              <li><a href="#" className="text-danger">Sign Out</a></li>
            </ul>
          </nav>

          <address className="footer-contact">
            <h3 className="footer-heading">Connect With Us</h3>
            <div className="social-links">
              <a href="#"><FontAwesomeIcon icon={faFacebook} /></a>
              <a href="#"><FontAwesomeIcon icon={faTwitter} /></a>
              <a href="#"><FontAwesomeIcon icon={faInstagram} /></a>
            </div>
            <p>Email: info@communitysportshub.com</p>
            <p>Phone: (123) 456-7890</p>
          </address>
        </div>

        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} Community Sports Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}