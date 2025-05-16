/* eslint-disable require-jsdoc */

const admin = require("firebase-admin");

function getDateFromFirestoreValue(value) {
  // Handle Firestore Timestamp
  if (value && typeof value.toDate === "function") {
    return value.toDate();
  }
  // Handle serialized Timestamp (e.g., { seconds: 1234567890, nanoseconds: 0 })
  if (value && typeof value === "object" && "seconds" in value && "nanoseconds" in value) {
    return new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
  }
  // Handle JavaScript Date
  if (value instanceof Date) {
    return value;
  }
  // Handle string dates
  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (!isNaN(parsedDate)) {
      return parsedDate;
    }
  }
  // Fallback: return null or throw an error
  console.warn(`Invalid date value: ${JSON.stringify(value)}`);
  return null; // Or throw new Error("Invalid date format");
}
exports.getAvailableTimes = async ({ facilityId, subfacilityId, date }) => {
  if (!facilityId || !date) {
    throw new Error("Missing required parameters");
  }

  const allTimes = ["13:00", "14:00", "15:00", "16:00", "17:00"];
  let bookedTimes = [];
  const conflictingEventTimes = [];

  // Check subfacility bookings
  if (subfacilityId) {
    const subfacilityRef = admin.firestore()
      .collection("facilities")
      .doc(facilityId)
      .collection("subfacilities")
      .doc(subfacilityId);

    const docSnap = await subfacilityRef.get();
    if (docSnap.exists) {
      const bookings = docSnap.data().bookings || [];
      bookedTimes = bookings
        .filter(
          booking => booking.date === date &&
            (booking.status === "approved" || booking.status === "pending")
        )
        .map(booking => booking.time);
    }
  }

  // Check facility-level bookings
  if (!subfacilityId) {
    const facilityRef = admin.firestore()
      .collection("facilities")
      .doc(facilityId);

    const docSnap = await facilityRef.get();
    if (docSnap.exists) {
      const bookings = docSnap.data().bookings || [];
      bookedTimes = bookings
        .filter(
          booking => booking.date === date &&
            (booking.status === "approved" || booking.status === "pending")
        )
        .map(booking => booking.time);
    }
  }

  // Check event conflicts
  const eventsSnapshot = await admin.firestore().collection("events").get();
  eventsSnapshot.forEach(doc => {
    const event = doc.data();
    if (!event.start || !event.end) {
      console.warn(`Skipping event ${doc.id}: missing start or end`);
      return;
    }

    const start = getDateFromFirestoreValue(event.start);
    const end = getDateFromFirestoreValue(event.end);

    // Skip if dates are invalid
    if (!start || !end) {
      console.warn(`Skipping event ${doc.id}: invalid start or end date`);
      return;
    }

    const eventDate = start.toISOString().split("T")[0];
    if (eventDate !== date) return;

    const blocksThisSub = event.subfacilityId === subfacilityId;
    const blocksFacility = !event.subfacilityId && event.facilityId === facilityId;

    if (blocksThisSub || blocksFacility) {
      const startHour = start.getHours();
      const endHour = end.getHours();
      for (let i = startHour; i < endHour; i++) {
        conflictingEventTimes.push(`${i.toString().padStart(2, "0")}:00`);
      }
    }
  });

  return allTimes.filter(
    time => !bookedTimes.includes(time) && !conflictingEventTimes.includes(time)
  );
};
