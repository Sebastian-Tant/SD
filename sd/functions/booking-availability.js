const functions = require("firebase-functions");
const { getAvailableTimes } = require("./utils/checkAvailability");

exports.checkBookingAvailability = functions.https.onCall(async (data, context) => {
  try {
    const { facilityId, subfacilityId, date } = data;
    if (!facilityId || !date) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required parameters.");
    }
    const availableTimes = await getAvailableTimes({ facilityId, subfacilityId, date });
    return { availableTimes };
  } catch (err) {
    console.error("checkBookingAvailability failed:", err);
    throw new functions.https.HttpsError("internal", err.message || "Unknown error");
  }
});
