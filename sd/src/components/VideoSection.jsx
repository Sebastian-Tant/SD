import React from "react";

const VideoSection = ({ facilityImage }) => {
  return (
    <div className="video-section">
      {facilityImage ? (
        <img
          className="facility-image"
          src={facilityImage}
          alt="Selected Facility"
          onError={(e) => {
            console.error("Image failed to load:", facilityImage);
            e.target.style.display = "none"; // Hide on error
          }}
        />
      ) : (
        <video className="booking-video" autoPlay muted loop data-testid="booking-video">
          <source src="/videos/tennis.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default VideoSection;