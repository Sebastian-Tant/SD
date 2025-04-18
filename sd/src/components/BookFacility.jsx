// src/components/BookFacility.jsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import "./css-files/BookFacility.css";

const BookFacility = () => {
  const { id } = useParams(); // facility ID from route
  const [selectedSubfacility, setSelectedSubfacility] = useState("Court A");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [showIssues, setShowIssues] = useState(false);

  const reportedIssues = [
    "Court A net is torn.",
    "Lighting faulty after 6PM.",
    "Benches need repair."
  ];

  const timeSlots = [
    "8:00 AM – 9:30 AM",
    "10:00 AM – 11:30 AM",
    "3:00 PM – 4:30 PM"
  ];

  const handleBooking = () => {
    alert(`Booked ${selectedSubfacility} on ${selectedDate} at ${selectedTime}`);
    // 🔥 TODO: send booking to Firestore
  };

  return (
    <section className="book-facility-page">
      <h2>Book Facility</h2>

      <label>
        Subfacility:
        <select value={selectedSubfacility} onChange={(e) => setSelectedSubfacility(e.target.value)}>
          <option>Court A</option>
          <option>Court B</option>
          <option>Court C</option>
        </select>
      </label>

      <button
        className="toggle-issues"
        onClick={() => setShowIssues(!showIssues)}
      >
        {showIssues ? "Hide Issues" : "View Reported Issues with this Facility"}
      </button>

      {showIssues && (
        <div className="reported-issues">
          <h4>Reported Issues:</h4>
          {reportedIssues.map((issue, index) => (
            <p key={index}>⚠️ {issue}</p>
          ))}
        </div>
      )}

      <label>
        Select a Date:
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </label>

      <div className="time-slots">
        <h4>Available Time Slots:</h4>
        {timeSlots.map((slot, index) => (
          <div key={index}>
            <input
              type="radio"
              name="timeslot"
              value={slot}
              checked={selectedTime === slot}
              onChange={() => setSelectedTime(slot)}
            />
            <label>{slot}</label>
          </div>
        ))}
      </div>

      <button className="confirm-btn" onClick={handleBooking}>
        Confirm Booking
      </button>
    </section>
  );
};

export default BookFacility;
