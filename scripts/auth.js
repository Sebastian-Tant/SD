// auth.js - Full Implementation with User Tracking

// 1. JWT Decoder (Keep this if you already have it)
function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

// 2. Main Google Sign-In Handler (REPLACE your existing version with this)
function handleGoogleSignIn(response) {
  console.log("Google auth response received");

  try {
    const user = decodeJwtResponse(response.credential);
    console.log("User data:", user);

    // Store active session
    localStorage.setItem('userToken', response.credential);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', user.name || "User");

    // Redirect based on role
    const role = localStorage.getItem('userRole');
    if (role === 'Admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error("Auth error:", error);
    alert("Login failed. Check console for details.");
  }
}

// 3. Auth Check (Keep this if you have it)
function checkAuth() {
  if (!localStorage.getItem('userToken')) {
    window.location.href = 'index.html';
  }
}

// 4. Sign Out (Keep this if you have it)
function signOut() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
}

// 5. Auto-initialize (NEW - Helps prevent back-button issues)
if (window.location.pathname.includes('dashboard.html')) {
  checkAuth();
}