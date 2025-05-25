import React, { useState, useEffect, useRef } from "react";
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileUserDropdown, setShowMobileUserDropdown] = useState(false);
  const [showMobileNotificationsComponent, setShowMobileNotificationsComponent] = useState(false);

  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // set dark group
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserDropdown]);

  // close navbar on mobile if you click outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest(".nav_bar") // Prevent closing if clicking the menu button
      ) {
        closeMobileMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        const userRef = doc(db, "users", authUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: authUser.uid,
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
            role: "Resident",
          });
          setUser({
            uid: authUser.uid,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            role: "Resident",
          });
        } else {
          setUser({
            uid: authUser.uid,
            displayName: authUser.displayName || userSnap.data().displayName,
            photoURL: authUser.photoURL || userSnap.data().photoURL,
            role: userSnap.data().role,
          });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // put count of unread notifications
  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
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
      closeMobileMenu();
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setShowUserDropdown(false);
      setShowMobileUserDropdown(false);
      closeMobileMenu();
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
    setShowMobileNotificationsComponent(false);
    setShowMobileUserDropdown(false);
  };

  const handleMobileDropdownLinkClick = () => {
    setShowMobileUserDropdown(false);
    closeMobileMenu();
  };

  const commonNavLinks = (
    <>
      <li><Link to="/events" className="button-nav-link">Events</Link></li>
      <li><Link to="/explore" className="button-nav-link">Facilities</Link></li>
      <li><Link to="/reports" className="button-nav-link">Reports</Link></li>
    </>
  );

  const adminNavLinks = (
    <>
      {user?.role === "Admin" && (
        <>
          <li><Link to="/analytics" className="button-nav-link">Analytics</Link></li>
          <li><Link to="/admin" className="button-nav-link">Admin Dashboard</Link></li>
        </>
      )}
    </>
  );

  const mobileCommonNavLinks = (
    <>
      <li><Link to="/events" className="mobile-button-nav-link" onClick={closeMobileMenu}>Events</Link></li>
      <li><Link to="/explore" className="mobile-button-nav-link" onClick={closeMobileMenu}>Facilities</Link></li>
      <li><Link to="/reports" className="mobile-button-nav-link" onClick={closeMobileMenu}>Reports</Link></li>
    </>
  );

  const mobileAdminNavLinks = (
    <>
      {user?.role === "Admin" && (
        <>
          <li><Link to="/analytics" className="mobile-button-nav-link" onClick={closeMobileMenu}>Analytics</Link></li>
          <li><Link to="/admin" className="mobile-button-nav-link" onClick={closeMobileMenu}>Admin Dashboard</Link></li>
        </>
      )}
    </>
  );

  return (
    <header className="navbar-header">
      <nav className="navbar-container">
        <section className="navbar-content">
          <Link to="/" className="logo">
            <figure className="logo-icon">
              <img
                src={theme === "dark" ? dark_logo : light_logo}
                alt="Community Sports Hub Logo"
                className="logo-img"
              />
            </figure>
            <strong className="logo-text">Sportify</strong>
          </Link>

          <menu className="desktop-nav">
            {commonNavLinks}
            {adminNavLinks}

            {user && (
              <section className="notification-wrapper" ref={notificationRef}>
                <button
                  className="notification-button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Toggle notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && <Notifications setUnreadCount={setUnreadCount} />}
              </section>
            )}

            {user ? (
              <section className="user-section" ref={userDropdownRef}>
                <button
                  className="user-avatar-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  aria-label="Toggle user menu"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="user-avatar-img"
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </button>
                {showUserDropdown && (
                  <section className="user-dropdown">
                    <p className="user-role-badge">
                      {user.role === "Admin" && <span className="admin-badge">Admin</span>}
                      {user.role === "Facility Staff" && <span className="staff-badge">Staff</span>}
                      {user.role === "Resident" && <span className="resident-badge">Resident</span>}
                    </p>
                    {user?.role === "Resident" && (
                      <ul className="user-dropdown-links">
                        <li>
                          <Link to="/my-bookings" onClick={() => setShowUserDropdown(false)}>
                            My Bookings
                          </Link>
                        </li>
                        <li>
                          <Link to="/application-status" onClick={() => setShowUserDropdown(false)}>
                            My Applications
                          </Link>
                        </li>
                      </ul>
                    )}
                  </section>
                )}
                <button
                  onClick={handleSignOut}
                  className="google-auth-button sign-out-btn"
                  disabled={loading}
                >
                  <span className="text">Sign Out</span>
                </button>
              </section>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="google-auth-button"
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid"
                  viewBox="0 0 256 262"
                  className="svg"
                >
                  <path
                    fill="#4285F4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    className="blue"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    className="green"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                    className="yellow"
                  ></path>
                  <path
                    fill="#EB4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    className="red"
                  ></path>
                </svg>
                <span className="text">{loading ? "Signing In..." : "Continue with Google"}</span>
              </button>
            )}
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}></i>
            </button>
          </menu>

          <button
            className={`nav_bar ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <section className="bar1"></section>
            <section className="bar2"></section>
            <section className="bar3_h"></section>
            <section className="bar4"></section>
          </button>
        </section>

        <section
          className={`mobile-menu-container ${mobileMenuOpen ? "open" : ""}`}
          ref={mobileMenuRef}
        >
          <menu className="mobile-menu">
            {mobileCommonNavLinks}
            {mobileAdminNavLinks}

            {user && (
              <li className="mobile-notification-item">
                <button
                  className="mobile-notification-icon-btn"
                  onClick={() => setShowMobileNotificationsComponent(!showMobileNotificationsComponent)}
                  aria-label="Toggle mobile notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>
                {showMobileNotificationsComponent && (
                  <section className="mobile-notifications-panel">
                    <Notifications setUnreadCount={setUnreadCount} />
                  </section>
                )}
              </li>
            )}

            <li className="mobile-auth-item">
              {user ? (
                <section className="mobile-user-details-area">
                  <button
                    className="mobile-user-profile-toggle"
                    onClick={() => setShowMobileUserDropdown(!showMobileUserDropdown)}
                    aria-expanded={showMobileUserDropdown}
                  >
                    <figure className="user-avatar">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="mobile-user-avatar"
                        />
                      ) : (
                        <i className="fas fa-user mobile-user-icon"></i>
                      )}
                    </figure>
                    <section className="mobile-user-info">
                      <p className="mobile-user-display-name">{user.displayName || "User"}</p>
                      <p className="mobile-user-role-badge">
                        {user.role === "Admin" && <span className="admin-badge">Admin</span>}
                        {user.role === "Facility Staff" && <span className="staff-badge">Staff</span>}
                        {user.role === "Resident" && <span className="resident-badge">Resident</span>}
                      </p>
                    </section>
                    <i
                      className={`fas ${showMobileUserDropdown ? "fa-chevron-up" : "fa-chevron-down"} mobile-dropdown-indicator`}
                    ></i>
                  </button>

                  {showMobileUserDropdown && (
                    <section className="mobile-user-dropdown-content">
                      {user?.role === "Resident" && (
                        <ul className="user-dropdown-links">
                          <li>
                            <Link to="/my-bookings" onClick={handleMobileDropdownLinkClick}>
                              My Bookings
                            </Link>
                          </li>
                          <li>
                            <Link to="/application-status" onClick={handleMobileDropdownLinkClick}>
                              My Applications
                            </Link>
                          </li>
                        </ul>
                      )}
                    </section>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="google-auth-button mobile-google-auth-button sign-out-btn"
                    disabled={loading}
                  >
                    <span className="text">Sign Out</span>
                  </button>
                </section>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="google-auth-button mobile-google-auth-button"
                  disabled={loading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid"
                    viewBox="0 0 256 262"
                    className="svg"
                  >
                    <path
                      fill="#4285F4"
                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                      className="blue"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                      className="green"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                      className="yellow"
                    ></path>
                    <path
                      fill="#EB4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                      className="red"
                    ></path>
                  </svg>
                  <span className="text">{loading ? "Signing In..." : "Continue with Google"}</span>
                </button>
              )}
            </li>

            <li className="mobile-theme-item">
              <button onClick={toggleTheme} className="mobile-theme-toggle">
                <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"} style={{ marginRight: "0.5rem" }}></i>
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