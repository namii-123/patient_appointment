const functions = require("firebase-functions");
const { getFirestore } = require("firebase/firestore");

const db = getFirestore();

exports.cleanupPendingReservations = functions.pubsub.schedule("every 5 minutes").onRun(async (context) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const reservationsRef = db.collection("Departments").doc("Dental").collection("Reservations");
  const snapshot = await reservationsRef
    .where("status", "==", "pending")
    .where("createdAt", "<", fifteenMinutesAgo)
    .get();

  const promises = snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const slotRef = db.collection("Departments").doc("Dental").collection("Slots").doc(data.date);

    await db.runTransaction(async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      if (!slotDoc.exists) {
        console.log(`Slot document for ${data.date} not found`);
        return;
      }

      const currentSlots = slotDoc.data().slots || [];
      const updatedSlots = currentSlots.map((s) =>
        s.slotID === data.slotID ? { ...s, remaining: s.remaining + 1 } : s
      );
      const newTotal = updatedSlots.reduce((sum, s) => sum + s.remaining, 0);

      transaction.update(slotRef, {
        slots: updatedSlots,
        totalSlots: newTotal,
      });

      transaction.update(doc.ref, {
        status: "canceled",
        updatedAt: new Date().toISOString(),
      });

      if (data.appointmentId) {
        transaction.update(db.collection("Appointments").doc(data.appointmentId), {
          status: "canceled",
          updatedAt: new Date().toISOString(),
        });
      }
    });

    console.log(`Cleaned up reservation ${doc.id} for slot ${data.slotID}`);
  });

  await Promise.all(promises);
  return null;
});