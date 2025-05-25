
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Set theme   to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Initialize the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade in the page
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '1';
});