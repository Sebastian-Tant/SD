// src/components/ViewFacility.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./css-files/ViewFacility.css";

const ViewFacility = () => {
  const { id } = useParams();
  const [facility, setFacility] = useState(null);

  useEffect(() => {
    const fetchFacility = async () => {
      try {
        const docRef = doc(db, "facilities", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFacility(docSnap.data());
        } else {
          console.log("No such facility!");
        }
      } catch (err) {
        console.error("Error fetching facility:", err);
      }
    };

    fetchFacility();
  }, [id]);

  if (!facility) {
    return <p style={{ color: "white", textAlign: "center" }}>Loading facility...</p>;
  }

  const { name, location, sport_type, status, description, capacity, contact_info, images, opening_hours } = facility;

  return (
    <div className="view-facility-page">
      <h2>{name}</h2>

      <img
        src={images?.[0] || "https://via.placeholder.com/600x300?text=No+Image"}
        alt={name}
        className="facility-banner"
      />

      <p><strong>📍 Location:</strong> {location}</p>
      <p><strong>⏰ Open:</strong> {opening_hours?.open || "N/A"} – {opening_hours?.close || "N/A"}</p>
      <p><strong>📞 Contact:</strong> {contact_info?.name} | {contact_info?.phone} | {contact_info?.email}</p>
      <p><strong>🏷️ Type:</strong> {sport_type}</p>
      <p><strong>🏋 Capacity:</strong> {capacity}</p>
      <p><strong>🟢 Status:</strong> {status}</p>

      <p className="description"><strong>Description:</strong> {description}</p>

      {/* Book Facility Button */}
      <Link to={`/facility/${id}/book`}>
        <button className="book-btn">Book This Facility</button>
      </Link>
    </div>
  );
};

export default ViewFacility;
