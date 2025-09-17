import emailjs from "emailjs-com";

export const sendEmail = async (
  toEmail: string,
  patientName: string,
  message: string,
  appointmentDate: string,
  appointmentSlot: string
) => {
  if (!toEmail) {
    console.error("No email address provided for sending email.");
    throw new Error("No email address provided.");
  }

  if (!/\S+@\S+\.\S+/.test(toEmail)) {
    console.error("Invalid email format:", toEmail);
    throw new Error("Invalid email format.");
  }

  console.log("Sending email with parameters:", {
    toEmail,
    patientName,
    message,
    appointmentDate,
    appointmentSlot,
  });

  try {
    const result = await emailjs.send(
      "service_fvyid4o",
      "template_zmw7igu",
      {
        email: toEmail,
        patient_name: patientName,
        message: message,
        appointment_date: appointmentDate,
        appointment_slot: appointmentSlot,
      },
      "gyNTIneY8SBg563r5"
    );
    console.log("✅ Email sent successfully:", result.text);
    return result;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};