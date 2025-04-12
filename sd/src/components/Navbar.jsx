import React, { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./css-files/navbar.css";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if user exists in Firestore, if not create a minimal record
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date(),
            lastLogin: new Date(),
          });
        } else {
          // Update last login time
          await setDoc(
            userRef,
            {
              lastLogin: new Date(),
              displayName: user.displayName,
              photoURL: user.photoURL,
            },
            { merge: true }
          );
        }

        setUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
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

          {/* Desktop Navigation */}
          <menu className="desktop-nav">
            <li>
              <a href="#events" className="nav-link">
                Events
              </a>
            </li>
            <li>
              <a href="#facilities" className="nav-link">
                Facilities
              </a>
            </li>
            <li>
              <a href="#contact" className="nav-link">
                Contact
              </a>
            </li>
            <li>
              <a href="#applications" className="nav-link">
                Applications
              </a>
            </li>

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
                <p className="user-greeting">
                  Hi, {user.displayName || 'User'}!
                </p>
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <menu className="mobile-menu">
            <li>
              <a href="#events" className="mobile-nav-link">
                Events
              </a>
            </li>
            <li>
              <a href="#facilities" className="mobile-nav-link">
                Facilities
              </a>
            </li>
            <li>
              <a href="#contact" className="mobile-nav-link">
                Contact
              </a>
            </li>
            <li>
              <a href="#applications" className="mobile-nav-link">
                Applications
              </a>
            </li>

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
                <p className="mobile-user-greeting">
                  Hi, {user.displayName || 'User'}!
                </p>
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