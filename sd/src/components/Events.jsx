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

  const formatEventDateTime = (event) => {
    if (!event.start || !event.end) return "Date/time not specified";
    
    try {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      const dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const startTimeStr = startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date format";
    }
  };

  const getEventLocation = (event) => {
    // First try the address field (which we're now saving when creating events)
    if (event.address) return event.address;
    // Fall back to location if address isn't available
    if (event.location) return event.location;
    return "Location not specified";
  };

  return (
    <main className="events-page">
      <h2 className="events-title">All Events</h2>

      <div className="add-event-container">
        <Link to="/add-event" className="add-event-btn">
          ➕ Add New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="no-events-text">No events found.</p>
      ) : (
        <section className="events-grid">
          {events.map((event) => (
            <article className="event-card" key={event.id}>
              <img
                src={event.cover_image_url || "https://via.placeholder.com/300x180?text=No+Image"}
                alt={event.title}
                className="event-img"
              />
              <div className="event-info">
                <h3>{event.title}</h3>
                <p className="event-date-time">{formatEventDateTime(event)}</p>
                <p className="event-location">
                  <strong>Location:</strong> {getEventLocation(event)}
                </p>
                
                <Link to={`/event/${event.id}`}>
                  <button className="view-btn">View Event</button>
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default Events;