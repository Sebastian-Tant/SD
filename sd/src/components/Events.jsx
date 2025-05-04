import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./css-files/Events.css";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [facilitiesMap, setFacilitiesMap] = useState({});
  const [subFacilitiesMap, setSubFacilitiesMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  // Add userRole to your state
  const [userRole, setUserRole] = useState(null);
  const isAdmin = userRole === "Admin";

  // Update your auth state effect to fetch user role
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          setUserRole(userDoc.data()?.role || "user");
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("user");
        }
      }
    });
    return unsubscribe;
  }, []);

  // Add delete event function
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "events", eventId));
      setEvents(events.filter((event) => event.id !== eventId));
      alert("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch events
        const eventSnapshot = await getDocs(collection(db, "events"));
        const eventsData = eventSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsData);
  
        // Fetch facilities
        const facilitySnapshot = await getDocs(collection(db, "facilities"));
        const facilities = {};
        facilitySnapshot.docs.forEach((doc) => {
          facilities[doc.id] = doc.data();
        });
        setFacilitiesMap(facilities);
  
        // Fetch subfacilities
        const subFacilitySnapshot = await getDocs(
          collection(db, "subfacilities")
        );
        const subFacilities = {};
        subFacilitySnapshot.docs.forEach((doc) => {
          subFacilities[doc.id] = doc.data();
        });
        setSubFacilitiesMap(subFacilities);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    // Remove the currentUser check - fetch data regardless of auth state
    fetchAllData();
  }, [currentUser]); // Keep currentUser in dependencies to refetch if auth state changes

  const formatEventDateTime = (event) => {
    if (!event.start || !event.end) return "Date/time not specified";

    try {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      const dateStr = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const startTimeStr = startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date format";
    }
  };

  const getEventLocation = (event) => {
    if (event.address) return event.address;
    if (event.location) return event.location;
    return "Location not specified";
  };

  const getEventCapacity = (event) => {
    let capacity = "Capacity not available";

    if (event.facilityId && facilitiesMap[event.facilityId]) {
      capacity = facilitiesMap[event.facilityId].capacity || "N/A";
    } else if (event.subfacilityId && subFacilitiesMap[event.subfacilityId]) {
      capacity = subFacilitiesMap[event.subfacilityId].capacity || "N/A";
    }

    // If capacity is a number, adjust it based on attendees count
    if (typeof capacity === "number") {
      const attendeesCount = event.attendees?.length || 0;
      return capacity - attendeesCount;
    }

    return capacity;
  };
  // Helper function to send notifications
  const sendNotification = async (userId, message, type, eventId) => {
    try {
      const userRef = doc(db, "users", userId);
      const notification = {
        id: Date.now().toString(),
        message,
        type,
        eventId,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        notifications: arrayUnion(notification),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };
  const handleRsvpClick = async (eventId) => {
    if (!currentUser) {
      alert("Please sign in to RSVP to events");
      return;
    }

    try {
      const eventRef = doc(db, "events", eventId);
      const event = events.find((e) => e.id === eventId);
      const isAttending = event.attendees?.includes(currentUser.uid);

      if (isAttending) {
        // Cancel RSVP
        await updateDoc(eventRef, {
          attendees: arrayRemove(currentUser.uid),
        });
        // Send cancellation notification
        await sendNotification(
          currentUser.uid,
          `Your RSVP for "${event.title}" has been cancelled.`,
          "event",
          eventId
        );
      } else {
        // RSVP
        await updateDoc(eventRef, {
          attendees: arrayUnion(currentUser.uid),
        });

        // Send confirmation notification
        await sendNotification(
          currentUser.uid,
          `You have successfully RSVP'd for "${event.title}".`,
          "event",
          eventId
        );
      }
      // Update local state
      setEvents(
        events.map((event) => {
          if (event.id === eventId) {
            let newAttendees = [...(event.attendees || [])];
            if (isAttending) {
              newAttendees = newAttendees.filter(
                (uid) => uid !== currentUser.uid
              );
            } else {
              newAttendees.push(currentUser.uid);
            }
            return { ...event, attendees: newAttendees };
          }
          return event;
        })
      );
    } catch (error) {
      console.error("Error updating RSVP status:", error);
      alert("Failed to update RSVP status");
    }
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
          {events.map((event) => {
            const isAttending = event.attendees?.includes(currentUser?.uid);
            const remainingCapacity = getEventCapacity(event);
            const isFull =
              typeof remainingCapacity === "number" &&
              remainingCapacity <= 0 &&
              !isAttending;

            return (
              <article className="event-card" key={event.id}>
                <img
                  src={
                    event.cover_image_url ||
                    "https://via.placeholder.com/300x180?text=No+Image"
                  }
                  alt={event.title}
                  className="event-img"
                />
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p className="event-date-time">
                    {formatEventDateTime(event)}
                  </p>
                  <p className="event-location">
                    <strong>Location:</strong> {getEventLocation(event)}
                  </p>
                  <p className="event-capacity">
                    <strong>Capacity:</strong> {remainingCapacity}
                    {typeof remainingCapacity === "number" && (
                      <span> ({event.attendees?.length || 0} attending)</span>
                    )}
                  </p>

                  <div className="event-buttons">
                    <button
                      className={`rsvp-btn ${isAttending ? "rsvp-active" : ""}`}
                      onClick={() => handleRsvpClick(event.id)}
                      disabled={isFull && !isAttending}
                    >
                      {isAttending
                        ? "Cancel RSVP"
                        : isFull
                        ? "Event Full"
                        : "RSVP"}
                    </button>
                    
                    {isAdmin && (
  <button
    className="delete-btn"
    onClick={() => handleDeleteEvent(event.id)}
    title="Delete Event"
  >
    🗑️
  </button>
)}

                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};

export default Events;
