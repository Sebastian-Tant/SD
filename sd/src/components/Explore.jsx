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
import "./css-files/Explore.css";
import { FaFlag } from "react-icons/fa";


const Explore = () => {
  // Facility states
  const [facilities, setFacilities] = useState([]);
  const [selectedSport, setSelectedSport] = useState("All");
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [facilityError, setFacilityError] = useState(null);
   const [searchTerm, setSearchTerm] = useState('');
   

  // Report states
  const [reportData, setReportData] = useState({
    facilityId: "",
    facilityName: "",
    issue: "",
    description: "",
    subfacility: "",
    image: null,
    imagePreview: null,
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);


useEffect(() => {
  let results = facilities;

  // Apply search filter
  if (searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    results = results.filter(facility =>
      facility.name.toLowerCase().includes(term) 
    );
  }

  setFacilities(results);

}, [facilities, searchTerm]);
  // Fetch facilities and user data
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "facilities"));
        setFacilities(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (err) {
        console.error("Error fetching facilities:", err);
        setFacilityError("Failed to load facilities");
      } finally {
        setLoadingFacilities(false);
      }

     
    

      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              setUserData(userDoc.data());
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        } else {
          setUserData(null);
        }
      });
      return () => unsubscribe();
    };

    fetchData();
  }, [searchTerm]);

  // Filter facilities by sport
  const [visibleCount, setVisibleCount] = useState(5)
  const filteredFacilities =
    selectedSport === "All"
      ? facilities
      : facilities.filter((f) => f.sport_type === selectedSport);

  const visibleFacilities = filteredFacilities.slice(0, visibleCount);

  // Report handlers
  const handleReportClick = (facilityId, facilityName) => {
    if (!currentUser) {
      setSubmitError("Please sign in to submit a report");
      return;
    }
    setReportData({
      ...reportData,
      facilityId,
      facilityName,
    });
    setShowReportForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Only JPG, PNG or GIF images are allowed");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSubmitError("Image must be smaller than 5MB");
      return;
    }

    setReportData((prev) => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setSubmitError("Please sign in to submit a report");
      return;
    }

    if (
      !reportData.issue ||
      !reportData.description ||
      !reportData.subfacility
    ) {
      setSubmitError("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let imageUrl = "";

      if (reportData.image) {
        const fileExt = reportData.image.name.split(".").pop();
        const filename = `report_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, `report-images/${filename}`);

        const metadata = {
          contentType: reportData.image.type,
        };

        const snapshot = await uploadBytes(
          storageRef,
          reportData.image,
          metadata
        );
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const reportDataToSave = {
        facilityId: reportData.facilityId,
        facilityName: reportData.facilityName,
        issue: reportData.issue,
        description: reportData.description,
        subfacility: reportData.subfacility,
        imageUrl: imageUrl || "",
        timestamp: new Date(),
        status: "pending",
        userInfo: {
          userId: currentUser.uid,
          displayName: userData?.displayName || "User",
          role: userData?.role || "user",
        },
      };

      await addDoc(collection(db, "reports"), reportDataToSave);

      setShowReportForm(false);
      setReportData({
        facilityId: "",
        facilityName: "",
        issue: "",
        description: "",
        subfacility: "",
        image: null,
        imagePreview: null,
      });
    } catch (error) {
      console.error("Report submission error:", error);
      setSubmitError(`Failed to submit report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFacility = async (facilityId) => {
    try {
      const updateData = {
        status: "closed",
      };
      await updateDoc(doc(db, "facilities", facilityId), updateData);
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === facilityId ? { ...f, status: "closed" } : f
        )
      );
    } catch (error) {
      console.error("Error closing facility:", error);
      alert("Failed to close the facility. Try again.");
    }
  };

  const handleOpenFacility = async (facilityId) => {
    try {
      const updateData = {
        status: "open",
      };
      await updateDoc(doc(db, "facilities", facilityId), updateData);
      setFacilities((prev) =>
        prev.map((f) => (f.id === facilityId ? { ...f, status: "open" } : f))
      );
    } catch (error) {
      console.error("Error opening facility:", error);
      alert("Failed to open the facility. Try again.");
    }
  };

  if (loadingFacilities) {
    return (
      <section className="loading">
        <img src="/images/sportify.gif" alt="Loading..." className="loading-gif" />
      </section>
    );
  }

  if (facilityError) {
    return <section className="error">{facilityError}</section>;
  }

  return (
    <section className="explore-page">
      <h2 className="explore-title">Explore Facilities</h2>
      <div className="search-filter">
          <input
            type="text"
            placeholder="Search by facility, issue, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="clear-filter-btn"
            >
              Clear
            </button>
          )}
        </div>
      <section className="explore-block">
        <section className="controls">
          {userData?.role === "Admin" && (
            <section className="add-facility-container">
              <Link to="/add-facility" className="add-facility-btn">
                ➕ Add New Facility
              </Link>
            </section>
          )}

          <section className="sport-filter">
            <label>
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
          </section>
        </section>

        {filteredFacilities.length === 0 ? (
          <section className="no-results">
            <p>No facilities found matching your criteria.</p>
          </section>
        ) : (
                    <section className="facility-grid">
            {visibleFacilities.map((facility, index) => {
  console.log(facility.images); // 👈 Add this to inspect the image array

  return (
    <article
      key={facility.id}
      className="facility-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <figure className="facility-img">
        {facility.images?.[0] && (
          <img
            className="facility-image"
            src={facility.images[0]}
            alt={facility.name}
          />
        )}
      </figure>
      <div className="facility-content">
        <section className="facility-info">
          <h3>{facility.name}</h3>

          <div className="facility-tags">
            <span className="facility-tag">{facility.sport_type}</span>
            <span
              className={`facility-tag status ${facility.status.toLowerCase()}`}
            >
              {facility.status === "open" ? "✅ Open" : "🚧 Closed"}
            </span>
            {facility.capacity && (
              <span className="facility-tag">
                👥 {facility.capacity} Capacity
              </span>
            )}
          </div>
          {facility.rating && (
            <p>
              <strong>Rating:</strong> {"★".repeat(facility.rating)}
            </p>
          )}
        </section>
        <section className="facility-actions">
          {facility.status === "closed" &&
            userData?.role === "Resident" && (
              <div className="facility-closed-notice">
                🚧 Facility Closed for Maintenance
              </div>
            )}
          {(facility.status !== "closed" &&
            userData?.role == "Resident") && (
            <Link to="/bookings" state={{ facilityId: facility.id }}>
              <button className="button view-btn">Book now</button>
            </Link>
          )}
          <button
            className="button report-button"
            onClick={() =>
              handleReportClick(facility.id, facility.name)
            }
          >
            <FaFlag />
          </button>
          {userData?.role === "Admin" ||
          userData?.role === "Facility Staff" ? (
            facility.status.toLowerCase() === "closed" ? (
              <button
                className="button facility-open-button"
                onClick={() => handleOpenFacility(facility.id)}
              >
                Open Facility
              </button>
            ) : (
              <button
                className="button facility-close-button"
                onClick={() => handleCloseFacility(facility.id)}
              >
                Close Facility
              </button>
            )
          ) : null}
        </section>
      </div>
    </article>
  );
})}


            {visibleCount < filteredFacilities.length && (
              <div className="view-more-container">
                <button
                  className="view-more-btn"
                  onClick={() => setVisibleCount((c) => c + 5)}
                >
                  View More
                </button>
              </div>
            )}
          </section>

        

              
        )}
          
      </section>

      {showReportForm && (
        <section className="modal-overlay">
          <section className="modal-content">
            <button
              className="close-button"
              onClick={() => setShowReportForm(false)}
            >
              ×
            </button>
            <h3>Report Issue for {reportData.facilityName}</h3>
            {submitError && (
              <section className="error-message">{submitError}</section>
            )}
            <form onSubmit={handleSubmitReport}>
              <section className="form-group">
                <label>Issue Type:</label>
                <select
                  name="issue"
                  value={reportData.issue}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select an issue</option>
                  <option value="Equipment Broken">Equipment Broken</option>
                  <option value="Safety Hazard">Safety Hazard</option>
                  <option value="Cleanliness">Cleanliness</option>
                  <option value="Maintenance">Maintenance Required</option>
                  <option value="Other">Other</option>
                </select>
              </section>
              <section className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={reportData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Describe the issue in detail..."
                />
              </section>
              <section className="form-group">
                <label>Specific Area/Equipment:</label>
                <input
                  type="text"
                  name="subfacility"
                  value={reportData.subfacility}
                  onChange={handleInputChange}
                  placeholder="e.g., Treadmill #3, Court B, Locker Room"
                  required
                />
              </section>
              <section className="form-group">
                <label>Upload Image (Optional):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {reportData.imagePreview && (
                  <img
                    src={reportData.imagePreview}
                    alt="Preview"
                    className="image-preview"
                  />
                )}
              </section>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </section>
        </section>
      )}
    </section>
  );
};

export default Explore;