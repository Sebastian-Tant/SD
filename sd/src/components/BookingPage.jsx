import React, { useState } from "react";
import "./css-files/bookingpage.css";
import VideoSection from "./VideoSection";
import BookFacility from "./BookFacility";

const BookingPage = () => {
  const [facilityImage, setFacilityImage] = useState(null);
//intuitive
  return (
    <section className="booking-container">
      <section className="video-section">
        <VideoSection facilityImage={facilityImage} />
      </section>
      <section className="form-section">
        <BookFacility onFacilitySelect={setFacilityImage} />
      </section>
    </section>
  );
};

export default BookingPage;