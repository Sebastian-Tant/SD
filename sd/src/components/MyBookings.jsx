import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import "./css-files/MyBookings.css";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // track authentications
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const all = [];
          const facilitiesSnap = await getDocs(collection(db, "facilities"));
          
          for (const fDoc of facilitiesSnap.docs) {
            const data = fDoc.data();
            const facName = data.name;
            
           
            (data.bookings || [])
              .filter((b) => b.userId === user.uid)
              .forEach((b) => all.push({ ...b, facilityName: facName, subfacilityName: null }));
            
          
            const subsnap = await getDocs(
              collection(db, "facilities", fDoc.id, "subfacilities")
            );
            
            for (const sDoc of subsnap.docs) {
              const sd = sDoc.data();
              (sd.bookings || [])
                .filter((b) => b.userId === user.uid)
                .forEach((b) =>
                  all.push({
                    ...b,
                    facilityName: facName,
                    subfacilityName: sd.name,
                  })
                );
            }
          }
          
          setBookings(all);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError("Not signed in");
        setLoading(false);
      }
    });

    return () => unsubscribe(); // set 0
  }, []);

  if (loading) {
    return (
      <section className="loading">
        <img src="/images/sportify.gif" alt="Loading..." className="loading-gif" />
      </section>
    );
  }
  
  if (error) return <p>Error: {error}</p>;

  const pending = bookings.filter((b) => b.status === "pending");
  const approved = bookings.filter((b) => b.status === "approved");
  const rejected = bookings.filter((b) => b.status === "rejected");

  const renderBooking = (b) => (
    <li
      key={`${b.date}_${b.time}_${b.facilityName}_${b.subfacilityName || ""}`}
      className="booking-item"
    >
      <span className="booking-name">
        {b.facilityName}
        {b.subfacilityName && ` – ${b.subfacilityName}`}
      </span>
      <section className="booking-tags">
        <span className="booking-tag date">{b.date}</span>
        <span className="booking-tag time">{b.time}</span>
        <span className="booking-tag attendees">
          {b.attendees} {b.attendees === 1 ? "person" : "people"}
        </span>
        <span className={`booking-tag status ${b.status}`}>{b.status}</span>
      </section>
    </li>
  );

  return (
    <section className="my-bookings-container">
      <h2>My Bookings</h2>

      <section className="my-bookings-section">
        <h3>Pending</h3>
        {pending.length === 0 ? <p>No pending bookings.</p> : <ul>{pending.map(renderBooking)}</ul>}
      </section>

      <section className="my-bookings-section">
        <h3>Approved</h3>
        {approved.length === 0 ? <p>No approved bookings.</p> : <ul>{approved.map(renderBooking)}</ul>}
      </section>

      <section className="my-bookings-section">
        <h3>Rejected</h3>
        {rejected.length === 0 ? <p>No rejected bookings.</p> : <ul>{rejected.map(renderBooking)}</ul>}
      </section>
    </section>
  );
};

export default MyBookings;