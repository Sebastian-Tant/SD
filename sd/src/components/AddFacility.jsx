import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase"; // Added storage import
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Added storage functions
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import "./css-files/addfacility.css";

const libraries = ["places"];

const AddFacility = ({ isAdmin = false }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [form, setForm] = useState({
    name: "",
    location: "",
    sport_type: "Basketball",
    status: "open",
    capacity: 0,
    description: "",
    newImage: null, // Changed to store File object
    images: [], // Stores File objects
    coordinates: { lat: null, lng: null },
  });

  const [imagePreviews, setImagePreviews] = useState([]); // Added for previews
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [subfacilities, setSubfacilities] = useState([]);
  const [newSubfacility, setNewSubfacility] = useState({
    name: "",
    status: "available",
    capacity: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isLoaded || !window.google || !inputRef.current) return;

    const options = {
      fields: ["formatted_address", "geometry", "name"],
      types: ["establishment"],
    };

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();

      if (!place.geometry) {
        console.warn("No geometry available for place");
        return;
      }

      setForm((prev) => ({
        ...prev,
        name: place.name || prev.name,
        location: place.formatted_address || inputRef.current.value,
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        },
      }));
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubfacilityChange = (e) => {
    const { name, value } = e.target;
    setNewSubfacility((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubfacility = () => {
    if (newSubfacility.name.trim() !== "" && newSubfacility.capacity > 0) {
      setSubfacilities((prev) => [
        ...prev,
        {
          ...newSubfacility,
          capacity: Number(newSubfacility.capacity),
        },
      ]);
      setNewSubfacility({
        name: "",
        status: "available",
        capacity: "",
      });
    }
  };

  const handleRemoveSubfacility = (index) => {
    setSubfacilities((prev) => prev.filter((_, i) => i !== index));
  };

  // Replaced handleImageAdd with new image handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Only JPG, PNG, or GIF images are allowed");
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setForm((prev) => ({
      ...prev,
      newImage: file,
    }));
  };

  const handleImageAdd = () => {
    if (form.newImage) {
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, form.newImage],
        newImage: null,
      }));
      setImagePreviews((prev) => [
        ...prev,
        URL.createObjectURL(form.newImage),
      ]);
      document.querySelector('input[type="file"]').value = ""; // Clear input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting...");

    try {
      // Upload images to Firebase Storage
      const imageUrls = [];
      for (const image of form.images) {
        const fileExt = image.name.split(".").pop();
        const filename = `facility_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
        const storageRef = ref(storage, `facility-images/${filename}`);

        const metadata = {
          contentType: image.type,
        };

        const snapshot = await uploadBytes(storageRef, image, metadata);
        const imageUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(imageUrl);
      }
      console.log("Image URLs:", imageUrls);

      const docRef = await addDoc(collection(db, "facilities"), {
        name: form.name,
        location: form.location,
        coordinates: form.coordinates,
        sport_type: form.sport_type,
        status: form.status,
        capacity: Number(form.capacity),
        description: form.description,
        images: imageUrls, // Store URLs instead of File objects
        opening_hours: { open: "06:00", close: "22:00" },
        has_subfacilities: subfacilities.length > 0,
      });

      await setDoc(
        doc(db, "facilities", docRef.id),
        {
          facility_id: docRef.id,
        },
        { merge: true }
      );

      if (subfacilities.length > 0) {
        const subfacilitiesCollection = collection(
          db,
          "facilities",
          docRef.id,
          "subfacilities"
        );
        
        for (const subfacility of subfacilities) {
          await addDoc(subfacilitiesCollection, {
            ...subfacility,
            facility_id: docRef.id,
          });
        }
      }

      alert("Facility submitted successfully!");
      setForm({
        name: "",
        location: "",
        sport_type: "Basketball",
        status: "open",
        capacity: 0,
        description: "",
        newImage: null,
        images: [],
        coordinates: { lat: null, lng: null },
      });
      setSubfacilities([]);
      setImagePreviews([]); // Reset previews
    } catch (error) {
      console.error("Error adding facility:", error);
      alert("Something went wrong while submitting.");
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <form className="facility-form" onSubmit={handleSubmit}>
      <h2>Add a New Facility</h2>

      <label>Name</label>
      <input 
        name="name" 
        onChange={handleChange} 
        value={form.name} 
        required 
      />

      <label>Location</label>
      <input
        ref={inputRef}
        id="autocomplete-input"
        className="location-input"
        type="text"
        placeholder="Search facility location"
        value={form.location}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, location: e.target.value }))
        }
      />

      {form.coordinates.lat && form.coordinates.lng && (
        <div className="map-container">
          <GoogleMap
            zoom={15}
            center={{ lat: form.coordinates.lat, lng: form.coordinates.lng }}
            mapContainerClassName="map"
          >
            <Marker
              position={{ lat: form.coordinates.lat, lng: form.coordinates.lng }}
            />
          </GoogleMap>
        </div>
      )}

      <label>Sport Type</label>
      <select
        name="sport_type"
        value={form.sport_type}
        onChange={handleChange}
      >
        <option>Basketball</option>
        <option>Soccer</option>
        <option>Tennis</option>
        <option>Badminton</option>
        <option>Gym</option>
      </select>

      <label>Overall Capacity</label>
      <input
        name="capacity"
        type="number"
        value={form.capacity}
        onChange={handleChange}
      />

      <label>Description</label>
      <textarea
        name="description"
        onChange={handleChange}
        value={form.description}
      />

      <label>Add Image (Optional)</label>
      <div className="image-upload">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        <button type="button" onClick={handleImageAdd}>
          Add Image
        </button>
      </div>

      {imagePreviews.length > 0 && (
        <ul className="image-preview">
          {imagePreviews.map((img, i) => (
            <li key={i}>
              <img src={img} alt={`Preview ${i}`} />
            </li>
          ))}
        </ul>
      )}

      <h3>Subfacilities (Courts/Fields)</h3>
      <div className="subfacility-form">
        <label>Subfacility Name</label>
        <input
          name="name"
          value={newSubfacility.name}
          onChange={handleSubfacilityChange}
          placeholder="e.g., Court 1, Field A"
        />

        <label>Status</label>
        <select
          name="status"
          value={newSubfacility.status}
          onChange={handleSubfacilityChange}
        >
          <option value="available">Available</option>
          <option value="maintenance">Under Maintenance</option>
          <option value="reserved">Reserved</option>
        </select>

        <label>Capacity</label>
        <input
          name="capacity"
          type="number"
          value={newSubfacility.capacity}
          onChange={handleSubfacilityChange}
          placeholder="Capacity for this subfacility"
        />

        <button
          type="button"
          onClick={handleAddSubfacility}
          className="add-subfacility"
        >
          Add Subfacility
        </button>
      </div>

      {subfacilities.length > 0 && (
        <div className="subfacility-list">
          <h4>Added Subfacilities:</h4>
          <ul>
            {subfacilities.map((sub, index) => (
              <li key={index}>
                {sub.name} (Capacity: {sub.capacity}, Status: {sub.status})
                <button
                  type="button"
                  onClick={() => handleRemoveSubfacility(index)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className="submit-btn">
        Submit Facility
      </button>
    </form>
  );
};

export default AddFacility;