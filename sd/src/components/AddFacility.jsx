import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import "./css-files/addfacility.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    newImage: null,
    images: [],
    coordinates: { lat: null, lng: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [subfacilities, setSubfacilities] = useState([]);
  const [newSubfacility, setNewSubfacility] = useState({
    name: "",
    status: "available",
    capacity: "",
  });
  const [remainingCapacity, setRemainingCapacity] = useState(0);

  useEffect(() => {
    const totalSubCapacity = subfacilities.reduce(
      (sum, sub) => sum + (Number(sub.capacity) || 0),
      0
    );
    setRemainingCapacity(Number(form.capacity) - totalSubCapacity);
  }, [form.capacity, subfacilities]);

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
    if (name === "capacity" && value < 0) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubfacilityChange = (e) => {
    const { name, value } = e.target;
    if (name === "capacity" && value < 0) return;
    setNewSubfacility((prev) => ({ ...prev, [name]: value }));
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: [],
    }));
    setImagePreviews([]);
  };

  const handleAddSubfacility = () => {
    const subCapacity = Number(newSubfacility.capacity) || 0;

    if (newSubfacility.name.trim() === "") {
      toast.error("Subfacility name cannot be empty");
      return;
    }

    if (subCapacity <= 0) {
      toast.error("Subfacility capacity must be greater than 0");
      return;
    }

    if (subCapacity > remainingCapacity) {
      toast.error(
        `Cannot add subfacility. Remaining capacity is only ${remainingCapacity}`
      );
      return;
    }

    setSubfacilities((prev) => [
      ...prev,
      {
        ...newSubfacility,
        capacity: subCapacity,
      },
    ]);
    setNewSubfacility({
      name: "",
      status: "available",
      capacity: "",
    });
  };

  const handleRemoveSubfacility = (index) => {
    setSubfacilities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or GIF images are allowed");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setForm((prev) => ({
      ...prev,
      images: [file],
      newImage: null,
    }));

    setImagePreviews([URL.createObjectURL(file)]);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim()) {
      toast.error("Location is required.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Facility name is required.");
      return;
    }
    if (form.capacity <= 0) {
      toast.error("Facility capacity must be greater than 0");
      return;
    }

    const totalSubCapacity = subfacilities.reduce(
      (sum, sub) => sum + (Number(sub.capacity) || 0),
      0
    );

    if (totalSubCapacity > form.capacity) {
      toast.error("Total subfacility capacity cannot exceed facility capacity");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const image of form.images) {
        const fileExt = image.name.split(".").pop();
        const filename = `facility_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}.${fileExt}`;
        const storageRef = ref(storage, `facility-images/${filename}`);

        const metadata = {
          contentType: image.type,
        };

        const snapshot = await uploadBytes(storageRef, image, metadata);
        const imageUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(imageUrl);
      }

      const docRef = await addDoc(collection(db, "facilities"), {
        name: form.name,
        location: form.location,
        coordinates: form.coordinates,
        sport_type: form.sport_type,
        status: form.status,
        capacity: Number(form.capacity),
        description: form.description,
        images: imageUrls,
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

      toast.success("Facility submitted successfully!");
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
      setImagePreviews([]);
      setRemainingCapacity(0);
    } catch (error) {
      console.error("Error adding facility:", error);
      toast.error("Something went wrong while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) return <section>Error loading maps</section>;
  if (!isLoaded) return <section>Loading Maps...</section>;

  return (
    <section className="form-loading-animation">
      <form className="facility-form" onSubmit={handleSubmit} aria-label="Add facility form">
        <h2>Add a New Facility</h2>

        <label htmlFor="facilityName">Name</label>
        <input
          id="facilityName"
          name="name"
          type="text"
          onChange={handleChange}
          value={form.name}
          required
          aria-label="Facility name"
        />

        <label htmlFor="facilityLocation">Location</label>
        <input
          id="facilityLocation"
          ref={inputRef}
          className="location-input"
          type="text"
          placeholder="Search facility location"
          value={form.location}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, location: e.target.value }))
          }
          aria-label="Facility location"
        />

        {form.coordinates.lat && form.coordinates.lng && (
          <section className="map-container">
            <GoogleMap
              zoom={15}
              center={{ lat: form.coordinates.lat, lng: form.coordinates.lng }}
              mapContainerClassName="map"
            >
              <Marker
                position={{
                  lat: form.coordinates.lat,
                  lng: form.coordinates.lng,
                }}
              />
            </GoogleMap>
          </section>
        )}

        <label htmlFor="sportType">Sport Type</label>
        <select
          id="sportType"
          name="sport_type"
          value={form.sport_type}
          onChange={handleChange}
          aria-label="Sport type"
        >
          <option>Basketball</option>
          <option>Soccer</option>
          <option>Tennis</option>
          <option>Badminton</option>
          <option>Gym</option>
        </select>

        <label htmlFor="facilityCapacity">Overall Capacity</label>
        <input
          id="facilityCapacity"
          name="capacity"
          type="number"
          value={form.capacity}
          onChange={handleChange}
          aria-label="Facility capacity"
        />

        <label htmlFor="facilityDescription">Description</label>
        <textarea
          id="facilityDescription"
          name="description"
          onChange={handleChange}
          value={form.description}
          aria-label="Facility description"
        />

        <section className="custom-file-upload">
          <label htmlFor="imageUpload" className="upload-button">
            Upload Image/GIF
          </label>
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
            aria-label="Upload facility image"
          />
        </section>

        {imagePreviews.length > 0 && (
          <ul className="image-preview">
            {imagePreviews.map((img, i) => (
              <li key={i}>
                <img src={img} alt="Facility preview" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="remove-image-btn"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3>Subfacilities (Courts/Fields)</h3>
        <section className="subfacility-form">
          <label htmlFor="subfacilityName">Subfacility Name</label>
          <input
            id="subfacilityName"
            name="name"
            value={newSubfacility.name}
            onChange={handleSubfacilityChange}
            placeholder="e.g., Court 1, Field A"
            aria-label="Subfacility name"
          />

          <label htmlFor="subfacilityCapacity">Capacity</label>
          <input
            id="subfacilityCapacity"
            name="capacity"
            type="number"
            value={newSubfacility.capacity}
            onChange={handleSubfacilityChange}
            placeholder="Capacity for this subfacility"
            aria-label="Subfacility capacity"
          />

          <button
            type="button"
            onClick={handleAddSubfacility}
            className="add-subfacility"
            aria-label="Add subfacility"
          >
            Add Subfacility
          </button>
        </section>

        {subfacilities.length > 0 && (
          <section className="subfacility-list">
            <h4>Added Subfacilities:</h4>
            <ul>
              {subfacilities.map((sub, index) => (
                <li key={index}>
                  {sub.name} (Capacity: {sub.capacity})
                  <button
                    type="button"
                    onClick={() => handleRemoveSubfacility(index)}
                    className="remove-btn"
                    aria-label={`Remove ${sub.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button type="submit" disabled={isSubmitting} aria-label="Submit facility form">
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </section>
  );
};

export default AddFacility;