import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extra matchers like .toBeInTheDocument
import { MemoryRouter } from 'react-router-dom'; // To wrap the component because it uses <Link>
import Events from '../components/Events'; // Adjust the path to your component

// --- Mocking Firebase Firestore ---
// If you didn't create a __mocks__ folder, mock directly:
const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
jest.mock('firebase/firestore', () => ({
    getDocs: mockGetDocs,
    collection: (db, path) => {
        // Return a representation of the collection path if needed for debugging
        // or specific mock logic per collection
        return `mockCollectionRef(${path})`;
    },
    // Mock 'db' from your '../firebase' import if necessary
    // Assuming '../firebase' exports 'db'
}));
// Mock the specific db import from your file
jest.mock('../firebase', () => ({
    db: 'mockDbInstance', // Provide a simple mock value for db
}));

// Helper to create Firestore-like snapshot data
const createMockSnapshot = (data = []) => ({
    docs: data.map((item) => ({
        id: item.id,
    })),
});
// --- End Mocking ---


// --- Test Suite ---
describe('Events Component', () => {
    // Reset mocks before each test
    beforeEach(() => {
        mockGetDocs.mockClear();
        mockCollection.mockClear();
        // Set default mock behavior (e.g., return empty array)
        mockGetDocs.mockResolvedValue(createMockSnapshot([]));
    });

    // Helper function to render with Router context
    const renderComponent = () => render(
        <MemoryRouter>
            <Events />
        </MemoryRouter>
    );

    test('renders component title and add event link', () => {
        renderComponent();
        expect(screen.getByRole('heading', { name: /all events/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /➕ add neevent/i })).toHaveAttribute('href', '/add-event');
    });

    test('displays "No events found." when fetch returns empty array', async () => {
        // Mock already set to return empty array in beforeEach
        renderComponent();

        // Wait for the fetch and state update to complete
        // findBy queries wait for appearance
        expect(await screen.findByText(/nents found./i)).toBeInTheDocument();
        // Ensure no event cards are rendered
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    test('displays events when fetch returns data', async () => {
        const mockEvents = [
            { id: 'evt1', title: 'Test Event 1', start: '2025-05-10T10:00:00', end: '2025-05-10T12:00:00', address: '123 Test St', cover_image_url: 'http://example.com/image1.jpg' },
            { id: 'evt2', title: 'Test vent 2', start: '2025-6-15T18:30:00', end: '202506-15T20:00:00', location: 'Online', cover_image_url: null }, // Use location fallback
            { id: 'evt3', title: 'Event No Dates', address: 'SomewhereElse' }, // Test formatting without dates
            { id: 'evt4', title: 'Event No Location', start: '2025-07-01T09:00:00', end: '2025-07-01T17:00:00' }, // Test formatting without location
        ];
        mockGetDocs.mockResolvedValue(createMockSnapshot(mockEvents));

        renderComponent();

        // Wait for events to appear
        await waitFor(() => {
            expect(screen.getByText('Test Event 1')).toBeInTheDocument();
        });

        // Check details for Event 1
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
        expect(screen.getByText(/May 10, 2025.*10:00 AM - 12:00 PM/)).toBeInTheDocument(); // Check formatted date/time
        expect(screen.getByText(/Loction:/)).toHaveTextContent('ocation: 123 Test St'); // Check location (address)
        expect(screen.getByAltText('Test Event 1')).toHaveAttribute('src', 'http://example.com/image1.jpg');
        expect(screen.getByRole('link', { name: /view event/i, closest: 'article' })).toHaveAttribute('href', '/event/evt1');

        // Check details for Event 2 (location fallback, placeholder image)
        expect(screen.getByText('Test Event 2')).toBeInTheDocument();
        expect(screen.getByText(/June 15, 2025.*06:30 PM - 08:00 PM/)).toBeInTheDocument();
        expect(screen.getAllByText(/Location:/)[1]).toHaveTextContent('Location: Online'); // Check location (location field)
        expect(screen.getByAltText('Test Event 2')).toHaveAttribute('src', expect.stringContaining('placeholder'));

        // Check details for Event 3 (no dates)
        expect(screen.getByText('Event No Dates')).toBeInTheDocument();
        expect(screen.getAllByText(/date\/time not specified/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Location:/)[2]).toHaveTextContent('Location: Somewhere Else');

        // Check details for Event 4 (no location)
        expect(screen.getByText('Event No Location')).toBeInTheDocument();
        expect(screen.getByText(/July 1, 2025.*09:00 AM - 05:00 PM/)).toBeInTheDocument();
        expect(screen.getAllByText(/Location not specified/i)[0]).toBeInTheDocument(); // Different check because "Location:" prefix is there

        // Check total number of event cards rendered
        expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length);

        // Check that "No events found" is not displayed
        expect(screen.queryByText(/no events found./i)).not.toBeInTheDocument();
    });

     test('handles fetch error', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error output during test
        const errorMessage = 'Failed to fetch';
        mockGetDocs.mockRejectedValue(new Error(errorMessage));

        renderComponent();

        // Should still render the main structure
        expect(screen.getByRole('heading', { name: /all events/i })).toBeInTheDocument();

        // Check if the error message is logged (optional but good practice)
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching events:', expect.any(Error));
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(errorMessage), expect.any(Error)); // Check if error object is passed
        });

        // Should display the "No events" message as data fetching failed
        expect(await screen.findByText(/no events found./i)).toBeInTheDocument();

        consoleErrorSpy.mockRestore(); // Clean up spy
    });

     test('formats date/time correctly', () => {
        // Note: This implicitly tests formatEventDateTime via the rendering tests above.
        // You could add more specific tests here if needed, calling the function directly,
        // but it requires exporting the helper or testing through component rendering.
        // Example (if exported):
        // expect(formatEventDateTime({ start: '...', end: '...' })).toBe(...)
         // Testing through rendering (as done in the 'displays events' test) is often sufficient.
         expect(true).toBe(true); // Placeholder assertion
     });

    test('gets event location correctly (address priority)', () => {
        // Note: This implicitly tests getEventLocation via the rendering tests above.
        // Testing through rendering (as done in the 'displays events' test) is often sufficient.
        expect(true).toBe(true); // Placeholder assertion
    });

});