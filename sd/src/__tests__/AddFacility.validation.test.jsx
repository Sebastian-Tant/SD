import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import AddFacility from '../components/AddFacility';
import React from 'react';

// Mock the useLoadScript hook
jest.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({
    isLoaded: true,
    loadError: null,
  }),
  GoogleMap: () => <div>Google Map</div>,
  Marker: () => <div>Marker</div>,
}));

describe('Form validation', () => {
  test('requires name field', async () => {
    render(<AddFacility isAdmin={true} />);
    
    // Get the submit button and click it
    const submitButton = screen.getByRole('button', { name: /submit facility/i });
    fireEvent.click(submitButton);
    
    // Check that the name field is invalid
    const nameInput = screen.getByRole('textbox', { name: /name/i });
    expect(nameInput).toBeInvalid();
  });

  test('validates capacity is a positive number', async () => {
    render(<AddFacility isAdmin={true} />);
    
    const capacityInput = screen.getByRole('spinbutton', { name: /overall capacity/i });
    
    // First test with a valid value
    fireEvent.change(capacityInput, { target: { value: '10' } });
    expect(capacityInput).toBeValid();
    
    // Then test with a negative value
    fireEvent.change(capacityInput, { target: { value: '-5' } });
    
    // Check the validity
    expect(capacityInput).toHaveAttribute('min', '0');
    expect(capacityInput).toBeInvalid();
    
    // Alternatively, check the validation message
    expect(capacityInput.validity.rangeUnderflow).toBe(true);
  });
});