import React from "react"; // 👈 Required for JSX to work
import { render, screen } from "@testing-library/react";
import VideoSection from "../components/VideoSection";

describe("VideoSection Component", () => {
  test("renders video element with correct attributes", () => {
    render(<VideoSection />);
    const videoElement = screen.getByTestId("booking-video");
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveClass("booking-video");
    expect(videoElement).toHaveAttribute("autoPlay");
    expect(videoElement).toHaveAttribute("loop");
    expect(videoElement.muted).toBe(true);
});

  test("contains source element with correct video file", () => {
    render(<VideoSection />);
    const videoElement = screen.getByTestId("booking-video");
    const sourceElement = videoElement.querySelector("source");
    expect(sourceElement).toBeInTheDocument();
    expect(sourceElement).toHaveAttribute("src", "/videos/tennis.mp4");
    expect(sourceElement).toHaveAttribute("type", "video/mp4");
  });

  test("shows fallback text for unsupported browsers", () => {
    render(<VideoSection />);
    expect(screen.getByText("Your browser does not support the video tag.")).toBeInTheDocument();
  });

});
