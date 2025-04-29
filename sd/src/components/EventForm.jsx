import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import "./css-files/EventForm.css";

const EventForm = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [facilities, setFacilities] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedFacilityCapacity, setSelectedFacilityCapacity] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    audience: "",
    facility_id: "",
    location: "",
    start_time: "",
    end_time: "",
    booking_deadline: "",
    capacity: 0,
    spots_booked: 0,
    status: "upcoming",
    rating: 0,
    assigned_staff_ids: [],
  });

  useEffect(() => {
    if (!user && !loadingAuth) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch facilities
        const facilitiesSnapshot = await getDocs(collection(db, "facilities"));
        const facilitiesData = facilitiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFacilities(facilitiesData);

        const usersSnapshot = await getDocs(collection(db, "users"));
        const staffData = usersSnapshot.docs
          .filter((doc) => doc.data().role === "Facility Staff")
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        setStaff(staffData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please check console for details.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user, loadingAuth]);

  const handleFacilityChange = (e) => {
    const selectedId = e.target.value;
    const selectedFacility = facilities.find((f) => f.id === selectedId);
    setForm((prev) => ({
      ...prev,
      facility_id: selectedId,
      location: selectedFacility?.location || "",
      capacity: 0, // Reset capacity when facility changes
    }));
    setSelectedFacilityCapacity(selectedFacility?.capacity || null);
    setError(null); // Clear any previous errors
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for capacity field
    if (name === "capacity") {
      const newCapacity = parseInt(value, 10) || 0;
      
      if (selectedFacilityCapacity && newCapacity > selectedFacilityCapacity) {
        setError(`Capacity cannot exceed facility maximum of ${selectedFacilityCapacity}`);
        return;
      }
      setError(null); // Clear error if validation passes
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStaffSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    setForm((prev) => ({
      ...prev,
      assigned_staff_ids: selectedOptions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation before submit
    if (selectedFacilityCapacity && form.capacity > selectedFacilityCapacity) {
      setError(`Capacity cannot exceed facility maximum of ${selectedFacilityCapacity}`);
      return;
    }

    try {
      setError(null);
      setSubmitSuccess(false);

      const docRef = await addDoc(collection(db, "events"), {
        ...form,
        capacity: Number(form.capacity),
        spots_booked: 0,
        rating: 0,
        start_time: Timestamp.fromDate(new Date(form.start_time)),
        end_time: Timestamp.fromDate(new Date(form.end_time)),
        booking_deadline: Timestamp.fromDate(new Date(form.booking_deadline)),
        created_by: user?.uid,
        created_at: Timestamp.now(),
      });

      setSubmitSuccess(true);
      console.log("Event created with ID:", docRef.id);

      // Reset form after successful submission
      setForm({
        title: "",
        description: "",
        audience: "",
        facility_id: "",
        location: "",
        start_time: "",
        end_time: "",
        booking_deadline: "",
        capacity: 0,
        spots_booked: 0,
        status: "upcoming",
        rating: 0,
        assigned_staff_ids: [],
      });
      setSelectedFacilityCapacity(null);
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event. Please try again.");
    }
  };

  if (loadingAuth) return <div>Checking authentication...</div>;
  if (!user)
    return <div className="auth-message">Please sign in to create events.</div>;
  if (loading) return <div>Loading event form...</div>;

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>Create Event</h2>

      {submitSuccess && (
        <div className="success-message">Event created successfully!</div>
      )}

      {error && <div className="error-message">{error}</div>}

      <label>Title</label>
      <input name="title" value={form.title} onChange={handleChange} required />

      <label>Description</label>
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        required
      />

      <label>Audience</label>
      <input
        name="audience"
        value={form.audience}
        onChange={handleChange}
        placeholder="e.g., All ages, Adults only"
      />

      <label>Facility</label>
      <select value={form.facility_id} onChange={handleFacilityChange} required>
        <option value="">Select Facility</option>
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <label>Location</label>
      <input name="location" value={form.location} readOnly />

      <label>Start Time</label>
      <input
        type="datetime-local"
        name="start_time"
        value={form.start_time}
        onChange={handleChange}
        required
      />

      <label>End Time</label>
      <input
        type="datetime-local"
        name="end_time"
        value={form.end_time}
        onChange={handleChange}
        required
      />

      <label>Booking Deadline</label>
      <input
        type="datetime-local"
        name="booking_deadline"
        value={form.booking_deadline}
        onChange={handleChange}
        required
      />

      <label>Capacity</label>
      {selectedFacilityCapacity && (
        <p className="capacity-info">
          Maximum capacity for this facility: {selectedFacilityCapacity}
        </p>
      )}
      <input
        name="capacity"
        type="number"
        value={form.capacity}
        onChange={handleChange}
        min="1"
        max={selectedFacilityCapacity || undefined}
        required
        disabled={!form.facility_id}
      />

      <label>Assign Facility Staff</label>
      {staff.length > 0 ? (
        <>
          <select
            multiple
            name="assigned_staff_ids"
            value={form.assigned_staff_ids}
            onChange={handleStaffSelection}
            className="staff-select"
          >
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || person.email || `Staff ${person.id}`}
              </option>
            ))}
          </select>
          <p className="staff-select-helper">
            Hold Ctrl/Cmd to select multiple staff members
          </p>
        </>
      ) : (
        <p className="no-staff-message">
          No staff members found. Please check your database.
        </p>
      )}

      <button type="submit" className="submit-button">
        Create Event
      </button>
    </form>
  );
};

export default EventForm;