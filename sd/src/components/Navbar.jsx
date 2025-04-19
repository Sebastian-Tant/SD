import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./css-files/navbar.css";
import { Link, useNavigate } from "react-router-dom";
import dark_logo from "./assets/logo1.png";
import light_logo from "./assets/logo2.png";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: "Resident",
          });
          setUser({
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: "Resident",
          });
        } else {
          setUser({
            uid: user.uid,
            displayName: user.displayName || userSnap.data().displayName,
            photoURL: user.photoURL || userSnap.data().photoURL,
            role: userSnap.data().role,
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, provider);
      console.log("User signed in:", result.user);
    } catch (error) {
      setError(error.message);
      console.error("Error signing in with Google:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      setError(error.message);
      console.error("Error signing out:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Close mobile menu when a link is clicked
  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <nav className="navbar-container">
        <section className="navbar-content">
          <a href="/" className="logo">
            <figure className="logo-icon">
              <img
                src={theme === "dark" ? dark_logo : light_logo}
                alt="Community Sports Hub Logo"
                className="logo-img"
              />
            </figure>
            <strong className="logo-text">Sportify</strong>
          </a>

          {/* Desktop Navigation */}
          <menu className="desktop-nav">
            <li>
              <Link to="/events" className="button-nav-link">
                Events
              </Link>
            </li>
            <li>
              <Link to="/explore" className="button-nav-link">
                Facilities
              </Link>
            </li>
            <li>
              <Link to="/bookings" className="button-nav-link">
                Bookings
              </Link>
            </li>
            <li>
              <Link to="/reports" className="button-nav-link">
                Reports
              </Link>
            </li>
            <li>
              <Link to="/applications" className="button-nav-link">
                Applications
              </Link>
            </li>
            {user?.role === "Admin" && (
              <li>
                <Link to="/admin" className="button-nav-link">
                  Admin Dashboard
                </Link>
              </li>
            )}
            {user ? (
              <section className="user-section">
                <figure className="user-avatar">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="user-avatar-img"
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </figure>
                <section className="user-info">
                  <p className="user-greeting">
                    Hi, {user.displayName || "User"}!
                    {user.role === "Admin" && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </p>
                </section>
                <button onClick={handleSignOut} className="auth-btn">
                  Sign Out
                </button>
              </section>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="auth-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Login with Google"}
              </button>
            )}
            <button onClick={toggleTheme} className="theme-toggle">
              <i
                className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}
              ></i>
            </button>
          </menu>

          {/* Mobile Menu Button */}
          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <section className="burger-line"></section>
            <section className="burger-line"></section>
            <section className="burger-line"></section>
          </button>
        </section>

        {/* Mobile Menu */}
        <section className={`mobile-menu-container ${mobileMenuOpen ? "open" : ""}`}>
          <menu className="mobile-menu">
            <li>
              <Link 
                to="/events" 
                className="mobile-button-nav-link"
                onClick={handleMobileLinkClick}
              >
                Events
              </Link>
            </li>
            <li>
              <Link 
                to="/explore" 
                className="mobile-button-nav-link"
                onClick={handleMobileLinkClick}
              >
                Facilities
              </Link>
            </li>
            <li>
              <Link 
                to="/bookings" 
                className="mobile-button-nav-link"
                onClick={handleMobileLinkClick}
              >
                Bookings
              </Link>
            </li>
            <li>
              <Link 
                to="/reports" 
                className="mobile-button-nav-link"
                onClick={handleMobileLinkClick}
              >
                Reports
              </Link>
            </li>
            <li>
              <Link 
                to="/applications" 
                className="mobile-button-nav-link"
                onClick={handleMobileLinkClick}
              >
                Applications
              </Link>
            </li>
            {user?.role === "Admin" && (
              <li>
                <Link 
                  to="/admin" 
                  className="mobile-button-nav-link"
                  onClick={handleMobileLinkClick}
                >
                  Admin Dashboard
                </Link>
              </li>
            )}
            {user ? (
              <li className="mobile-auth-item">
                <section className="mobile-user-section">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="mobile-user-avatar"
                    />
                  ) : (
                    <i className="fas fa-user mobile-user-icon"></i>
                  )}
                  <section className="mobile-user-info">
                    <p className="mobile-user-greeting">
                      Hi, {user.displayName || "User"}!
                      {user.role === "Admin" && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </p>
                  </section>
                </section>
                <button 
                  onClick={() => {
                    handleSignOut();
                    handleMobileLinkClick();
                  }} 
                  className="mobile-auth-btn"
                >
                  Sign Out
                </button>
              </li>
            ) : (
              <li className="mobile-auth-item">
                <button
                  onClick={() => {
                    handleGoogleSignIn();
                    handleMobileLinkClick();
                  }}
                  className="mobile-auth-btn"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Login with Google"}
                </button>
              </li>
            )}
            <li className="mobile-theme-item">
              <button 
                onClick={() => {
                  toggleTheme();
                  handleMobileLinkClick();
                }} 
                className="mobile-theme-toggle"
              >
                <i
                  className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}
                ></i>{" "}
                Toggle Theme
              </button>
            </li>
          </menu>
        </section>

        {error && <aside className="auth-error">{error}</aside>}
      </nav>
    </header>
  );
};

export default Navbar;