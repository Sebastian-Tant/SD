import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AddFacility from '../components/AddFacility'; // Adjust path if necessary
import '@testing-library/jest-dom';
import { act } from 'react'; // Import act

// --- Mocks ---
jest.mock('../firebase', () => ({ // Adjust path if necessary
  db: {},
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mockFacilityId' })),
  setDoc: jest.fn(() => Promise.resolve())
}));

jest.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({
    isLoaded: true,
    loadError: null
  }),
  GoogleMap: ({ children }) => <div>Google Map Mock {children}</div>,
  Marker: () => <div>Marker Mock</div>,
}));

global.alert = jest.fn();

// --- Passed Tests (No Changes Needed) ---
describe('Permission-based rendering and Subfacility Addition', () => {
  test('renders form for admin users', () => {
    render(<AddFacility isAdmin={true} />);
    expect(screen.getByText('Add a New Facility')).toBeInTheDocument();
  });

  it("adds a valid subfacility and resets the form", () => {
    render(<AddFacility />);
    const nameInput = screen.getByPlaceholderText("e.g., Court 1, Field A");
    const capacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    const addButton = screen.getByText("Add Subfacility");

    fireEvent.change(nameInput, { target: { value: "Court 1" } });
    fireEvent.change(capacityInput, { target: { value: "20" } });
    fireEvent.click(addButton);

    expect(screen.getByText(/Court 1 \(Capacity: 20, Status: available\)/)).toBeInTheDocument();
    expect(nameInput.value).toBe("");
    expect(capacityInput.value).toBe("");
  });

  it("does NOT add subfacility if name is empty", () => {
    render(<AddFacility />);
    const capacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    fireEvent.change(capacityInput, { target: { value: "15" } });
    const addButton = screen.getByText("Add Subfacility");
    fireEvent.click(addButton);
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
    expect(screen.queryByText(/Court 2/)).not.toBeInTheDocument();
  });
});

// --- Corrected Failing Test Cases ---
describe('Basic Form Interactions', () => {

  // Test 1: (Passed)
  test('renders the main title and submit button', () => {
    render(<AddFacility />);
    expect(screen.getByRole('heading', { name: 'Add a New Facility' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Facility/i })).toBeInTheDocument();
  });

  // Test 2: (Corrected) Checks if the facility name input updates state
  test('updates facility name state on input change', () => {
    render(<AddFacility />);
    // FIX: Find the specific input element using its 'name' attribute and tag type,
    // differentiating it from the subfacility name input.
    const nameInput = screen.getAllByRole('textbox').find(
        el => el.tagName === 'INPUT' && el.name === 'name' && !el.placeholder // Facility name input criteria
    );
    expect(nameInput).toBeInTheDocument(); // Ensure the input was found

    fireEvent.change(nameInput, { target: { value: 'Community Rec Center' } });
    expect(nameInput.value).toBe('Community Rec Center');
  });

  // Test 3: (Corrected) Checks if the sport type dropdown updates state
  test('updates sport type state on selection change', () => {
    render(<AddFacility />);
    // FIX: Find the specific select element using its 'name' attribute.
    const sportSelect = screen.getAllByRole('combobox').find(
        el => el.name === 'sport_type' // Facility sport type select criteria
    );
    expect(sportSelect).toBeInTheDocument(); // Ensure the select was found

    fireEvent.change(sportSelect, { target: { value: 'Tennis' } });
    expect(sportSelect.value).toBe('Tennis');
  });

  // Test 4: (Passed)
  test('adds an image URL when Add Image button is clicked and clears input', () => {
    render(<AddFacility />);
    const addImageButton = screen.getByRole('button', { name: /Add Image/i });
    const imageInputContainer = addImageButton.closest('div.image-upload');
    const imageUrlInput = within(imageInputContainer).getByRole('textbox');
    const imageUrl = 'http://example.com/image.png';

    fireEvent.change(imageUrlInput, { target: { value: imageUrl } });
    expect(imageUrlInput.value).toBe(imageUrl);
    fireEvent.click(addImageButton);
    expect(screen.getByText(imageUrl)).toBeInTheDocument();
    expect(imageUrlInput.value).toBe('');
  });

   // Test 5: (Passed)
   test('removes a subfacility when its Remove button is clicked', () => {
    render(<AddFacility />);
    const subNameInput = screen.getByPlaceholderText("e.g., Court 1, Field A");
    const subCapacityInput = screen.getByPlaceholderText("Capacity for this subfacility");
    const addSubButton = screen.getByText("Add Subfacility");
    const subfacilityName = "CourtToRemove";

    fireEvent.change(subNameInput, { target: { value: subfacilityName } });
    fireEvent.change(subCapacityInput, { target: { value: "5" } });
    fireEvent.click(addSubButton);

    const addedSubfacilityItem = screen.getByText(new RegExp(`${subfacilityName} \\(Capacity: 5, Status: available\\)`)).closest('li');
    expect(addedSubfacilityItem).toBeInTheDocument();

    const removeButton = within(addedSubfacilityItem).getByRole('button', { name: /Remove/i });
    fireEvent.click(removeButton);

    expect(screen.queryByText(new RegExp(`${subfacilityName} \\(Capacity: 5, Status: available\\)`))).not.toBeInTheDocument();
  });

  
});