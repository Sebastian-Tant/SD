// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import "./css-files/navbar.css";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError(error.message);
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
          <Link to="/" className="logo">
            <figure className="logo-icon">
              <i className="fas fa-dumbbell"></i>
            </figure>
            <strong className="logo-text">Community Sports Hub</strong>
          </Link>

          {/* Desktop Navigation */}
          <menu className="desktop-nav">
            <li><Link to="/events" className="nav-link">Events</Link></li>
            <li><Link to="/facilities" className="nav-link">Facilities</Link></li>
            <li><Link to="/explore" className="nav-link">Explore</Link></li>
            <li><a href="#contact" className="nav-link">Contact</a></li>
            <li><a href="#applications" className="nav-link">Applications</a></li>

            {user?.role === "Admin" && (
              <li><Link to="/admin" className="nav-link">Admin Dashboard</Link></li>
            )}

            {user ? (
              <section className="user-section">
                <figure className="user-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="user-avatar-img" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </figure>
                <div className="user-info">
                  <p className="user-greeting">
                    Hi, {user.displayName || "User"}!
                    {user.role === "Admin" && <span className="admin-badge">Admin</span>}
                  </p>
                </div>
                <button onClick={handleSignOut} className="auth-btn">Sign Out</button>
              </section>
            ) : (
              <button onClick={handleGoogleSignIn} className="auth-btn" disabled={loading}>
                {loading ? "Signing In..." : "Login with Google"}
              </button>
            )}

            <button onClick={toggleTheme} className="theme-toggle">
              <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}></i>
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <menu className="mobile-menu">
            <li><Link to="/events" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Events</Link></li>
            <li><Link to="/facilities" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Facilities</Link></li>
            <li><Link to="/explore" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Explore</Link></li>
            <li><a href="#contact" className="mobile-nav-link">Contact</a></li>
            <li><a href="#applications" className="mobile-nav-link">Applications</a></li>

            {user?.role === "Admin" && (
              <li>
                <Link to="/admin" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Admin Dashboard
                </Link>
              </li>
            )}

            {user ? (
              <section className="mobile-user-section">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="mobile-user-avatar" />
                ) : (
                  <i className="fas fa-user mobile-user-icon"></i>
                )}
                <div className="mobile-user-info">
                  <p className="mobile-user-greeting">
                    Hi, {user.displayName || "User"}!
                    {user.role === "Admin" && <span className="admin-badge">Admin</span>}
                  </p>
                </div>
                <button onClick={handleSignOut} className="mobile-auth-btn">Sign Out</button>
              </section>
            ) : (
              <button onClick={handleGoogleSignIn} className="mobile-auth-btn" disabled={loading}>
                {loading ? "Signing In..." : "Login with Google"}
              </button>
            )}

            <button onClick={toggleTheme} className="mobile-theme-toggle">
              <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}></i> Toggle Theme
            </button>
          </menu>
        )}

        {error && <aside className="auth-error">{error}</aside>}
      </nav>
    </header>
  );
};

export default Navbar;
