import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./css-files/EventForm.css";
import { updateDoc, arrayUnion, doc } from "firebase/firestore";
import { toast } from "react-toastify";

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
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      if (!selectedFacility) {
        setSubfacilities([]);
        setSelectedSubfacility("");
        return;
      }

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
        setSelectedSubfacility(""); // Reset subfacility selection when facility changes
      } catch (err) {
        console.error("Failed to fetch subfacilities", err);
        setError("Failed to fetch subfacilities.");
      }
    };
    fetchSubfacilities();
  }, [selectedFacility, facilities]);
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or GIF images are allowed");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5mb file limit
    if (file.size > maxSize) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setImage(file);
    // Show preview
    setImagePreview(URL.createObjectURL(file));
  };

  const roundToNextHour = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    if (now.getTime() < Date.now()) {
      now.setHours(now.getHours() + 1);
    }

    // Format as date
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:00`;
  };
  // Add this new function to block times
  const blockTimesForEvent = async (
    facilityId,
    subfacilityId,
    start,
    end,
    eventId
  ) => {
    try {
      const eventStart = new Date(start);
      const eventEnd = new Date(end);
      const eventDate = eventStart.toISOString().split("T")[0];

      const hoursToBlock = [];
      for (
        let hour = eventStart.getHours();
        hour < eventEnd.getHours();
        hour++
      ) {
        hoursToBlock.push(`${hour.toString().padStart(2, "0")}:00`);
      }

      if (subfacilityId) {
        const subfacilityRef = doc(
          db,
          "facilities",
          facilityId,
          "subfacilities",
          subfacilityId
        );
        await updateDoc(subfacilityRef, {
          blockedTimes: arrayUnion({
            date: eventDate,
            times: hoursToBlock,
            eventId: eventId,
          }),
        });
      } else {
        const facilityRef = doc(db, "facilities", facilityId);
        await updateDoc(facilityRef, {
          blockedTimes: arrayUnion({
            date: eventDate,
            times: hoursToBlock,
            eventId: eventId,
          }),
        });
      }
    } catch (error) {
      console.error("Error blocking times:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); 

    if (!title || !start || !end || !selectedFacility) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const newStart = new Date(start);
    const newEnd = new Date(end);

    if (newEnd <= newStart) {
      toast.error("End time must be after start time.");
      return;
    }

    const now = new Date();
    now.setMinutes(0, 0, 0);

    if (newStart < now) {
      toast.error("Start time cannot be in the past.");
      return;
    }

    try {
      // Check for conflicts with existing events
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

      // Upload image if there is one
      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split(".").pop();
        const filename = `event_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, `event-images/${filename}`);

        const metadata = {
          contentType: image.type,
        };

        const snapshot = await uploadBytes(storageRef, image, metadata);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Create the event first
      const docRef = await addDoc(collection(db, "events"), {
        title,
        facilityId: selectedFacility,
        subfacilityId: selectedSubfacility || null,
        start,
        end,
        address: selectedFacilityData?.location || "Location not specified",
        createdAt: Timestamp.now(),
        image: imageUrl,
      });

      // Now block the times in the facility/subfacility
      await blockTimesForEvent(
        selectedFacility,
        selectedSubfacility,
        start,
        end,
        docRef.id
      );

      // Send notifications
      await sendEventNotification(title, selectedFacilityData?.name, newStart);

      toast.success("Event created successfully.");
      setTitle("");
      setStart("");
      setEnd("");
      setSelectedFacility("");
      setSelectedSubfacility("");
      setSelectedFacilityData(null);
      setImage(null);
      setImagePreview("");
    } catch (err) {
      console.error("Error creating event:", err);
      toast.error("Failed to create event.");
    }finally {
    setIsSubmitting(false); // reset loading state
  }
  };
  const handleImageDelete = () => {
    setImage(null);
    setImagePreview("");
    // Reset the file input
    document.querySelector('input[type="file"]').value = "";
  };
  const handleTimeChange = (e, isStart) => {
    const value = e.target.value;
    if (!value) return;

    // Create a date 
    const localDate = new Date(value);

    // Round to the nearest hour
    localDate.setMinutes(0, 0, 0);

    // Format as string
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    const hours = String(localDate.getHours()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}T${hours}:00`;

    if (isStart) {
      if (localDate < new Date()) {
        toast.error("Start time cannot be in the past.");
        return;
      }
      setStart(formattedDate);
    } else {
      if (start && new Date(start) >= localDate) {
        toast.error("End time must be after start time.");
        return;
      }
      setEnd(formattedDate);
    }
  };

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
    <section className="event-page" style={{ paddingBottom: "100px" }}>
      <h2>Create Event</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} className="event-form">
        <label htmlFor="event-title">Title:</label> {/* Added htmlFor */}
        <input
          id="event-title" // Added id
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label htmlFor="event-facility">Facility:</label> 
        <select
          id="event-facility" // Added id
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
          <section className="facility-info">
            <p>
              <strong>Location:</strong>{" "}
              {selectedFacilityData.location || "Location not specified"}
            </p>
          </section>
        )}

        {/* Subfacility Field (Optional) */}
        {subfacilities.length > 0 && (
          <>
            <label htmlFor="event-subfacility">Subfacility (Optional):</label> {/* Added htmlFor */}
            <select
              id="event-subfacility" // Added id for subfacility
              value={selectedSubfacility}
              onChange={(e) => setSelectedSubfacility(e.target.value)}
            >
              <option value="">None</option>
              {subfacilities.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Image Upload */}
        <section className="image-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="custom-file-input"
            id="file-upload" 
          />
          <label htmlFor="file-upload" className="custom-file-label"> 
            Upload Image/GIF
          </label>
        </section>
        {imagePreview && (
          <section className="image-preview-container">
            <section className="image-preview">
              <img src={imagePreview} alt="Event preview" />
              <button
                type="button"
                className="delete-image-button"
                onClick={handleImageDelete}
              >
                &times;
              </button>
            </section>
          </section>
        )}

        <label htmlFor="start-time">Start Time:</label> {/* Added htmlFor */}
        <input
          id="start-time" 
          type="datetime-local"
          value={start}
          min={roundToNextHour()} 
          step="3600" // 3600 seconds = 1 hour 
          onChange={(e) => handleTimeChange(e, true)}
          required
        />

        <label htmlFor="end-time">End Time:</label> {/* Added htmlFor */}
        <input
          id="end-time" // Added id
          type="datetime-local"
          value={end}
          min={start || roundToNextHour()} // End time cannot be before start time or current hour
          step="3600"
          onChange={(e) => handleTimeChange(e, false)}
          required
        />

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Create Event"}
        </button>
      </form>
    </section>
  );
};

export default CreateEventPage;
