import React from "react";
//yes
const VideoSection = ({ facilityImage }) => {
  return (
    <section className="video-container">
      {facilityImage ? (
        <secion className="image-wrapper">
          <img
            className="facility-image"
            src={facilityImage}
            alt="Selected Facility"
            onError={(e) => {
              console.error("Image failed to load:", facilityImage);
              e.target.style.display = "none"; // Hide on error
            }}
          />
        </secion>
      ) : (
        <video className="booking-video" autoPlay muted loop data-testid="booking-video">
          <source src="/videos/tennis.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </section>
  );
};
export default VideoSection;