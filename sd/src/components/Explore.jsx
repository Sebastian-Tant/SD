import React, { useState, useEffect, useMemo } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  // Weather states
  const [weatherData, setWeatherData] = useState({});
  const [weatherError, setWeatherError] = useState({});
  // Report states
  const [reportData, setReportData] = useState({
    facilityId: "",
    facilityName: "",
    issue: "",
    description: "",
    subfacility: "",
    specificArea: "",
    image: null,
    imagePreview: null,
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [subfacilities, setSubfacilities] = useState([]);
  const [loadingSubfacilities, setLoadingSubfacilities] = useState(false);

  // Weather code to description and icon mapping for Open-Meteo
  const weatherCodeMap = useMemo(() => ({
    0: { description: "Clear sky", icon: "01d" },
    1: { description: "Mainly clear", icon: "02d" },
    2: { description: "Partly cloudy", icon: "03d" },
    3: { description: "Overcast", icon: "04d" },
    45: { description: "Fog", icon: "50d" },
    48: { description: "Depositing rime fog", icon: "50d" },
    51: { description: "Light drizzle", icon: "09d" },
    53: { description: "Moderate drizzle", icon: "09d" },
    55: { description: "Dense drizzle", icon: "09d" },
    61: { description: "Light rain", icon: "10d" },
    63: { description: "Moderate rain", icon: "10d" },
    65: { description: "Heavy rain", icon: "10d" },
    71: { description: "Light snow", icon: "13d" },
    73: { description: "Moderate snow", icon: "13d" },
    75: { description: "Heavy snow", icon: "13d" },
    77: { description: "Snow grains", icon: "13d" },
    80: { description: "Light rain showers", icon: "09d" },
    81: { description: "Moderate rain showers", icon: "09d" },
    82: { description: "Violent rain showers", icon: "09d" },
    85: { description: "Light snow showers", icon: "13d" },
    86: { description: "Heavy snow showers", icon: "13d" },
    95: { description: "Thunderstorm", icon: "11d" },
    96: { description: "Thunderstorm with light hail", icon: "11d" },
    99: { description: "Thunderstorm with heavy hail", icon: "11d" },
  }), []);

  // Cache constants
  const CACHE_KEY_PREFIX = "weather_cache_";
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  // Fetch facilities, user data, and weather data
  useEffect(() => {
    // Cache utility functions
    const getCachedWeather = (lat, lng) => {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${lat}_${lng}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_TTL) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        return data;
      } catch (error) {
        console.error("Error reading weather cache:", error);
        return null;
      }
    };

    const setCachedWeather = (lat, lng, data) => {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${lat}_${lng}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error("Error writing weather cache:", error);
      }
    };

    const fetchData = async () => {
      try {
        // Fetch facilities
        const snapshot = await getDocs(collection(db, "facilities"));
        const facilitiesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setFacilities(facilitiesData);

        // Fetch weather data for each facility using Open-Meteo
        const weatherPromises = facilitiesData.map(async (facility) => {
          console.log(`Facility: ${facility.name}, Coordinates:`, facility.coordinates); // Debug coordinates
          if (facility.coordinates && typeof facility.coordinates.lat === "number" && typeof facility.coordinates.lng === "number") {
            const lat = facility.coordinates.lat;
            const lng = facility.coordinates.lng;

            // Check cache first
            const cachedForecast = getCachedWeather(lat, lng);
            if (cachedForecast) {
              return { facilityId: facility.id, forecast: cachedForecast };
            }

            try {
              const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`
              );
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const data = await response.json();
              if (!data.daily) {
                throw new Error("Invalid API response: missing daily data");
              }
              // Format data to match expected structure
              const forecast = data.daily.time.map((time, idx) => ({
                dt: new Date(time).getTime() / 1000, // Convert to Unix timestamp
                temp: {
                  min: data.daily.temperature_2m_min[idx],
                  max: data.daily.temperature_2m_max[idx],
                },
                weather: [
                  {
                    description: weatherCodeMap[data.daily.weathercode[idx]]?.description || "Unknown",
                    icon: weatherCodeMap[data.daily.weathercode[idx]]?.icon || "01d",
                  },
                ],
              }));
              // Cache the forecast
              setCachedWeather(lat, lng, forecast);
              return { facilityId: facility.id, forecast };
            } catch (error) {
              console.error(`Weather fetch error for ${facility.name}:`, error.message);
              setWeatherError((prev) => ({
                ...prev,
                [facility.id]: error.message,
              }));
              return { facilityId: facility.id, forecast: null };
            }
          } else {
            console.warn(`Invalid coordinates for ${facility.name}:`, facility.coordinates);
            setWeatherError((prev) => ({
              ...prev,
              [facility.id]: "Invalid or missing coordinates",
            }));
            return { facilityId: facility.id, forecast: null };
          }
        });

        const weatherResults = await Promise.all(weatherPromises);
        const weatherMap = weatherResults.reduce((acc, { facilityId, forecast }) => {
          acc[facilityId] = forecast;
          return acc;
        }, {});
        setWeatherData(weatherMap);
      } catch (err) {
        console.error("Error fetching facilities:", err);
        setFacilityError("Failed to load facilities");
      } finally {
        setLoadingFacilities(false);
      }

      // Fetch user data
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
  }, [weatherCodeMap, CACHE_TTL]);

  // Fetch subfacilities when report form is opened
  useEffect(() => {
    const fetchSubfacilities = async () => {
      if (reportData.facilityId && showReportForm) {
        setLoadingSubfacilities(true);
        try {
          const subfacilitiesSnapshot = await getDocs(
            collection(db, "facilities", reportData.facilityId, "subfacilities")
          );
          const subfacilitiesList = subfacilitiesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSubfacilities(subfacilitiesList);
        } catch (error) {
          console.error("Error fetching subfacilities:", error);
          setSubfacilities([]);
        } finally {
          setLoadingSubfacilities(false);
        }
      }
    };

    fetchSubfacilities();
  }, [reportData.facilityId, showReportForm]);

  // Filter facilities by sport and search term
  const filteredFacilities =
    selectedSport === "All"
      ? facilities.filter(
          (facility) =>
            searchTerm.trim() === "" ||
            facility.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : facilities.filter(
          (facility) =>
            facility.sport_type === selectedSport &&
            (searchTerm.trim() === "" ||
              facility.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

  // Filter facilities by sport
  const [visibleCount, setVisibleCount] = useState(5);
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
      subfacility: "",
      specificArea: "",
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
      (subfacilities.length > 0 && !reportData.subfacility) ||
      !reportData.specificArea
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
        specificArea: reportData.specificArea,
        imageUrl: imageUrl || "",
        timestamp: new Date(),
        status: "pending",
        userInfo: {
          userId: currentUser.uid,
          displayName: userData?.displayName || "User",
          role: userData?.role || "user",
        },
      };

      // Only include subfacility if subfacilities exist
      if (subfacilities.length > 0) {
        reportDataToSave.subfacility = reportData.subfacility;
      }

      await addDoc(collection(db, "reports"), reportDataToSave);

      setShowReportForm(false);
      setReportData({
        facilityId: "",
        facilityName: "",
        issue: "",
        description: "",
        subfacility: "",
        specificArea: "",
        image: null,
        imagePreview: null,
      });
      setSubfacilities([]);
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

  // Format date for weather display
  const formatWeatherDate = (dt) => {
    return new Date(dt * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
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
      <section className="search-filter">
        <input
          type="text"
          placeholder="Search by facility"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="clear-filter-btn"
          >
            Clear
          </button>
        )}
      </section>
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
            {visibleFacilities.map((facility, index) => (
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
                <section className="facility-content">
                  <section className="facility-info">
                    <h3>{facility.name}</h3>
                    <section className="facility-tags">
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
                    </section>
                    {facility.rating && (
                      <p>
                        <strong>Rating:</strong> {"★".repeat(facility.rating)}
                      </p>
                    )}
                    {/* Weather Forecast Section */}
                    {weatherData[facility.id] ? (
                      <section className="weather-forecast">
                        <h4>3-Day Weather Forecast</h4>
                        <section className="weather-grid">
                          {weatherData[facility.id].map((day, idx) => (
                            <section key={idx} className="weather-day">
                              <p className="weather-date">{formatWeatherDate(day.dt)}</p>
                              <img
                                src={`http://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                                alt={day.weather[0].description}
                                className="weather-icon"
                              />
                              <p className="weather-description">{day.weather[0].description}</p>
                              <p className="weather-temp">
                                {Math.round(day.temp.min)}°C - {Math.round(day.temp.max)}°C
                              </p>
                            </section>
                          ))}
                        </section>
                      </section>
                    ) : (
                      <p className="weather-unavailable">
                        {weatherError[facility.id] || "Weather data unavailable"}
                      </p>
                    )}
                  </section>
                  <section className="facility-actions">
                    {facility.status === "closed" &&
                      userData?.role === "Resident" && (
                        <section className="facility-closed-notice">
                          🚧 Facility Closed for Maintenance
                        </section>
                      )}
                    {facility.status !== "closed" && userData?.role === "Resident" && (
                      <Link to="/bookings" state={{ facilityId: facility.id }}>
                        <button className="button view-btn">Book now</button>
                      </Link>
                    )}
                    <button
                      className="button report-button"
                      onClick={() => handleReportClick(facility.id, facility.name)}
                    >
                      <FaFlag />
                    </button>
                    {userData?.role === "Admin" || userData?.role === "Facility Staff" ? (
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
                </section>
              </article>
            ))}
            {visibleCount < filteredFacilities.length && (
              <section className="view-more-container">
                <button
                  className="view-more-btn"
                  onClick={() => setVisibleCount((c) => c + 5)}
                >
                  View More
                </button>
              </section>
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
              {subfacilities.length > 0 && (
                <section className="form-group">
                  <label>Subfacility:</label>
                  <select
                    name="subfacility"
                    value={reportData.subfacility}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a subfacility</option>
                    {subfacilities.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </section>
              )}
              <section className="form-group">
                <label>Specific Area/Equipment:</label>
                <input
                  type="text"
                  name="specificArea"
                  value={reportData.specificArea}
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
                disabled={isSubmitting || loadingSubfacilities}
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