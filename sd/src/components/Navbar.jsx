// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import "./css-files/navbar.css";
import { Link, useNavigate } from "react-router-dom";
import dark_logo from "./assets/logo1.png";
import light_logo from "./assets/logo1.png";
import Notifications from "../components/Notifications";
import { FaBell } from "react-icons/fa";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            role: "Resident",
          });
        }
        setUser({
          uid: u.uid,
          displayName: u.displayName || userSnap.data()?.displayName,
          photoURL: u.photoURL || userSnap.data()?.photoURL,
          role: userSnap.data()?.role || "Resident",
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const notes = snap.data()?.notifications || [];
      setUnreadCount(notes.filter((n) => !n.read).length);
    });
    return () => unsub();
  }, [user]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <header className="navbar-header">
      <nav className="navbar-container">
        <section className="navbar-content">
          <Link to="/" className="logo">
            <figure className="logo-icon">
              <img
                src={theme === "dark" ? dark_logo : light_logo}
                alt="Sportify Logo"
                className="logo-img"
              />
            </figure>
            <strong className="logo-text">Sportify</strong>
          </Link>

          <ul className="desktop-nav">
            <li>
              <Link to="/explore" className="button-nav-link">
                Facilities
              </Link>
            </li>

            {/* Bookings Dropdown */}
            <li className="dropdown">
              <div className="button-nav-link dropdown-toggle">
                Bookings
              </div>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/bookings" className="dropdown-item">
                    Make a booking
                  </Link>
                </li>
                <li>
                  <Link to="/my-bookings" className="dropdown-item">
                    My bookings
                  </Link>
                </li>
              </ul>
            </li>

            <li>
              <Link to="/reports" className="button-nav-link">
                Reports
              </Link>
            </li>

            {/* Applications Dropdown */}
            <li className="dropdown">
              <div className="button-nav-link dropdown-toggle">
                Applications
              </div>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/applications" className="dropdown-item">
                    Apply
                  </Link>
                </li>
                <li>
                  <Link to="/application-status" className="dropdown-item">
                    View applications
                  </Link>
                </li>
              </ul>
            </li>

            {user?.role === "Admin" && (
              <li>
                <Link to="/admin" className="button-nav-link">
                  Admin Dashboard
                </Link>
              </li>
            )}

            {user && (
              <div className="notification-wrapper">
                <button
                  className="notification-button"
                  onClick={() => setShowNotifications((s) => !s)}
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && <Notifications />}
              </div>
            )}

            {user ? (
              <button onClick={handleSignOut} className="auth-btn">
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="auth-btn"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            )}

            <button onClick={toggleTheme} className="theme-toggle">
              <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"} />
            </button>
          </ul>

          {/* Mobile menu toggle omitted for brevity */}
        </section>
      </nav>
    </header>
  );
};

export default Navbar;
