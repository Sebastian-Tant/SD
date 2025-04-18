import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import "./css-files/Explore.css";

const Explore = () => {
  const [facilities, setFacilities] = useState([]);
  const [selectedSport, setSelectedSport] = useState("All");

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const snapshot = await getDocs(collection(db, "facilities"));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Fetched facilities:", data); // ✅ Debug log
        setFacilities(data);
      } catch (err) {
        console.error("Error fetching facilities:", err);
      }
    };

    fetchFacilities();
  }, []);

  const filteredFacilities =
    selectedSport === "All"
      ? facilities
      : facilities.filter(f => f.sport_type === selectedSport);

  return (
    <section className="explore-page">
      <h2 className="explore-title">Explore Facilities</h2>

      {/* Add New Facility Button */}
      <section style={{ display: "flex", justifyContent: "center" }}>
        <Link to="/add-facility" className="add-facility-btn">
            ➕ Add a New Facility
        </Link>
      </section>

      {/* Sport Filter Dropdown */}
      <label className="sport-filter">
        Sport:
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Basketball">Basketball</option>
          <option value="Soccer">Soccer</option>
          <option value="Tennis">Tennis</option>
          <option value="Swimming">Swimming</option>
          <option value="Gym">Gym</option>
        </select>
      </label>

      {/* Fallback if nothing found */}
      {filteredFacilities.length === 0 && (
        <p style={{ textAlign: "center", color: "white", marginTop: "2rem" }}>
          No facilities found. Check your Firestore or try changing the sport filter.
        </p>
      )}

      {/* Facility Cards */}
      <section className="facility-grid">
        {filteredFacilities.map((fac) => (
          <section className="facility-card" key={fac.id}>
            <img
              src={fac.images?.[0] || "https://via.placeholder.com/300x180?text=No+Image"}
              alt={fac.name}
              className="facility-img"
            />
            <section className="facility-info">
              <strong>{fac.name}</strong>
              <p>Sport: {fac.sport_type}</p>
              <p>Rating: {fac.rating ? "★".repeat(fac.rating) : "No rating"}</p>
              <p>Capacity: {fac.capacity}</p>
              <p>Status: {fac.status}</p>
              {fac.nextEvent && <p className="event">Next Event: {fac.nextEvent}</p>}

              <Link to={`/facility/${fac.id}`}>
                <button className="view-btn">View Facility</button>
              </Link>
            </section>
          </section>
        ))}
      </section>
    </section>
  );
};

export default Explore;