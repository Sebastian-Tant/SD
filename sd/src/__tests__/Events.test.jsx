import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Events from "../components/Events"; // adjust the path if needed

// Firebase mock
jest.mock("../firebase", () => ({
  db: {},
}));
jest.mock("firebase/firestore", () => {
  return {
    collection: jest.fn(),
    getDocs: jest.fn(),
  };
});

import { collection, getDocs } from "firebase/firestore";

// Mock data
const mockEvents = [
  {
    id: "1",
    title: "Event One",
    start: "2025-05-10T10:00:00Z",
    end: "2025-05-10T12:00:00Z",
    location: "Room A",
    cover_image_url: "https://example.com/image1.jpg",
  },
  {
    id: "2",
    title: "Event Two",
    start: "2025-06-01T13:00:00Z",
    end: "2025-06-01T15:00:00Z",
    address: "123 Main Street",
  },
];

describe("Events component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders no events message if no events found", async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(<Events />, { wrapper: MemoryRouter });

    expect(screen.getByText(/All Events/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/No events found/i)).toBeInTheDocument()
    );
  });

  test("renders list of events", async () => {
    getDocs.mockResolvedValueOnce({
      docs: mockEvents.map((e) => ({
        id: e.id,
        data: () => {
          const { id, ...rest } = e;
          return rest;
        },
      })),
    });

    render(<Events />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText("Event One")).toBeInTheDocument();
      expect(screen.getByText("Event Two")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("img").length).toBe(2);
    expect(screen.getAllByText("View Event").length).toBe(2);
  });

  test("renders Add New Event button", () => {
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(<Events />, { wrapper: MemoryRouter });

    expect(screen.getByText(/Add New Event/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add New Event/i })).toHaveAttribute(
      "href",
      "/add-event"
    );
  });

  test("falls back to placeholder image if no image provided", async () => {
    const eventWithoutImage = {
      id: "3",
      title: "Event No Image",
      start: "2025-07-01T08:00:00Z",
      end: "2025-07-01T10:00:00Z",
    };

    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: eventWithoutImage.id,
          data: () => eventWithoutImage,
        },
      ],
    });

    render(<Events />, { wrapper: MemoryRouter });

    await waitFor(() => {
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute(
        "src",
        "https://via.placeholder.com/300x180?text=No+Image"
      );
    });
  });
});
