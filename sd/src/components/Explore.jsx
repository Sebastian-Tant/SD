import React, { useState, useEffect } from "react";
import { db, storage, auth } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link } from "react-router-dom";
import useTypewriter from "../hooks/useTypewriter"; // Import the hook
import "./css-files/Explore.css";

// Sport assets mapping (as per your latest version)
const sportAssets = {
  All: {
    video: "/videos/default_facility_overview.mp4", // Make sure you have this default video
    icon: "🏟️"
  },
  Basketball: {
    video: "/videos/basketball_bg.mp4",
    icon: "🏀"
  },
  Soccer: {
    video: "/videos/soccer_bg.mp4",
    icon: "⚽"
  },
  Tennis: {
    video: "/videos/tennis_bg.mp4",
    icon: "🎾"
  },
  Swimming: {
    video: "/videos/swimming_bg.mp4",
    icon: "🏊‍♂️"
  },
  Gym: {
    video: "/videos/gym_bg.mp4",
    icon: "💪"
  }
};

const Explore = () => {
  const [facilities, setFacilities] = useState([]);
  const [selectedSport, setSelectedSport] = useState("All");
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [facilityError, setFacilityError] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(sportAssets.All); // Changed state name for clarity

  // Typewriter effect for the title
  const typedTitle = useTypewriter("Explore Facilities", 70); // Adjust speed (ms) as needed

  // Report states
  const [reportData, setReportData] = useState({
    facilityId: "", facilityName: "", issue: "", description: "",
    subfacility: "", image: null, imagePreview: null,
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingFacilities(true);
      setFacilityError(null);
      try {
        const snapshot = await getDocs(collection(db, "facilities"));
        setFacilities(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching facilities:", err);
        setFacilityError("Failed to load facilities. Please try again later.");
      } finally {
        setTimeout(() => setLoadingFacilities(false), 300); // Small delay for animations
      }

      const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) setUserData(userDoc.data());
            else setUserData(null);
          } catch (error) {
            console.error("Error fetching user data:", error);
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      });
      return () => unsubscribeAuth();
    };
    fetchData();
  }, []);

  // Update background video and icon when sport changes
  useEffect(() => {
    setCurrentAsset(sportAssets[selectedSport] || sportAssets.All);
  }, [selectedSport]);

  const filteredFacilities = selectedSport === "All"
    ? facilities
    : facilities.filter((f) => f.sport_type === selectedSport);

  const handleReportClick = (facilityId, facilityName) => {
    if (!currentUser) {
      setSubmitError("Please sign in to submit a report.");
      return;
    }
    setReportData({
      facilityId, facilityName, issue: "", description: "",
      subfacility: "", image: null, imagePreview: null,
    });
    setShowReportForm(true);
    setSubmitError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Only JPG, PNG, or GIF images are allowed.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setSubmitError("Image must be smaller than 5MB.");
      return;
    }
    setSubmitError(null);
    setReportData((prev) => ({
      ...prev, image: file, imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setSubmitError("Please sign in to submit a report.");
      return;
    }
    if (!reportData.issue || !reportData.description || !reportData.subfacility) {
      setSubmitError("Please fill all required fields.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let imageUrl = "";
      if (reportData.image) {
        const fileExt = reportData.image.name.split(".").pop();
        const filename = `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const storageRef = ref(storage, `report-images/${filename}`);
        const metadata = { contentType: reportData.image.type };
        const snapshot = await uploadBytes(storageRef, reportData.image, metadata);
        imageUrl = await getDownloadURL(snapshot.ref);
      }
      const reportToSave = {
        ...reportData, imageUrl: imageUrl || "", imagePreview: null,
        timestamp: new Date(), status: "pending",
        userInfo: {
          userId: currentUser.uid,
          displayName: userData?.displayName || currentUser.email || "Anonymous User",
          role: userData?.role || "user",
        },
      };
      delete reportToSave.image;

      await addDoc(collection(db, "reports"), reportToSave);
      setShowReportForm(false);
      setReportData({ facilityId: "", facilityName: "", issue: "", description: "", subfacility: "", image: null, imagePreview: null });
      alert("Report submitted successfully!");
    } catch (error) {
      console.error("Report submission error:", error);
      setSubmitError(`Failed to submit report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacilityStatusChange = async (facilityId, newStatus) => {
    try {
      await updateDoc(doc(db, "facilities", facilityId), { status: newStatus });
      setFacilities((prev) =>
        prev.map((f) => (f.id === facilityId ? { ...f, status: newStatus } : f))
      );
    } catch (error) {
      console.error(`Error updating facility to ${newStatus}:`, error);
      alert(`Failed to ${newStatus} the facility. Please try again.`);
    }
  };
  const handleCloseFacility = (facilityId) => handleFacilityStatusChange(facilityId, "closed");
  const handleOpenFacility = (facilityId) => handleFacilityStatusChange(facilityId, "open");

  return (
    <section className="explore-page">
      <div className="video-background">
        <video
          key={currentAsset.video} // Key ensures re-render when video source changes
          autoPlay
          loop
          muted
          playsInline
          className="background-video"
        >
          <source src={currentAsset.video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
  
      {/* Page Content */}
      <h2 className="explore-title">
        {typedTitle}
        <span className="typing-cursor">|</span> {/* Optional: Blinking cursor */}
      </h2>

      {loadingFacilities ? (
        <section className="loading">Loading facilities...</section>
      ) : facilityError ? (
        <section className="error">{facilityError}</section>
      ) : (
        <section className="explore-block">
          <section className={`controls ${!loadingFacilities ? 'animate-controls-on-load' : ''}`}>
            {userData?.role === "Admin" && (
              <Link to="/add-facility" className="add-facility-btn">
                ➕ Add New Facility
              </Link>
            )}
            <section className="sport-filter-wrapper">
              <label htmlFor="sport-select" className="sport-filter-label">Sport:</label>
              <select
                id="sport-select"
                className="sport-filter-select"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
              >
                {Object.keys(sportAssets).map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
              <span className="sport-icon">{currentAsset.icon}</span>
            </section>
          </section>

          {filteredFacilities.length === 0 ? (
            <section className={`no-results ${!loadingFacilities ? 'animate-no-results-on-load' : ''}`}>
              <p>No facilities found matching your criteria.</p>
            </section>
          ) : (
            <section className="facility-grid">
              {filteredFacilities.map((facility, index) => (
                <article
                  key={facility.id}
                  className={`facility-card ${!loadingFacilities ? 'animate-card-on-load' : ''}`}
                  style={{ animationDelay: !loadingFacilities ? `${index * 0.1 + 0.5}s` : '0s' }} // Delay slightly more to let title finish
                >
                  <figure className="facility-image-container">
                    {facility.images?.[0] && (
                      <img src={facility.images[0]} alt={facility.name} className="facility-img-main"/>
                    )}
                    {facility.status === "closed" && (
                      <div className="closed-banner">CLOSED</div>
                    )}
                  </figure>
                  <section className="facility-info">
                    <h3>{facility.name}</h3>
                    <p><strong>Sport:</strong> {facility.sport_type}</p>
                    <p><strong>Status:</strong> <span className={`status-${facility.status?.toLowerCase()}`}>{facility.status}</span></p>
                    {facility.capacity && <p><strong>Capacity:</strong> {facility.capacity}</p>}
                    {facility.rating && <p><strong>Rating:</strong> {"★".repeat(facility.rating)}{"☆".repeat(5 - facility.rating)}</p>}
                  </section>
                  <section className="facility-actions">
                    {facility.status === "closed" && userData?.role === "Resident" && (
                      <div className="facility-closed-notice">🚧 Facility Closed for Maintenance</div>
                    )}
                    {(facility.status !== "closed" || userData?.role === "Admin" || userData?.role === "Facility Staff") && (
                      <Link to={`/facility/${facility.id}`} className="button view-btn">View Facility</Link>
                    )}
                    <button className="button report-button" onClick={() => handleReportClick(facility.id, facility.name)}>Report Issue</button>
                    {(userData?.role === "Admin" || userData?.role === "Facility Staff") && (
                      facility.status?.toLowerCase() === "closed" ? (
                        <button className="button facility-open-button" onClick={() => handleOpenFacility(facility.id)}>Open Facility</button>
                      ) : (
                        <button className="button facility-close-button" onClick={() => handleCloseFacility(facility.id)}>Close Facility</button>
                      )
                    )}
                  </section>
                </article>
              ))}
            </section>
          )}
        </section>
      )}

      {/* Report Modal (remains unchanged from your last version) */}
      {showReportForm && (
        <section className="modal-overlay">
          <section className="modal-content">
            <button className="close-modal-button" onClick={() => setShowReportForm(false)} aria-label="Close report form">×</button>
            <h3>Report Issue for {reportData.facilityName}</h3>
            {submitError && <section className="error-message">{submitError}</section>}
            <form onSubmit={handleSubmitReport}>
              <section className="form-group">
                <label htmlFor="issueType">Issue Type:</label>
                <select id="issueType" name="issue" value={reportData.issue} onChange={handleInputChange} required>
                  <option value="">Select an issue</option>
                  <option value="Equipment Broken">Equipment Broken</option>
                  <option value="Safety Hazard">Safety Hazard</option>
                  <option value="Cleanliness">Cleanliness</option>
                  <option value="Maintenance">Maintenance Required</option>
                  <option value="Other">Other</option>
                </select>
              </section>
              <section className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea id="description" name="description" value={reportData.description} onChange={handleInputChange} required placeholder="Describe the issue in detail..."/>
              </section>
              <section className="form-group">
                <label htmlFor="subfacility">Specific Area/Equipment:</label>
                <input id="subfacility" type="text" name="subfacility" value={reportData.subfacility} onChange={handleInputChange} placeholder="e.g., Treadmill #3, Court B, Locker Room" required/>
              </section>
              <section className="form-group">
                <label htmlFor="imageUpload">Upload Image (Optional):</label>
                <input id="imageUpload" type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileChange}/>
                {reportData.imagePreview && <img src={reportData.imagePreview} alt="Preview" className="image-preview"/>}
              </section>
              <button type="submit" className="submit-button" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Report"}</button>
            </form>
          </section>
        </section>
      )}
    </section>
  );
};

export default Explore;