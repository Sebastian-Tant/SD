import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddFacility from '../components/AddFacility';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../firebase', () => ({
  db: {},
  collection: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn()
}));

jest.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({
    isLoaded: true,
    loadError: null
  }),
  GoogleMap: () => <div>Google Map Mock</div>,
  Marker: () => <div>Marker Mock</div>,
  Libraries: jest.fn()
}));

describe('Permission-based rendering', () => {
  test('renders form for admin users', () => {
    const { getByText } = render(<AddFacility isAdmin={true} />);
    expect(getByText('Add a New Facility')).toBeInTheDocument();
  });
  it("adds a valid subfacility and resets the form", () => {
    render(<AddFacility />);

    // Simulate entering a valid name
    const nameInput = screen.getByPlaceholderText("e.g., Court 1, Field A");
    fireEvent.change(nameInput, { target: { value: "Court 1" } });

    // Simulate entering a valid capacity
    const capacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    fireEvent.change(capacityInput, { target: { value: "20" } });

    // Click the "Add Subfacility" button
    const addButton = screen.getByText("Add Subfacility");
    fireEvent.click(addButton);

    // ✅ Expect the subfacility to show in the list
    expect(screen.getByText(/Court 1 \(Capacity: 20, Status: available\)/)).toBeInTheDocument();

    // ✅ Expect the input fields to reset
    expect(nameInput.value).toBe("");
    expect(capacityInput.value).toBe("");
  });

  it("does NOT add subfacility if name is empty", () => {
    render(<AddFacility />);

    const capacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    fireEvent.change(capacityInput, { target: { value: "15" } });

    const addButton = screen.getByText("Add Subfacility");
    fireEvent.click(addButton);

    // ❌ No subfacility should be added
    expect(screen.queryByText(/Capacity: 15/)).not.toBeInTheDocument();
  });

  it("does NOT add subfacility if capacity is 0", () => {
    render(<AddFacility />);

    const nameInput = screen.getByPlaceholderText("e.g., Court 1, Field A");
    fireEvent.change(nameInput, { target: { value: "Court 2" } });

    const capacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    fireEvent.change(capacityInput, { target: { value: "0" } });

    const addButton = screen.getByText("Add Subfacility");
    fireEvent.click(addButton);

    // ❌ No subfacility should be added
    expect(screen.queryByText(/Court 2/)).not.toBeInTheDocument();
  });
});