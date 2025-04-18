import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFutbol, faSignOutAlt, faMoon, faSun, faBars } from '@fortawesome/free-solid-svg-icons';
import './Header.css';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const signOut = () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  return (
    <header className="header">
      <nav className="nav-container">
        <div className="nav-content">
          <a href="/" className="logo">
            <div className="logo-icon">
              <FontAwesomeIcon icon={faFutbol} />
            </div>
            <span className="logo-text">Community Sports Hub</span>
          </a>

          <div className="desktop-nav">
            <a href="/#facilities" className="nav-link">Facilities</a>
            <a href="/booking" className="nav-link">Book Now</a>
            <a href="#" className="nav-link">My Bookings</a>
            <a href="#" className="nav-link">Profile</a>
            <a href="/report" className="nav-link active">Reports</a>
            <button onClick={signOut} className="btn btn-danger">
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Sign Out
            </button>
            <button onClick={toggleTheme} className="theme-toggle">
              <FontAwesomeIcon icon={theme === 'dark' ? faMoon : faSun} />
            </button>
          </div>

          <div className="mobile-nav-controls">
            <button onClick={toggleTheme} className="theme-toggle">
              <FontAwesomeIcon icon={theme === 'dark' ? faMoon : faSun} />
            </button>
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        </div>

        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="mobile-menu-list">
            <li><a href="/#facilities" className="mobile-menu-link">Facilities</a></li>
            <li><a href="/booking" className="mobile-menu-link">Book Now</a></li>
            <li><a href="#" className="mobile-menu-link">My Bookings</a></li>
            <li><a href="#" className="mobile-menu-link">Profile</a></li>
            <li><a href="/report" className="mobile-menu-link active">Reports</a></li>
            <li>
              <button onClick={signOut} className="btn btn-danger w-full">
                <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Sign Out
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}