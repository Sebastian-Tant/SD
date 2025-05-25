import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BookingPage from "../components/BookingPage";

// Mock the child components
jest.mock("../components/VideoSection", () => ({ facilityImage }) => (
  <div data-testid="video-section">{facilityImage ? `Image: ${facilityImage}` : "No Image"}</div>
));

jest.mock("../components/BookFacility", () => ({ onFacilitySelect }) => (
  <button data-testid="book-facility-button" onClick={() => onFacilitySelect("image.png")}>
    Select Facility
  </button>
));

describe("BookingPage Component", () => {
  test("renders VideoSection and BookFacility", () => {
    render(<BookingPage />);

    // Check both sections are rendered
    expect(screen.getByTestId("video-section")).toBeInTheDocument();
    expect(screen.getByTestId("book-facility-button")).toBeInTheDocument();
  });

  test("updates facility image when facility is selected", () => {
    render(<BookingPage />);
    
    const videoSection = screen.getByTestId("video-section");
    expect(videoSection).toHaveTextContent("No Image");

    const button = screen.getByTestId("book-facility-button");
    fireEvent.click(button);

    expect(screen.getByTestId("video-section")).toHaveTextContent("Image: image.png");
  });
});
