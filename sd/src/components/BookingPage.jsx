import React from "react";
import "./css-files/bookingpage.css";
import VideoSection from "./VideoSection";
import BookFacility from "./BookFacility";

const BookingPage = () => {
  return (
    <div className="booking-container">
      <div className="video-section">
        <VideoSection />
      </div>
      <div className="form-section">
        <BookFacility />
      </div>
    </div>
  );
};

export default BookingPage;
