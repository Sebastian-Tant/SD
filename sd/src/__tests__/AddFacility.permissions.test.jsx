import React from 'react';
import { render } from '@testing-library/react';
import AddFacility from '../components/AddFacility';

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

  test('does not render form for non-admin users', () => {
    const { queryByText } = render(<AddFacility isAdmin={false} />);
    expect(queryByText('Add a New Facility')).not.toBeInTheDocument();
  });
});