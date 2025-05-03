import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth } from "../firebase";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
const libraries = ["places"];

const BookFacility = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [subfacilities, setSubfacilities] = useState([]);
  const [selectedSubfacility, setSelectedSubfacility] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [attendees, setAttendees] = useState(1);
  const [capacityWarning, setCapacityWarning] = useState("");

  useEffect(() => {
    const fetchFacilities = async () => {
      const querySnapshot = await getDocs(collection(db, "facilities"));
      const facilitiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFacilities(facilitiesData);
    };
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      const fetchSubfacilities = async () => {
        const subfacilitiesRef = collection(
          db,
          "facilities",
          selectedFacility,
          "subfacilities"
        );
        const querySnapshot = await getDocs(subfacilitiesRef);
        const subfacilitiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubfacilities(subfacilitiesData);
      };
      fetchSubfacilities();
    }
  }, [selectedFacility]);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedFacility || !selectedDate) return;

      const allTimes = ["13:00", "14:00", "15:00", "16:00", "17:00"];
      let bookedTimes = [];

      try {
        if (selectedSubfacility) {
          const subfacilityRef = doc(
            db,
            "facilities",
            selectedFacility,
            "subfacilities",
            selectedSubfacility
          );
          const docSnap = await getDoc(subfacilityRef);
          if (docSnap.exists()) {
            const bookings = docSnap.data().bookings || [];
            bookedTimes = bookings
              .filter(
                (booking) =>
                  booking.date === selectedDate &&
                  (booking.status === "approved" ||
                    booking.status === "pending")
              )
              .map((booking) => booking.time);
          }
        }

        const remainingTimes = allTimes.filter(
          (time) => !bookedTimes.includes(time)
        );
        setAvailableTimes(remainingTimes);
      } catch (error) {
        console.error("Error fetching available times:", error);
        setAvailableTimes(allTimes);
      }
    };

    fetchAvailableTimes();
  }, [selectedFacility, selectedSubfacility, selectedDate]);

  const validateCapacity = useCallback(() => {
    if (attendees < 1) {
      setCapacityWarning("Number of attendees must be at least 1");
      return false;
    }

    if (selectedSubfacility) {
      const subfacility = subfacilities.find(
        (sub) => sub.id === selectedSubfacility
      );
      if (subfacility && attendees > subfacility.capacity) {
        setCapacityWarning(
          `This court/field only accommodates ${subfacility.capacity} people`
        );
        return false;
      }
    } else if (selectedFacility) {
      const facility = facilities.find((f) => f.id === selectedFacility);
      if (facility && attendees > facility.capacity) {
        setCapacityWarning(
          `This facility only accommodates ${facility.capacity} people`
        );
        return false;
      }
    }

    setCapacityWarning("");
    return true;
  }, [
    attendees,
    selectedSubfacility,
    selectedFacility,
    subfacilities,
    facilities,
  ]);

  useEffect(() => {
    validateCapacity();
  }, [validateCapacity]);

  const checkExistingBooking = async () => {
    if (!selectedSubfacility || !selectedDate || !selectedTime) return false;

    try {
      const subfacilityRef = doc(
        db,
        "facilities",
        selectedFacility,
        "subfacilities",
        selectedSubfacility
      );

      const docSnap = await getDoc(subfacilityRef);
      if (docSnap.exists()) {
        const bookings = docSnap.data().bookings || [];
        return bookings.some(
          (booking) =>
            booking.date === selectedDate &&
            booking.time === selectedTime &&
            (booking.status === "approved" || booking.status === "pending")
        );
      }
      return false;
    } catch (error) {
      console.error("Error checking bookings:", error);
      return true;
    }
  };

  const handleFacilityChange = (e) => {
    setSelectedFacility(e.target.value);
    setSelectedSubfacility("");
    setSelectedDate("");
    setAvailableTimes([]);
    setCapacityWarning("");
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedTime("");
  };

  const handleAttendeesChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setAttendees(Math.max(1, value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFacility || !selectedDate || !selectedTime) return;

    if (!validateCapacity()) {
      return;
    }

    try {
      const alreadyBooked = await checkExistingBooking();
      if (alreadyBooked) {
        alert("This time slot is already booked. Please choose another time.");
        return;
      }

      const userUid = auth.currentUser?.uid;
      if (!userUid) {
        alert("You must be logged in to make a booking.");
        return;
      }

      const bookingData = {
        userId: userUid,
        date: selectedDate,
        time: selectedTime,
        attendees: attendees,
        bookedAt: new Date().toISOString(),
        status: "pending",
      };
      // Add notification to user
      const notification = {
        id: Date.now().toString(),
        type: "booking",
        message: `Your booking for ${
          selectedSubfacility ||
          facilities.find((f) => f.id === selectedFacility)?.name
        } on ${selectedDate} at ${selectedTime} is under review`,
        bookingId: `${selectedFacility}_${selectedSubfacility}_${selectedDate}_${selectedTime}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        read: false,
      };
      const userRef = doc(db, "users", userUid);
      await updateDoc(userRef, {
        notifications: arrayUnion(notification),
      });
      if (selectedSubfacility) {
        const subfacilityRef = doc(
          db,
          "facilities",
          selectedFacility,
          "subfacilities",
          selectedSubfacility
        );

        await updateDoc(subfacilityRef, {
          bookings: arrayUnion(bookingData),
        });
      } else {
        const facilityRef = doc(db, "facilities", selectedFacility);
        await updateDoc(facilityRef, {
          bookings: arrayUnion(bookingData),
        });
      }

      alert(
        `Booking request submitted for ${
          selectedSubfacility ||
          facilities.find((f) => f.id === selectedFacility)?.name
        } on ${selectedDate} at ${selectedTime} for ${attendees} people. Waiting for admin approval.`
      );

      const updatedTimes = availableTimes.filter(
        (time) => time !== selectedTime
      );
      setAvailableTimes(updatedTimes);
      setSelectedTime("");
      setAttendees(1);

      if (updatedTimes.length === 0) {
        alert(
          "Facility is fully booked for this day. Please choose another day."
        );
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking. Please try again.");
    }
  };

  const getMaxCapacity = () => {
    if (selectedSubfacility) {
      const subfacility = subfacilities.find(
        (sub) => sub.id === selectedSubfacility
      );
      return subfacility ? subfacility.capacity : 0;
    } else if (selectedFacility) {
      const facility = facilities.find((f) => f.id === selectedFacility);
      return facility ? facility.capacity : 0;
    }
    return 0;
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <div style={{ paddingBottom: "100px" }}>
      <div className="facility-form">
        <h2>Book a Facility</h2>

        <div className="form-group">
          <label htmlFor="facility-select">Select Facility</label>
          <select
            id="facility-select"
            value={selectedFacility || ""}
            onChange={handleFacilityChange}
            required
          >
            <option value="">-- Choose Facility --</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name} (Capacity: {facility.capacity})
              </option>
            ))}
          </select>
        </div>

        {selectedFacility && (
          <div className="form-group">
            <label>Location</label>
            {/* <div className="map-placeholder">
  {facilities.find((f) => f.id === selectedFacility)?.location ||
    "Location not specified"}
</div> */}
            <small>
              {facilities.find((f) => f.id === selectedFacility)?.address ||
                facilities.find((f) => f.id === selectedFacility)?.location}
            </small>

            {facilities.find((f) => f.id === selectedFacility)?.coordinates && (
              <div
                className="map-container"
                style={{ height: "200px", marginTop: "10px" }}
              >
                <GoogleMap
                  zoom={15}
                  center={{
                    lat: facilities.find((f) => f.id === selectedFacility)
                      .coordinates.lat,
                    lng: facilities.find((f) => f.id === selectedFacility)
                      .coordinates.lng,
                  }}
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                >
                  <Marker
                    position={{
                      lat: facilities.find((f) => f.id === selectedFacility)
                        .coordinates.lat,
                      lng: facilities.find((f) => f.id === selectedFacility)
                        .coordinates.lng,
                    }}
                  />
                </GoogleMap>
              </div>
            )}
          </div>
        )}

        {selectedFacility && subfacilities.length > 0 && (
          <div className="form-group">
            <label htmlFor="subfacility-select">Select Court/Field</label>
            <select
              id="subfacility-select"
              value={selectedSubfacility}
              onChange={(e) => {
                setSelectedSubfacility(e.target.value);
                setSelectedTime("");
              }}
            >
              <option value="">-- Any Available --</option>
              {subfacilities.map((sub) => {
                const approvedTimes = new Set(
                  (sub.bookings || [])
                    .filter((b) => b.status === "approved" && b.date === selectedDate)
                    .map((b) => b.time)
                );
                
                const isFullyBooked = approvedTimes.size >= 5;
                
                return (
                  <option key={sub.id} value={sub.id} disabled={isFullyBooked}>
                    {sub.name} (Capacity: {sub.capacity})
                    {isFullyBooked && " - FULLY BOOKED"}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="attendees-input">Number of Attendees</label>
          <input
            id="attendees-input"
            type="number"
            min="1"
            max={getMaxCapacity()}
            value={attendees}
            onChange={handleAttendeesChange}
            required
          />
          {capacityWarning && (
            <div className="warning-message">{capacityWarning}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="date-input">Select Date</label>
          <input
            id="date-input"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        {selectedDate && (
          <div className="form-group">
            <label>Select Time</label>
            {availableTimes.length === 0 ? (
              <p className="warning-message">
                Facility is fully booked for this day. Please choose another
                day.
              </p>
            ) : (
              <div className="time-slots-horizontal">
                {availableTimes.map((time) => {
                  const isBooked =
                    selectedSubfacility &&
                    subfacilities
                      .find((sub) => sub.id === selectedSubfacility)
                      ?.bookings?.some(
                        (b) =>
                          b.date === selectedDate &&
                          b.time === time &&
                          (b.status === "approved" || b.status === "pending")
                      );

                  return (
                    <button
                      key={time}
                      type="button"
                      className={`time-slot ${
                        selectedTime === time ? "selected" : ""
                      } ${isBooked ? "booked" : ""}`}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                    >
                      {time}
                      {isBooked && " (Booked)"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(!selectedDate || availableTimes.length === 0) && selectedFacility && (
          <div className="form-group">
            <label>Select Time</label>
            <p>Please select a date to see available times.</p>
          </div>
        )}
        {selectedTime && (
          <div className="form-group">
            <button type="submit" onClick={handleSubmit}>
              Confirm Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookFacility;
