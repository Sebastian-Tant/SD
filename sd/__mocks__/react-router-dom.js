// __mocks__/react-router-dom.js
// If you want to use the real components but mock the hooks,
// you might need to import from the actual library
// For simpler testing, just provide basic wrappers.
import React from 'react';
export const Link = ({ to, children }) => <a href={to}>{children}</a>;
export const useNavigate = jest.fn(() => jest.fn()); // Mock useNavigate

// Add MemoryRouter for testing purposes
export { MemoryRouter as Router } from 'react-router-dom'; // Using actual MemoryRouter