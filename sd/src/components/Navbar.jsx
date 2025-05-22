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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const notificationWrapper = document.querySelector(".notification-wrapper");
      // Also check for mobile notification button/dropdown if it's a separate element that needs to be excluded
      const mobileNotificationTrigger = document.querySelector(".mobile-notification-trigger"); // Example, adjust if needed

      if (notificationWrapper && !notificationWrapper.contains(event.target) &&
          (!mobileNotificationTrigger || !mobileNotificationTrigger.contains(event.target))) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

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
            role: "Resident", // Default role
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
            photoURL: user.photoURL || userSnap.data().photoURL, // Corrected field name
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
    // setMobileNotificationsOpen(false); // Already handled by individual toggles
  };

  const toggleMobileNotifications = () => {
    setMobileNotificationsOpen(!mobileNotificationsOpen);
    // Potentially close main mobile menu if notifications are opened, or handle layout
    if (!mobileNotificationsOpen) {
        // if opening notifications, ensure main menu isn't also trying to be open confusingly
    }
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
            <strong className="logo-text wave-text">
              <span>S</span><span>p</span><span>o</span><span>r</span><span>t</span><span>i</span><span>f</span><span>y</span>
            </strong>
          </a>

          <menu className="desktop-nav">
            <li>
              <Link to="/events" className="button-nav-link">
                Events
              </Link>
            </li>
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
              <Link to="/explore" className="button-nav-link">
                Facilities
              </Link>
            </li>
            <li>
              <Link to="/analytics" className="button-nav-link">
                Analytics
              </Link>
            </li>
            <li>
              <Link to="/reports" className="button-nav-link">
                Reports
              </Link>
            </li>
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
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-expanded={showNotifications}
                  aria-controls="notifications-container-desktop"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                    <div id="notifications-container-desktop" className="notifications-container-desktop-actual">
                        <Notifications setUnreadCount={setUnreadCount} />
                    </div>
                )}
            </div>
            )}
            {user ? (
              <section className="user-section">
                <figure className="user-avatar">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
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
                  </p>
                </div>
                <button onClick={handleSignOut} className="auth-btn">
                  Sign Out
                </button>
              </section>
            ) : (
              <button className="google-signin-button" onClick={handleGoogleSignIn} disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262" className="google-icon">
                  <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" className="google-icon-blue"></path>
                  <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" className="google-icon-green"></path>
                  <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" className="google-icon-yellow"></path>
                  <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" className="google-icon-red"></path>
                </svg>
                <span className="google-signin-text">
                  {loading ? "Signing In..." : "Continue with Google"}
                </span>
              </button>
            )}
            <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <i
                className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}
              ></i>
            </button>
          </menu>

          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu-container"
          >
            <div className="burger-line"></div>
            <div className="burger-line"></div>
            <div className="burger-line"></div>
          </button>
        </section>

        <div
          id="mobile-menu-container"
          className={`mobile-menu-container ${mobileMenuOpen ? "open" : ""}`}
        >
          <menu className="mobile-menu">
            <li><Link to="/events" className="mobile-button-nav-link" onClick={closeMobileMenu}>Events</Link></li>
            <li><Link to="/explore" className="mobile-button-nav-link" onClick={closeMobileMenu}>Facilities</Link></li>
            <li><Link to="/bookings" className="mobile-button-nav-link" onClick={closeMobileMenu}>Bookings</Link></li>
            <li><Link to="/my-bookings" className="mobile-button-nav-link" onClick={closeMobileMenu}>My Bookings</Link></li>
            <li><Link to="/reports" className="mobile-button-nav-link" onClick={closeMobileMenu}>Reports</Link></li>
            <li><Link to="/applications" className="mobile-button-nav-link" onClick={closeMobileMenu}>Applications</Link></li>
            <li><Link to="/application-status" className="mobile-button-nav-link" onClick={closeMobileMenu}>View Applications</Link></li>

            {user?.role === "Admin" && (
              <li><Link to="/admin" className="mobile-button-nav-link" onClick={closeMobileMenu}>Admin Dashboard</Link></li>
            )}
            {user && (
              <li>
                <button
                  className="mobile-button-nav-link mobile-notification-trigger"
                  onClick={toggleMobileNotifications}
                  aria-expanded={mobileNotificationsOpen}
                  aria-controls="mobile-notifications-dropdown-content"
                >
                  <FaBell style={{ marginRight: "0.5rem" }} /> Notifications
                  {unreadCount > 0 && (
                    <span className="mobile-notification-badge">{unreadCount}</span>
                  )}
                </button>
                {mobileNotificationsOpen && (
                  <div id="mobile-notifications-dropdown-content" className="mobile-notifications-dropdown">
                    <Notifications setUnreadCount={setUnreadCount} onClose={() => setMobileNotificationsOpen(false)} />
                  </div>
                )}
              </li>
            )}
            <li className="mobile-auth-item">
              {user ? (
                <div className="mobile-user-section">
                  <figure className="user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || "User"} className="mobile-user-avatar"/>
                    ) : (
                      <i className="fas fa-user mobile-user-icon"></i>
                    )}
                  </figure>
                  <div className="mobile-user-info">
                    <p className="mobile-user-greeting">
                      {user.displayName || "User"}
                      {user.role === "Admin" && (<span className="admin-badge">Admin</span>)}
                    </p>
                  </div>
                  <button onClick={() => { handleSignOut(); closeMobileMenu(); }} className="mobile-auth-btn">
                    Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={() => { handleGoogleSignIn(); closeMobileMenu(); }} className="mobile-auth-btn" disabled={loading}>
                  {loading ? "Signing In..." : "Login with Google"}
                </button>
              )}
            </li>
            <li className="mobile-theme-item">
              <button onClick={() => { toggleTheme(); /* closeMobileMenu(); Optional */ }} className="mobile-theme-toggle">
                <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"} style={{ marginRight: "0.5rem" }}></i>
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