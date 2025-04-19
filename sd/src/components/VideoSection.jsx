import React from "react";

const VideoSection = () => {
  return (
<video className="booking-video" autoPlay muted loop data-testid="booking-video">
  <source src="/videos/tennis.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

  );
};

export default VideoSection;
