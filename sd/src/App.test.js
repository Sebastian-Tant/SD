import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';
test('renders main navigation and footer', () => {
  render(<App />);
  
  expect(screen.getAllByText(/Sportify/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/Facilities/i).length).toBeGreaterThanOrEqual(1); // <- Updated

  expect(screen.getByText('Community Sports Hub')).toBeInTheDocument(); // Logo
  expect(screen.getByText(/© 2025 Community Sports Hub/i)).toBeInTheDocument(); // Footer note
  
});


test('renders home page content', () => {
  render(<App />);

  expect(screen.getByText(/Explore Facilities/i)).toBeInTheDocument();
  expect(screen.getByText(/Submit Application/i)).toBeInTheDocument();
});
