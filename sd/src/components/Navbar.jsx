import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
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
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
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
            photoURL: user.photoURL || userSnap.data().photo,
            role: userSnap.data().role,
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const notifications = userSnap.data().notifications || [];
          const unread = notifications.filter((notif) => !notif.read).length;
          setUnreadCount(unread);
        }
      };

      fetchUnreadCount();

      // Optional: Set up real-time listener
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        const notifications = doc.data()?.notifications || [];
        const unread = notifications.filter((notif) => !notif.read).length;
        setUnreadCount(unread);
      });

      return () => unsubscribe();
    } else {
      setUnreadCount(0);
    }
  }, [user]);
  // Handle Google Sign In
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

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
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

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileNotificationsOpen(false);
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
            {/*<li>
              <Link to="/events" className="button-nav-link">
                Events
              </Link>
            </li>*/}
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
            {user?.role === "Resident" && (
              <li>
                <Link to="/resident" className="button-nav-link">
                  Dashboard
                </Link>
              </li>
            )}
            {user?.role === "Facility Staff" && (
              <li>
                <Link to="/staff" className="button-nav-link">
                  Staff Dashboard
                </Link>
              </li>
            )}
            {user && (
             <div className="notification-wrapper">
             <button
               className="notification-button"
               onClick={() => setShowNotifications(!showNotifications)}
             >
               <FaBell />
               {unreadCount > 0 && (
                 <span className="notification-badge">{unreadCount}</span>
               )}
             </button>
             {showNotifications && <Notifications setUnreadCount={setUnreadCount} />}
           </div>
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
                   
                    {user.role === "Admin" && (
                      <span className="admin-badge">Admin</span>
                    )}
                    {user.role === "Facility Staff" && (
                      <span className="staff-badge">Staff</span>
                    )}
                    {user.role === "Resident" && (
                      <span className="resident-badge">Resident</span>
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
            <div className="burger-line"></div>
            <div className="burger-line"></div>
            <div className="burger-line"></div>
          </button>
        </section>

        {/* Mobile Menu */}
        <div
          className={`mobile-menu-container ${mobileMenuOpen ? "open" : ""}`}
        >
          <menu className="mobile-menu">
            {/* <li>
             <Link
                to="/events"
                className="mobile-button-nav-link"
                onClick={closeMobileMenu}
              >
                Events
              </Link>
            </li>*/}
            <li>
              <Link
                to="/explore"
                className="mobile-button-nav-link"
                onClick={closeMobileMenu}
              >
                Facilities
              </Link>
            </li>
            <li>
              <Link
                to="/bookings"
                className="mobile-button-nav-link"
                onClick={closeMobileMenu}
              >
                Bookings
              </Link>
            </li>
            <li>
              <Link
                to="/reports"
                className="mobile-button-nav-link"
                onClick={closeMobileMenu}
              >
                Reports
              </Link>
            </li>
            <li>
              <Link
                to="/applications"
                className="mobile-button-nav-link"
                onClick={closeMobileMenu}
              >
                Applications
              </Link>
            </li>
            {user?.role === "Admin" && (
              <li>
                <Link
                  to="/admin"
                  className="mobile-button-nav-link"
                  onClick={closeMobileMenu}
                >
                  Admin Dashboard
                </Link>
              </li>
            )}
            {user?.role === "Resident" && (
              <li>
                <Link
                  to="/resident"
                  className="mobile-button-nav-link"
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </Link>
              </li>
            )}
            {user?.role === "Facility Staff" && (
              <li>
                <Link
                  to="/staff"
                  className="mobile-button-nav-link"
                  onClick={closeMobileMenu}
                >
                  Staff Dashboard
                </Link>
              </li>
            )}
            {user && (
              <li>
                <div
                  className="mobile-button-nav-link"
                  onClick={() =>
                    setMobileNotificationsOpen(!mobileNotificationsOpen)
                  }
                >
                  <FaBell style={{ marginRight: "0.5rem" }} /> Notifications
                </div>
                {mobileNotificationsOpen && (
                  <div
                  className="mobile-button-nav-link"
                  onClick={() => setMobileNotificationsOpen(!mobileNotificationsOpen)}
                >
                  <FaBell style={{ marginRight: "0.5rem" }} />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="mobile-notification-badge">{unreadCount}</span>
                  )}
                </div>
                )}
              </li>
            )}
            <li className="mobile-auth-item">
              {user ? (
                <div className="mobile-user-section">
                  <figure className="user-avatar">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="mobile-user-avatar"
                      />
                    ) : (
                      <i className="fas fa-user mobile-user-icon"></i>
                    )}
                  </figure>
                  <div className="mobile-user-info">
                    <p className="mobile-user-greeting">
                      {user.role === "Admin" && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      closeMobileMenu();
                    }}
                    className="mobile-auth-btn"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    handleGoogleSignIn();
                    closeMobileMenu();
                  }}
                  className="mobile-auth-btn"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Login with Google"}
                </button>
              )}
            </li>
            <li className="mobile-theme-item">
              <button onClick={toggleTheme} className="mobile-theme-toggle">
                <i
                  className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}
                ></i>
                Toggle Theme
              </button>
            </li>
          </menu>
        </div>

        {error && <aside className="auth-error">{error}</aside>}
      </nav>
    </header>
  );
};

export default Navbar;
