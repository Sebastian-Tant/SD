import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./css-files/EventForm.css";
import { updateDoc, arrayUnion, doc } from "firebase/firestore";
const CreateEventPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [selectedFacilityData, setSelectedFacilityData] = useState(null);
  const [subfacilities, setSubfacilities] = useState([]);
  const [selectedSubfacility, setSelectedSubfacility] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  // Fetch facilities
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFacilities(data);
      } catch (err) {
        console.error("Failed to fetch facilities", err);
        setError("Failed to fetch facilities.");
      }
    };
    fetchFacilities();
  }, []);

  // Fetch subfacilities and set selected facility data
  useEffect(() => {
    const fetchSubfacilities = async () => {
      if (!selectedFacility) return;
      try {
        // Get facility data
        const facility = facilities.find((f) => f.id === selectedFacility);
        setSelectedFacilityData(facility);

        // Get subfacilities
        const querySnapshot = await getDocs(
          collection(db, "facilities", selectedFacility, "subfacilities")
        );
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubfacilities(data);
      } catch (err) {
        console.error("Failed to fetch subfacilities", err);
        setError("Failed to fetch subfacilities.");
      }
    };
    fetchSubfacilities();
  }, [selectedFacility, facilities]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !start || !end || !selectedFacility) {
      setError("Please fill in all required fields.");
      return;
    }

    const newStart = new Date(start);
    const newEnd = new Date(end);

    if (newStart.getMinutes() !== 0 || newEnd.getMinutes() !== 0) {
      setError("Start and end times must be on the hour (e.g., 13:00, 14:00).");
      return;
    }

    if (newEnd <= newStart) {
      setError("End time must be after start time.");
      return;
    }

    try {
      const eventsSnapshot = await getDocs(collection(db, "events"));
      const hasConflict = eventsSnapshot.docs.some((doc) => {
        const event = doc.data();

        if (!event.start || !event.end) return false;

        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        const overlaps = newStart < eventEnd && newEnd > eventStart;

        const blocksSameSub =
          selectedSubfacility && event.subfacilityId === selectedSubfacility;

        const blocksSameFacility =
          !event.subfacilityId && event.facilityId === selectedFacility;

        return overlaps && (blocksSameSub || blocksSameFacility);
      });

      if (hasConflict) {
        setError("Time slot conflicts with an existing event.");
        return;
      }

      await addDoc(collection(db, "events"), {
        title,
        facilityId: selectedFacility,
        subfacilityId: selectedSubfacility || null,
        start,
        end,
        address: selectedFacilityData?.location || "Location not specified",
        createdAt: Timestamp.now(),
      });
      await sendEventNotification(title, selectedFacilityData?.name, newStart);

      alert("Event created successfully.");
      setTitle("");
      setStart("");
      setEnd("");
      setSelectedFacility("");
      setSelectedSubfacility("");
      setSelectedFacilityData(null);
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event.");
    }
  };
  const handleTimeChange = (e, isStart) => {
    const value = e.target.value;
    if (!value) {
      isStart ? setStart("") : setEnd("");
      return;
    }

    // Ensure minutes are always 00
    const [date, time] = value.split("T");
    const [hours] = time ? time.split(":") : ["00"];
    const formattedValue = `${date}T${hours}:00`;

    isStart ? setStart(formattedValue) : setEnd(formattedValue);
  };
  // Add this new function to CreateEventPage.js
  const sendEventNotification = async (
    eventTitle,
    facilityName,
    eventStart
  ) => {
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, "users"));

      // Create notification message
      const formattedDate = eventStart.toLocaleString();
      const notificationMessage = `New event: ${eventTitle} at ${facilityName} on ${formattedDate}`;

      // Create notification object
      const newNotification = {
        id: Date.now().toString(),
        message: notificationMessage,
        read: false,
        createdAt: Timestamp.now(),
        type: "event",
      };

      // Update each user's notifications
      const batchUpdates = [];
      usersSnapshot.forEach((userDoc) => {
        const userRef = doc(db, "users", userDoc.id);
        batchUpdates.push(
          updateDoc(userRef, {
            notifications: arrayUnion(newNotification),
          })
        );
      });

      // Execute all updates
      await Promise.all(batchUpdates);
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  };
  return (
    <div className="event-page" style={{ paddingBottom: "100px" }}>
      <h2>Create Facility-Blocking Event</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} className="event-form">
        <label>Title:</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label>Facility:</label>
        <select
          value={selectedFacility}
          onChange={(e) => {
            setSelectedFacility(e.target.value);
            setSelectedSubfacility("");
          }}
          required
        >
          <option value="">Select Facility</option>
          {facilities?.map((fac) => (
            <option key={fac.id} value={fac.id}>
              {fac.name}
            </option>
          ))}
        </select>

        {selectedFacilityData && (
          <div className="facility-info">
            <p>
              <strong>Location:</strong>{" "}
              {selectedFacilityData.location || "Location not specified"}
            </p>
          </div>
        )}

        {subfacilities.length > 0 && (
          <>
            <label>Subfacility:</label>
            <select
              value={selectedSubfacility}
              onChange={(e) => setSelectedSubfacility(e.target.value)}
            >
              {subfacilities.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Start Time:</label>
        <label>Start Time:</label>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => handleTimeChange(e, true)}
          required
          step="3600"
        />

        <label>End Time:</label>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => handleTimeChange(e, false)}
          required
          step="3600"
        />
        <button type="submit" className="submit-button">
          Create Event
        </button>
      </form>
    </div>
  );
};

export default CreateEventPage;