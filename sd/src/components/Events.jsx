import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import "./css-files/Events.css";

const Events = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="events-page">
      <h2 className="events-title">All Events</h2>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Link to="/add-event">
          <button
            style={{
              margin: "1rem 0",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            ➕ Add New Event
          </button>
        </Link>
      </div>

      {events.length === 0 && (
        <p style={{ textAlign: "center", color: "white", marginTop: "2rem" }}>
          No events found.
        </p>
      )}

      <div className="event-grid">
        {events.map((event) => (
          <div className="event-card" key={event.id}>
            <img
              src={event.cover_image_url || "https://via.placeholder.com/300x180?text=No+Image"}
              alt={event.title}
              className="event-img"
            />
            <div className="event-info">
              <strong>{event.title}</strong>
              <p>{new Date(event.start_time?.seconds * 1000).toLocaleString()}</p>
              <p>{event.location}</p>
              <p>{event.status}</p>

              <Link to={`/event/${event.id}`}>
                <button className="view-btn">View Event</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
