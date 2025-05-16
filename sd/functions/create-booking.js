const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getAvailableTimes } = require("./utils/checkAvailability");
exports.createBooking = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to make a booking"
    );
  }

  const { facilityId, subfacilityId, date, time, attendees, facilityName } = data;

  // Validate all required fields
  if (!facilityId || !date || !time || !attendees) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required booking information"
    );
  }

  try {
    // Verify facility exists
    const facilityRef = admin.firestore().doc(`facilities/${facilityId}`);
    const facilityDoc = await facilityRef.get();

    if (!facilityDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Facility not found"
      );
    }

    // Check availability
    const availableTimes = await getAvailableTimes({
      facilityId,
      subfacilityId,
      date,
    });

    if (!availableTimes.includes(time)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The selected time is no longer available"
      );
    }

    // Prepare booking data
    const userId = context.auth.uid;
    const bookingData = {
      userId,
      date,
      time,
      attendees: parseInt(attendees),
      bookedAt: admin.firestore.Timestamp.now(),
      status: "pending",
      facilityId,
      facilityName: facilityName || facilityDoc.data().name || "",
    };

    // Handle subfacility or main facility booking
    if (subfacilityId) {
      const subfacilityRef = facilityRef.collection("subfacilities").doc(subfacilityId);
      const subfacilityDoc = await subfacilityRef.get();

      if (!subfacilityDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Subfacility not found"
        );
      }

      await subfacilityRef.update({
        bookings: admin.firestore.FieldValue.arrayUnion(bookingData),
      });
    } else {
      await facilityRef.update({
        bookings: admin.firestore.FieldValue.arrayUnion(bookingData),
      });
    }

    // Create notification
    const notification = {
      id: `${Date.now()}_${facilityId}_${subfacilityId || "main"}`,
      type: "booking",
      message: `Your booking request for ${
        subfacilityId || facilityName || facilityDoc.data().name
      } on ${date} at ${time} is under review`,
      bookingId: `${facilityId}_${subfacilityId || "main"}_${date}_${time}`,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    await admin.firestore()
      .collection("users").doc(userId)
      .update({
        notifications: admin.firestore.FieldValue.arrayUnion(notification),
      });

    return { success: true, bookingData };
  } catch (error) {
    console.error("Detailed booking error:", {
      error: error.message,
      stack: error.stack,
      data,
      userId: context.auth?.uid
    });

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create booking"
    );
  }
});
