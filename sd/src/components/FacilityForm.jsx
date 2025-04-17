import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import "./css-files/FacilityForm.css";

const FacilityForm = () => {
  const [form, setForm] = useState({
    name: "",
    location: "",
    sport_type: "Basketball",
    status: "open",
    capacity: 0,
    description: "",
    newImage: "",
    images: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageAdd = () => {
    if (form.newImage.trim() !== "") {
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, form.newImage],
        newImage: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting...");

    try {
      const docRef = await addDoc(collection(db, "facilities"), {
        name: form.name,
        location: form.location,
        sport_type: form.sport_type,
        status: form.status,
        capacity: Number(form.capacity),
        description: form.description,
        images: form.images,
        opening_hours: { open: "06:00", close: "22:00" },
        contact_info: {
          name: "Admin",
          phone: "0830000000",
          email: "admin@test.com"
        }
      });

      await setDoc(doc(db, "facilities", docRef.id), {
        facility_id: docRef.id
      }, { merge: true });

      alert("Facility submitted!");
    } catch (error) {
      console.error("Error adding facility:", error);
      alert("Something went wrong while submitting.");
    }
  };

  return (
    <form className="facility-form" onSubmit={handleSubmit}>
      <h2>Add a New Facility</h2>

      <label>Name</label>
      <input name="name" onChange={handleChange} value={form.name} required />

      <label>Location</label>
      <input name="location" onChange={handleChange} value={form.location} required />

      <label>Sport Type</label>
      <select name="sport_type" value={form.sport_type} onChange={handleChange}>
        <option>Basketball</option>
        <option>Soccer</option>
        <option>Gym</option>
      </select>

      <label>Capacity</label>
      <input name="capacity" type="number" value={form.capacity} onChange={handleChange} />

      <label>Description</label>
      <textarea name="description" onChange={handleChange} value={form.description} />

      <label>Add Image URL</label>
      <div className="image-upload">
        <input
          value={form.newImage}
          onChange={(e) => setForm(prev => ({ ...prev, newImage: e.target.value }))}
        />
        <button type="button" onClick={handleImageAdd}>Add Image</button>
      </div>

      {form.images.length > 0 && (
        <ul className="image-preview">
          {form.images.map((img, i) => (
            <li key={i}>{img}</li>
          ))}
        </ul>
      )}

      <button type="submit">Submit</button>
    </form>
  );
};

export default FacilityForm;
