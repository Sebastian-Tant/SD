<!DOCTYPE html>
<html lang="en" data-theme="dark" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Sports Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://kit.fontawesome.com/6fcd0eade4.js" crossorigin="anonymous"></script>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script src="./scripts/auth.js" defer></script>
  <meta name="google-signin-client_id" content="693363898999-dd7ujp8tvn4gqslte7jdlgimf0rcdtj2.apps.googleusercontent.com">
  <style>
    .hidden { display: none; }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .rise-animation {
      animation: riseUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      opacity: 0;
      transform: translateY(30px);
    }
    @keyframes riseUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .card-1 { animation-delay: 0.2s; }
    .card-2 { animation-delay: 0.4s; }
    .card-3 { animation-delay: 0.6s; }
  </style>
</head>
<body class="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center p-4 transition-colors duration-300">

  <!-- Theme Toggle Button -->
  <button onclick="toggleTheme()" class="absolute top-4 right-4 bg-gray-200/20 dark:bg-gray-800/20 text-gray-800 dark:text-gray-100 p-3 rounded-full hover:bg-gray-300/30 dark:hover:bg-gray-700/30 transition-all duration-300 shadow-md">
    <i id="theme-icon" class="fas fa-moon text-lg"></i>
  </button>

  <!-- Main Content Container -->
  <div class="w-full max-w-4xl">

    <!-- Role Selection Section -->
    <div id="role-selection" class="bg-white/10 dark:bg-gray-800/20 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden fade-in">
      <div class="p-8">
        <h1 class="text-4xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Community Sports Hub</h1>
        <p class="text-center text-gray-600 dark:text-gray-300 mb-8">Select your role to continue</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Resident Card -->
          <div class="role-card card-1 bg-white/20 dark:bg-gray-800/30 hover:bg-white/30 dark:hover:bg-gray-700/40 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-300 border border-white/10 dark:border-gray-700/50" 
               onclick="selectRole('Resident')">
            <div class="bg-blue-100/80 dark:bg-blue-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-user text-3xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <h3 class="text-xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-2">Resident</h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300">Book facilities and join community events</p>
          </div>
          
          <!-- Facility Staff Card -->
          <div class="role-card card-2 bg-white/20 dark:bg-gray-800/30 hover:bg-white/30 dark:hover:bg-gray-700/40 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-300 border border-white/10 dark:border-gray-700/50" 
               onclick="selectRole('Facility Staff')">
            <div class="bg-green-100/80 dark:bg-green-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-tools text-3xl text-green-600 dark:text-green-400"></i>
            </div>
            <h3 class="text-xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-2">Facility Staff</h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300">Manage maintenance and facility operations</p>
          </div>
          
          <!-- Admin Card -->
          <div class="role-card card-3 bg-white/20 dark:bg-gray-800/30 hover:bg-white/30 dark:hover:bg-gray-700/40 p-6 rounded-lg shadow-md cursor-pointer transition-all duration-300 border border-white/10 dark:border-gray-700/50" 
               onclick="selectRole('Admin')">
            <div class="bg-purple-100/80 dark:bg-purple-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-user-shield text-3xl text-purple-600 dark:text-purple-400"></i>
            </div>
            <h3 class="text-xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-2">Administrator</h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300">Manage users, facilities, and system settings</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Auth Section -->
    <div id="auth-section" class="bg-white/10 dark:bg-gray-800/20 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden hidden fade-in">
      <div class="p-8">
        <h2 id="auth-title" class="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Welcome Back</h2>
        <p id="auth-description" class="text-center text-gray-600 dark:text-gray-300 mb-8">Sign in to continue as <span id="selected-role" class="font-semibold text-indigo-600 dark:text-indigo-400">Resident</span></p>
        
        <form class="space-y-4" onsubmit="handleLogin(event)">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div class="relative">
              <input type="email" id="email" required
                     class="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                     placeholder="you@example.com">
              <i class="fa-solid fa-envelope absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div class="relative">
              <input type="password" id="password" required
                     class="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                     placeholder="••••••••">
              <i class="fa-solid fa-lock absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          
          <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg">
            Sign In
          </button>
        </form>
        
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white/10 dark:bg-gray-800/20 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>
          
          <div class="mt-6 grid grid-cols-1 gap-3">
            <div id="g_id_onload"
                 data-client_id="693363898999-dd7ujp8tvn4gqslte7jdlgimf0rcdtj2.apps.googleusercontent.com"
                 data-context="signin"
                 data-ux_mode="popup"
                 data-callback="handleGoogleSignIn"
                 data-auto_prompt="false">
            </div>
            <div class="g_id_signin"
                 data-type="standard"
                 data-shape="rectangular"
                 data-theme="outline"
                 data-text="signin_with"
                 data-size="large"
                 data-logo_alignment="left"
                 data-width="100%">
            </div>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <button onclick="backToRoles()" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors duration-300">
            ← Back to role selection
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Theme Management
    function toggleTheme() {
      const html = document.documentElement;
      const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      html.classList.toggle('dark', newTheme === 'dark');
      
      const icon = document.getElementById('theme-icon');
      icon.classList.toggle('fa-moon', newTheme === 'light');
      icon.classList.toggle('fa-sun', newTheme === 'dark');
    }

    // Role Selection
    function selectRole(role) {
      localStorage.setItem('userRole', role);
      document.getElementById('selected-role').textContent = role;
      document.getElementById('role-selection').classList.add('hidden');
      document.getElementById('auth-section').classList.remove('hidden');
    }

    function backToRoles() {
      localStorage.removeItem('userRole');
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('role-selection').classList.remove('hidden');
    }

    // Form Handling
    function handleLogin(event) {
      event.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      if (email && password) {
        localStorage.setItem('userToken', 'mockToken');
        redirectBasedOnRole();
      } else {
        alert('Please enter valid credentials');
      }
    }

    function redirectBasedOnRole() {
      const role = localStorage.getItem('userRole');
      window.location.href = role === 'Admin' ? 'admin-dashboard.html' : 'dashboard.html';
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Set theme
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      
      const themeIcon = document.getElementById('theme-icon');
      themeIcon.classList.toggle('fa-sun', savedTheme === 'dark');
      themeIcon.classList.toggle('fa-moon', savedTheme === 'light');
      
      // Animate role cards
      document.querySelectorAll('.role-card').forEach(card => {
        card.classList.add('rise-animation');
      });
    });
  </script>
</body>
</html>