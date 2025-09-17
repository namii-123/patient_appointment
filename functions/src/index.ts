import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config(); // 👈 load .env file

admin.initializeApp();
const db = admin.firestore();

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,  // 👈 use .env
    pass: process.env.GMAIL_PASS,  // 👈 use .env
  },
});

export const sendEmailOnStatusChange = onDocumentUpdated(
  "Transactions/{transactionId}",
  async (event) => {
    if (!event.data) return;

    const beforeData = event.data.before?.data() ?? {};
    const afterData = event.data.after?.data() ?? {};

    if (beforeData.status === afterData.status) return;

    let patientEmail = afterData.email;
    let patientName = "";

    if (afterData.patientId) {
      const pRef = db.collection("Patients").doc(afterData.patientId);
      const pSnap = await pRef.get();
      if (pSnap.exists) {
        const p = pSnap.data()!;
        patientEmail = p.email;
        patientName = `${p.firstName ?? ""} ${p.lastName ?? ""}`;
      }
    }

    if (!patientEmail) {
      logger.warn("⚠️ No email found for patient:", afterData.patientId);
      return;
    }

    let subject = "";
    let body = "";

    if (afterData.status === "Approved") {
      subject = "Appointment Approved ✅";
      body = `Hello ${patientName},\n\nYour appointment has been approved.\n\nDate: ${afterData.date}\nSlot: ${afterData.slot}\n\nPlease proceed to the clinic at your scheduled time.\n\nThank you!`;
    } else if (afterData.status === "Rejected") {
      subject = "Appointment Rejected ❌";
      body = `Hello ${patientName},\n\nUnfortunately, your appointment has been rejected.\nReason: ${afterData.reason ?? "Not specified"}\n\nPlease try rescheduling or contact our office.\n\nThank you!`;
    }

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: patientEmail,
        subject,
        text: body,
      });
      logger.info(`✅ Email sent to: ${patientEmail}`);
    } catch (error) {
      logger.error("❌ Error sending email:", error);
    }
  }
);
