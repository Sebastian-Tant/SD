import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./css-files/navbar.css";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
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
      navigate("/"); // From second JSX file
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

  return (
    <header className="navbar-header">
      <nav className="navbar-container">
        <section className="navbar-content">
          {/* Logo */}
          <a href="/" className="logo">
            <figure className="logo-icon">
              <i className="fas fa-dumbbell"></i>
            </figure>
            <strong className="logo-text">Community Sports Hub</strong>
          </a>

          {/* Desktop Navigation - Merged from both files */}
          <menu className="desktop-nav">
            <li>
              <a href="#events" className="button-nav-link">
                Events
              </a>
            </li>
            <li
              className="nav-item"
              onMouseEnter={() => setFacilitiesOpen(true)}
              onMouseLeave={() => setFacilitiesOpen(false)}
            >
              <a href="#facilities" className="button-nav-link">
                Facilities
              </a>
              {facilitiesOpen && (
                <ul className="facilities-dropdown">
                  <li>
                    <Link to="/facilities/football-pitch" className="dropdown-link">
                      Football Pitch
                    </Link>
                  </li>
                  <li>
                    <Link to="/facilities/gym" className="dropdown-link">
                      Gym
                    </Link>
                  </li>
                  <li>
                    <Link to="/facilities/swimming-pool" className="dropdown-link">
                      Swimming Pool
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <a href="#contact" className="button-nav-link">
                Contact
              </a>
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
                <div className="user-info">
                  <p className="user-greeting">
                    Hi, {user.displayName || "User"}!
                    {user.role === "Admin" && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </p>
                </div>
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
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <i className="fas fa-bars"></i>
          </button>
        </section>

        {/* Mobile Menu - Kept exactly as in first JSX file */}
        {mobileMenuOpen && (
          <menu className="mobile-menu">
            <li>
              <a href="#events" className="mobile-button-nav-link">
                Events
              </a>
            </li>
            <li>
              <a
                href="#facilities"
                className="mobile-button-nav-link"
                onClick={() => setFacilitiesOpen(!facilitiesOpen)}
              >
                Facilities
              </a>
              <ul className={`mobile-facilities-dropdown ${facilitiesOpen ? 'active' : ''}`}>
                <li>
                  <Link to="/facilities/football-pitch" className="mobile-dropdown-link">
                    Football Pitch
                  </Link>
                </li>
                <li>
                  <Link to="/facilities/gym" className="mobile-dropdown-link">
                    Gym
                  </Link>
                </li>
                <li>
                  <Link to="/facilities/swimming-pool" className="mobile-dropdown-link">
                    Swimming Pool
                  </Link>
                </li>
              </ul>
            </li>
            <li>
              <a href="#contact" className="mobile-button-nav-link">
                Contact
              </a>
            </li>
            <li>
              <a href="#applications" className="mobile-button-nav-link">
                Applications
              </a>
            </li>
            {user?.role === "Admin" && (
              <li>
                <Link to="/admin" className="mobile-button-nav-link">
                  Admin Dashboard
                </Link>
              </li>
            )}
            {user ? (
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
                <div className="mobile-user-info">
                  <p className="mobile-user-greeting">
                    Hi, {user.displayName || "User"}!
                    {user.role === "Admin" && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </p>
                </div>
                <button onClick={handleSignOut} className="mobile-auth-btn">
                  Sign Out
                </button>
              </section>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="mobile-auth-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Login with Google"}
              </button>
            )}
            <button onClick={toggleTheme} className="mobile-theme-toggle">
              <i
                className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}
              ></i>{" "}
              Toggle Theme
            </button>
          </menu>
        )}

        {error && <aside className="auth-error">{error}</aside>}
      </nav>
    </header>
  );
};

export default Navbar;