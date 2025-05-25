import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "firebase/firestore";
import "./css-files/ApplicationStatus.css";

const ApplicationStatus = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // tracks authentication state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchApplications(user);
      } else {
        setError("Not signed in");
        setLoading(false);
      }
    });

    return () => unsubscribe(); // make unsubscribe
  }, []);
// fetches the user applicatoins
  const fetchApplications = async (user) => {
    try {
      const q = query(
        collection(db, "applications"),
        where("uid", "==", user.uid),
        orderBy("submittedAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        const submittedAt =
          typeof data.submittedAt === "string"
            ? data.submittedAt
            : data.submittedAt.toDate().toLocaleString();
        return {
          id: d.id,
          ...data,
          submittedAt,
        };
      });
      setApplications(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="loading">
        <img src="/images/sportify.gif" alt="Loading..." className="loading-gif" />
      </section>
    );
  }
  if (error) return <p>Error: {error}</p>;

  const renderApplication = (a) => (
    <li key={a.id} className="application-item">
      <span className="application-name">{a.name}</span>
      <section className="application-tags">
        <span className="application-tag facility">{a.Facility}</span>
        <span className="application-tag type">{a.applicationType}</span>
        <span className="application-tag date">{a.submittedAt}</span>
        <span className={`application-tag status ${a.status}`}>{a.status}</span>
      </section>
      <p className="application-message">{a.message}</p>
    </li>
  );

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");
  const rejected = applications.filter((a) => a.status === "rejected");

  return (
    <section className="application-status-container">
      <h2 className="application-status-title">My Applications</h2>

      <section className="application-section">
        <h3>Pending</h3>
        {pending.length === 0 ? (
          <p>No pending applications.</p>
        ) : (
          <ul>{pending.map(renderApplication)}</ul>
        )}
      </section>

      <section className="application-section">
        <h3>Approved</h3>
        {approved.length === 0 ? (
          <p>No approved applications.</p>
        ) : (
          <ul>{approved.map(renderApplication)}</ul>
        )}
      </section>

      <section className="application-section">
        <h3>Rejected</h3>
        {rejected.length === 0 ? (
          <p>No rejected applications.</p>
        ) : (
          <ul>{rejected.map(renderApplication)}</ul>
        )}
      </section>
    </section>
  );
};

export default ApplicationStatus;