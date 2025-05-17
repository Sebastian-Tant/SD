import React, { useState } from "react";
import "./css-files/bookingpage.css";
import VideoSection from "./VideoSection";
import BookFacility from "./BookFacility";

const BookingPage = () => {
  const [facilityImage, setFacilityImage] = useState(null);

  return (
    <div className="booking-container">
      <div className="video-section">
        <VideoSection facilityImage={facilityImage} />
      </div>
      <div className="form-section">
        <BookFacility onFacilitySelect={setFacilityImage} />
      </div>
    </div>
  );
};

export default BookingPage;