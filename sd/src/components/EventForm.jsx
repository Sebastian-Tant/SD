// src/components/EventForm.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import "./css-files/EventForm.css";

const EventForm = () => {
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tags: "",
    audience: "",
    disclaimers: "",
    facility_id: "",
    location: "",
    start_time: "",
    end_time: "",
    booking_deadline: "",
    capacity: 0,
    spots_booked: 0,
    status: "upcoming",
    is_featured: false,
    cover_image_url: "",
    host_name: "",
    contact_email: "",
    contact_phone: "",
    rating: 0,
  });

  // Fetch all facilities on load
  useEffect(() => {
    const fetchFacilities = async () => {
      const snapshot = await getDocs(collection(db, "facilities"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFacilities(data);
    };

    fetchFacilities();
  }, []);

  // When facility is selected, update facility_id and location
  const handleFacilityChange = (e) => {
    const selectedId = e.target.value;
    const selectedFacility = facilities.find(f => f.id === selectedId);
    setForm(prev => ({
      ...prev,
      facility_id: selectedId,
      location: selectedFacility?.location || ""
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "events"), {
        ...form,
        tags: form.tags.split(",").map(tag => tag.trim()),
        capacity: Number(form.capacity),
        spots_booked: 0,
        rating: 0,
        start_time: Timestamp.fromDate(new Date(form.start_time)),
        end_time: Timestamp.fromDate(new Date(form.end_time)),
        booking_deadline: Timestamp.fromDate(new Date(form.booking_deadline)),
      });
      alert("Event created successfully!");
      console.log("Event ID:", docRef.id);
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event.");
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>Create Event</h2>

      <label>Title</label>
      <input name="title" value={form.title} onChange={handleChange} required />

      <label>Description</label>
      <textarea name="description" value={form.description} onChange={handleChange} required />

      <label>Tags (comma separated)</label>
      <input name="tags" value={form.tags} onChange={handleChange} />

      <label>Audience</label>
      <input name="audience" value={form.audience} onChange={handleChange} />

      <label>Disclaimers</label>
      <textarea name="disclaimers" value={form.disclaimers} onChange={handleChange} />

      <label>Facility</label>
      <select value={form.facility_id} onChange={handleFacilityChange} required>
        <option value="">Select Facility</option>
        {facilities.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <label>Location</label>
      <input name="location" value={form.location} readOnly />

      <label>Start Time</label>
      <input type="datetime-local" name="start_time" onChange={handleChange} required />

      <label>End Time</label>
      <input type="datetime-local" name="end_time" onChange={handleChange} required />

      <label>Booking Deadline</label>
      <input type="datetime-local" name="booking_deadline" onChange={handleChange} required />

      <label>Capacity</label>
      <input name="capacity" type="number" value={form.capacity} onChange={handleChange} />

      <label>Cover Image URL</label>
      <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange} />

      <label>Host Name</label>
      <input name="host_name" value={form.host_name} onChange={handleChange} required />

      <label>Contact Email</label>
      <input name="contact_email" value={form.contact_email} onChange={handleChange} required />

      <label>Contact Phone</label>
      <input name="contact_phone" value={form.contact_phone} onChange={handleChange} required />

      <label>
        <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} />
        Feature this event?
      </label>

      <button type="submit">Create Event</button>
    </form>
  );
};

export default EventForm;
