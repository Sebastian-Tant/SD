import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboard from "../components/AdminDashboard";
import * as firestore from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {}
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    firestore.getDocs
      .mockResolvedValueOnce({
        docs: [], // mock empty applications
      })
      .mockResolvedValueOnce({
        docs: [], // mock empty users
      })
      .mockResolvedValueOnce({
        docs: [], // mock empty facilities
      });
  });

  it("renders loading initially", () => {
    render(<AdminDashboard />);
    expect(screen.getByText(/loading data/i)).toBeInTheDocument();
  });

  it('renders "No applications found" after load', async () => {
    render(<AdminDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/no applications found/i)).toBeInTheDocument()
    );
  });

  it('switches to user tab and shows "No users with special roles found"', async () => {
    await waitFor(() => render(<AdminDashboard />));
    const userTab = await screen.findByText(/manage users/i);
    fireEvent.click(userTab);
    await waitFor(() =>
      expect(screen.getByText(/no users with special roles found/i)).toBeInTheDocument()
    );
  });

  it('switches to bookings tab and shows "No bookings for this date"', async () => {
    await waitFor(() => render(<AdminDashboard />));
    const bookingsTab = await screen.findByText(/bookings portal/i);
    fireEvent.click(bookingsTab);
    await waitFor(() =>
      expect(screen.getByText(/no bookings for this date/i)).toBeInTheDocument()
    );
  });

  it("displays loading state while fetching data", () => {
    render(
      <AdminDashboard
        users={[
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'moderator' }
        ]}
      />
    );
    expect(screen.getByText(/loading data/i)).toBeInTheDocument();
  });

 
});
