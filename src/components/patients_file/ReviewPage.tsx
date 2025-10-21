import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDocs, collection, updateDoc, setDoc, getDoc, runTransaction, addDoc, deleteDoc } from "firebase/firestore";
import "../../assets/ReviewPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getAuth } from "firebase/auth";
import { query, where } from "firebase/firestore";
import ShortUniqueId from "short-unique-id";

interface Appointment {
  id: string;
  department: string;
  date: string;
  slotID: string;
  slotTime: string;
  reservationId: string;
  patientId: string;
  services: string[];
  complaint?: string;
  lastMenstrualPeriod?: string;
  isPregnant?: string;
  clearance?: boolean;
  shield?: boolean;
  pregnancyTestResult?: string;
  status: string;
  updatedAt?: string;
}

interface ReviewPageProps {
  formData?: {
    patientId: string;
    controlNo: string;
    patientCode: string;
    requestDate: string;
    requestTime: string;
    lastName: string;
    firstName: string;
    middleInitial: string;
    age: number | "";
    birthdate: string;
    gender: string;
    genderSpecify: string;
    citizenship: string;
    houseNo: string;
    street: string;
    province: string;
    municipality: string;
    barangay: string;
    email: string;
    contact: string;
    dentalDate?: string;
    dentalSlotId?: string;
    dentalSlotTime?: string;
    dentalReservationId?: string;
    medicalDate?: string;
    medicalSlotId?: string;
    medicalSlotTime?: string;
    medicalReservationId?: string;
    radioDate?: string;
    radioSlotId?: string;
    radioSlotTime?: string;
    radioReservationId?: string;
    labDate?: string;
    labSlotId?: string;
    labSlotTime?: string;
    labReservationId?: string;
    appointmentId?: string;
  };
  onNavigate?: (
    targetView: "allservices" | "calendar" | "labservices" | "radioservices" | "dental" | "medical" | "review" | "transaction",
    data?: any
  ) => void;
}

const ReviewPage: React.FC<ReviewPageProps> = ({ formData, onNavigate }) => {
  const safeFormData = formData ?? {
    patientId: "",
    controlNo: "",
    patientCode: "",
    requestDate: "",
    requestTime: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    age: "",
    birthdate: "",
    gender: "",
    genderSpecify: "",
    citizenship: "",
    houseNo: "",
    street: "",
    province: "",
    municipality: "",
    barangay: "",
    email: "",
    contact: "",
    dentalDate: "",
    dentalSlotId: "",
    dentalSlotTime: "",
    dentalReservationId: "",
    medicalDate: "",
    medicalSlotId: "",
    medicalSlotTime: "",
    medicalReservationId: "",
    radioDate: "",
    radioSlotId: "",
    radioSlotTime: "",
    radioReservationId: "",
    labDate: "",
    labSlotId: "",
    labSlotTime: "",
    labReservationId: "",
    appointmentId: "",
  };

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editedAppointments, setEditedAppointments] = useState<{
    [key: string]: {
      services: string[];
      otherService: string;
      complaint?: string;
      lastMenstrualPeriod?: string;
      isPregnant?: string;
      clearance?: boolean;
      shield?: boolean;
      pregnancyTestResult?: string;
    };
  }>({});
  const uidGenerator = new ShortUniqueId({ length: 8 });

  useEffect(() => {
    console.log("📌 ReviewPage: Received formData:", safeFormData);
  }, [safeFormData]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        let patientIdToQuery: string;
        if (safeFormData.patientId) {
          patientIdToQuery = safeFormData.patientId;
        } else if (currentUser) {
          patientIdToQuery = currentUser.uid;
        } else {
          console.warn("📌 ReviewPage: No logged-in user and no formData patientId.");
          setError("No authenticated user found.");
          return;
        }

        const appointmentsQuery = query(
          collection(db, "Appointments"),
          where("patientId", "==", patientIdToQuery),
          where("status", "==", "pending")
        );

        const querySnapshot = await getDocs(appointmentsQuery);
        const fetchedAppointments: Appointment[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Appointment));

        const initialEdited = fetchedAppointments.reduce((acc, appt) => {
          const otherServiceEntry = appt.services?.find((s) => s.startsWith("Others:"));
          const otherService = otherServiceEntry ? otherServiceEntry.replace("Others: ", "") : "";
          const services = appt.services?.filter((s) => !s.startsWith("Others:")) || [];
          if (otherService) {
            services.push("Others");
          }
          return {
            ...acc,
            [appt.department]: {
              services,
              otherService,
              complaint: appt.complaint || "",
              lastMenstrualPeriod: appt.lastMenstrualPeriod || "",
              isPregnant: appt.isPregnant || "No",
              clearance: appt.clearance || false,
              shield: appt.shield || false,
              pregnancyTestResult: appt.pregnancyTestResult || "Negative",
            },
          };
        }, {});
        setEditedAppointments(initialEdited);
        setAppointments(fetchedAppointments);

        const departments = ["Radiographic", "Clinical Laboratory", "Dental", "Medical"] as const;
        type DepartmentKey = typeof departments[number];
        const formDataFields: Record<DepartmentKey, { date: string | undefined; slotId: string | undefined; slotTime: string | undefined; reservationId: string | undefined }> = {
          Radiographic: { date: safeFormData.radioDate, slotId: safeFormData.radioSlotId, slotTime: safeFormData.radioSlotTime, reservationId: safeFormData.radioReservationId },
          "Clinical Laboratory": { date: safeFormData.labDate, slotId: safeFormData.labSlotId, slotTime: safeFormData.labSlotTime, reservationId: safeFormData.labReservationId },
          Dental: { date: safeFormData.dentalDate, slotId: safeFormData.dentalSlotId, slotTime: safeFormData.dentalSlotTime, reservationId: safeFormData.dentalReservationId },
          Medical: { date: safeFormData.medicalDate, slotId: safeFormData.medicalSlotId, slotTime: safeFormData.medicalSlotTime, reservationId: safeFormData.medicalReservationId },
        };
        departments.forEach((dept) => {
          const appointment = fetchedAppointments.find((a) => a.department === dept);
          console.log(`📌 ReviewPage: Comparing ${dept} - Firestore:`, appointment, "formData:", formDataFields[dept]);
        });

        console.log("📌 ReviewPage: Fetched appointments:", fetchedAppointments);
      } catch (err) {
        console.error("📌 ReviewPage: Error fetching appointments:", err);
        setError("Failed to load appointment details. Please try again.");
      }
    };

    fetchAppointments();
  }, [safeFormData.patientId]);

  const toggleService = async (department: string, service: string) => {
    setEditedAppointments((prev) => {
      const deptData = prev[department] || { services: [], otherService: "", complaint: "" };
      const services = deptData.services.includes(service)
        ? deptData.services.filter((s) => s !== service)
        : [...deptData.services, service];

      // If services become empty, clear date/time and delete appointment
      if (services.length === 0) {
        const appointment = appointments.find((a) => a.department === department);
        if (appointment) {
          // Delete the appointment document from Firestore
          const appointmentRef = doc(db, "Appointments", appointment.id);
          deleteDoc(appointmentRef).catch((err) => {
            console.error(`📌 ReviewPage: Error deleting appointment for ${department}:`, err);
            setError(`Failed to remove ${department} appointment. Please try again.`);
          });

          // Remove from local appointments state
          setAppointments((prevAppointments) =>
            prevAppointments.filter((appt) => appt.department !== department)
          );

          // Clear otherService if "Others" is unchecked
          if (service === "Others" && !services.includes("Others")) {
            return {
              ...prev,
              [department]: { ...deptData, services: [], otherService: "" },
            };
          }
        }
        return { ...prev, [department]: { ...deptData, services } };
      }

      return { ...prev, [department]: { ...deptData, services } };
    });
  };

  const handleOtherServiceChange = (department: string, value: string) => {
    setEditedAppointments((prev) => {
      const deptData = prev[department] || { services: [], otherService: "", complaint: "" };
      let services = deptData.services;
      if (value.trim() && !services.includes("Others")) {
        services = [...services, "Others"];
      } else if (!value.trim() && services.includes("Others")) {
        services = services.filter((s) => s !== "Others");
      }
      return { ...prev, [department]: { ...deptData, services, otherService: value } };
    });
  };

  const handleFieldChange = (department: string, field: string, value: any) => {
    setEditedAppointments((prev) => ({
      ...prev,
      [department]: { ...prev[department], [field]: value },
    }));
  };

  const handleChangeDateTime = async (department: string, appointment?: Appointment) => {
    const editedData = editedAppointments[department] || { services: [], otherService: "" };

    // Check if no services are selected and show an alert
    if (editedData.services.length === 0) {
      alert(`Please select at least one service for ${department} before scheduling.`);
      return;
    }

    // Check if "Others" is selected but no specification is provided
    if (editedData.services.includes("Others") && !editedData.otherService?.trim()) {
      alert(`Please specify the 'Others' service for ${department}.`);
      return;
    }

    let appointmentId = appointment?.id;
    const patientId = safeFormData.patientId || getAuth().currentUser?.uid;

    if (!patientId) {
      console.error("📌 ReviewPage: No patientId available for creating appointment");
      setError("No authenticated user or patient ID found.");
      return;
    }

    // Construct services array for Firestore
    const services = editedData.services.includes("Others") && editedData.otherService?.trim()
      ? [...editedData.services.filter((s) => s !== "Others"), `Others: ${editedData.otherService}`]
      : editedData.services;

    // If no appointment exists, create a new one
    if (!appointment) {
      try {
        const appointmentRef = doc(collection(db, "Appointments"));
        appointmentId = appointmentRef.id;
        await setDoc(appointmentRef, {
          department,
          patientId,
          status: "pending",
          createdAt: new Date().toISOString(),
          services,
          complaint: editedData.complaint || "",
          ...(department === "Radiographic" && {
            lastMenstrualPeriod: editedData.lastMenstrualPeriod || "",
            isPregnant: editedData.isPregnant || "No",
            clearance: editedData.clearance || false,
            shield: editedData.shield || false,
            pregnancyTestResult: editedData.pregnancyTestResult || "Negative",
          }),
        });
        console.log(`📌 ReviewPage: Created new appointment for ${department} with ID: ${appointmentId}`);
        // Update appointments state to include the new appointment
        setAppointments((prev) => [
          ...prev,
          {
            id: appointmentId!,
            department,
            patientId,
            status: "pending",
            date: "",
            slotID: "",
            slotTime: "",
            reservationId: "",
            services,
            complaint: editedData.complaint || "",
            ...(department === "Radiographic" && {
              lastMenstrualPeriod: editedData.lastMenstrualPeriod || "",
              isPregnant: editedData.isPregnant || "No",
              clearance: editedData.clearance || false,
              shield: editedData.shield || false,
              pregnancyTestResult: editedData.pregnancyTestResult || "Negative",
            }),
          },
        ]);
      } catch (err) {
        console.error(`📌 ReviewPage: Error creating new appointment for ${department}:`, err);
        setError(`Failed to initialize appointment for ${department}. Please try again.`);
        return;
      }
    } else {
      // Update existing appointment with current services
      try {
        const appointmentRef = doc(db, "Appointments", appointment.id);
        await updateDoc(appointmentRef, {
          services,
          complaint: editedData.complaint || "",
          ...(department === "Radiographic" && {
            lastMenstrualPeriod: editedData.lastMenstrualPeriod || "",
            isPregnant: editedData.isPregnant || "No",
            clearance: editedData.clearance || false,
            shield: editedData.shield || false,
            pregnancyTestResult: editedData.pregnancyTestResult || "Negative",
          }),
          updatedAt: new Date().toISOString(),
        });
        console.log(`📌 ReviewPage: Updated appointment for ${department} with ID: ${appointmentId}`);
      } catch (err) {
        console.error(`📌 ReviewPage: Error updating appointment for ${department}:`, err);
        setError(`Failed to update services for ${department}. Please try again.`);
        return;
      }
    }

    const navigateData = {
      ...safeFormData,
      appointmentId,
      patientId,
      fromReview: true,
      department,
      previousDate: appointment?.date,
      previousSlotId: appointment?.slotID,
      previousSlotTime: appointment?.slotTime,
      previousReservationId: appointment?.reservationId,
      services, // Pass services to calendar view if needed
    };
    console.log(`📌 ReviewPage: Navigating to calendar for ${department} with data:`, navigateData);
    onNavigate?.("calendar", navigateData);
  };

  const finalizeBooking = async ({
    department,
    date,
    slotId,
    reservationId,
    previousDate,
    previousSlotId,
  }: {
    department: string;
    date: string | null;
    slotId: string | null;
    reservationId: string | null;
    previousDate?: string | null;
    previousSlotId?: string | null;
  }) => {
    if (!date || !slotId || !reservationId) {
      console.error(`📌 ReviewPage: Missing data for ${department} booking`, { date, slotId, reservationId });
      throw new Error(`Missing required data for ${department} booking`);
    }

    try {
      console.log(`📌 ReviewPage: Finalizing ${department} booking - Date: ${date}, SlotId: ${slotId}, ReservationId: ${reservationId}, PreviousDate: ${previousDate}, PreviousSlotId: ${previousSlotId}`);
      await runTransaction(db, async (transaction) => {
        // Perform all reads first
        const slotRef = doc(db, "Departments", department, "Slots", date);
        const slotSnap = await transaction.get(slotRef);

        const reservationRef = doc(db, "Departments", department, "Reservations", reservationId);
        const reservationSnap = await transaction.get(reservationRef);

        const previousSlotRef = previousDate && previousSlotId ? doc(db, "Departments", department, "Slots", previousDate) : null;
        const previousSlotSnap = previousSlotRef ? await transaction.get(previousSlotRef) : null;

        // Validate reads
        if (!slotSnap.exists()) {
          console.error(`📌 ReviewPage: Slot document for ${department} on ${date} does not exist`);
          throw new Error(`${department} slot date not found`);
        }

        if (!reservationSnap.exists()) {
          console.error(`📌 ReviewPage: Reservation ${reservationId} for ${department} does not exist`);
          throw new Error(`Reservation for ${department} not found`);
        }

        const data = slotSnap.data();
        const currentSlots = data.slots || [];
        const slotIndex = currentSlots.findIndex((s: any) => s.slotID === slotId);

        if (slotIndex === -1 || currentSlots[slotIndex].remaining <= 0) {
          console.error(`📌 ReviewPage: Slot ${slotId} in ${department} is unavailable or overbooked`);
          throw new Error(`${department} slot unavailable`);
        }

        // Update slot counts
        currentSlots[slotIndex].remaining -= 1;
        const newTotal = currentSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);
        transaction.update(slotRef, {
          slots: currentSlots,
          totalSlots: newTotal,
          updatedAt: new Date().toISOString(),
        });

        // Restore previous slot if it exists and is not closed
        if (previousSlotSnap && previousSlotSnap.exists() && !previousSlotSnap.data().closed && previousSlotId) {
          const previousSlots = previousSlotSnap.data().slots || [];
          const previousSlotIndex = previousSlots.findIndex((s: any) => s.slotID === previousSlotId);
          if (previousSlotIndex !== -1) {
            previousSlots[previousSlotIndex].remaining += 1;
            const previousTotal = previousSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);
            transaction.update(previousSlotRef!, {
              slots: previousSlots,
              totalSlots: previousTotal,
              updatedAt: new Date().toISOString(),
            });
            console.log(`📌 ReviewPage: Restored slot ${previousSlotId} on ${previousDate}`);
          }
        }

        transaction.update(reservationRef, {
          status: "confirmed",
          updatedAt: new Date().toISOString(),
        });

        console.log(`📌 ReviewPage: Updated ${department} slot ${slotId} to ${currentSlots[slotIndex].remaining} remaining, confirmed reservation ${reservationId}`);
      });
      console.log(`📌 ReviewPage: ${department} booking finalized successfully!`);
    } catch (err) {
      console.error(`📌 ReviewPage: Error finalizing ${department} booking:`, err);
      throw err;
    }
  };

  const handleDownloadPDF = async () => {
    const formElement = document.querySelector(".all-services-container");
    if (!formElement) return;

    try {
      const buttons = document.querySelectorAll(".download-btn, .submit-btn, .change-btn") as NodeListOf<HTMLElement>;
      buttons.forEach((btn) => (btn.style.display = "none"));

      const certDiv = document.createElement("div");
      certDiv.style.marginTop = "30px";
      certDiv.style.textAlign = "center";
      certDiv.innerHTML = `
        <p style="font-weight:bold; font-size:1rem;">
          I hereby certify that the above information is true and correct.
        </p>
        <div style="margin-top:50px;">
          <p>__________________________</p>
          <p>Signature over Printed Name</p>
        </div>
      `;
      formElement.appendChild(certDiv);

      const canvas = await html2canvas(formElement as HTMLElement, {
        scale: 2,
        useCORS: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 15;
      const imgWidth = pageWidth - marginX * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");

      let position = 0;
      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d")!;
      const pageHeightPx = (canvas.width * pageHeight) / pageWidth;

      while (position < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - position);

        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          position,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const imgData = pageCanvas.toDataURL("image/png");
        const sliceHeightMM = (sliceHeight * imgWidth) / canvas.width;

        if (position === 0) {
          pdf.addImage(imgData, "PNG", marginX, marginY, imgWidth, sliceHeightMM);
        } else {
          pdf.addPage();
          pdf.addImage(imgData, "PNG", marginX, marginY, imgWidth, sliceHeightMM);
        }

        position += sliceHeight;
      }

      certDiv.remove();
      buttons.forEach((btn) => (btn.style.display = "inline-block"));

      pdf.save("appointment_review.pdf");
    } catch (err) {
      console.error("📌 ReviewPage: Error generating PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  const handleSubmit = async () => {
    try {
      if (appointments.length === 0) {
        setError("No appointments found to submit.");
        return;
      }

      const validAppointments = appointments.filter((appointment) => {
        const editedData = editedAppointments[appointment.department] || {};
        return editedData.services && editedData.services.length > 0;
      });

      if (validAppointments.length === 0) {
        setError("No departments have services selected. Please select at least one service for one department.");
        return;
      }

      const confirmSubmit = window.confirm("Are you sure you want to submit?");
      if (!confirmSubmit) return;

      const auth = getAuth();
      const currentUser = auth.currentUser;
      let userId = "";

      if (currentUser) {
        const userRef = doc(db, "Users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userId = userSnap.data().UserId || "";
        } else {
          setError("User data not found.");
          return;
        }
      } else {
        setError("No logged-in user found.");
        return;
      }

      for (const appointment of validAppointments) {
        console.log(`📌 ReviewPage: Processing appointment for ${appointment.department}:`, appointment);
        if (!appointment.reservationId || !appointment.slotID || !appointment.date || !appointment.slotTime) {
          console.error(`📌 ReviewPage: Missing critical fields for ${appointment.department}`, appointment);
          setError(`Missing required data (reservationId, slotID, date, or slotTime) for ${appointment.department} appointment.`);
          return;
        }

        const editedData = editedAppointments[appointment.department] || {};
        if (editedData.services.includes("Others") && !editedData.otherService?.trim()) {
          setError(`Please specify the 'Others' service for ${appointment.department}.`);
          return;
        }
        const services = editedData.services.includes("Others") && editedData.otherService?.trim()
          ? [...editedData.services.filter((s) => s !== "Others"), `Others: ${editedData.otherService}`]
          : editedData.services;

        const appointmentRef = doc(db, "Appointments", appointment.id);
        await updateDoc(appointmentRef, {
          services,
          complaint: editedData.complaint || "",
          ...(appointment.department === "Radiographic" && {
            lastMenstrualPeriod: editedData.lastMenstrualPeriod || "",
            isPregnant: editedData.isPregnant || "No",
            clearance: editedData.clearance || false,
            shield: editedData.shield || false,
            pregnancyTestResult: editedData.pregnancyTestResult || "Negative",
          }),
          updatedAt: new Date().toISOString(),
        });

        await finalizeBooking({
          department: appointment.department,
          date: appointment.date,
          slotId: appointment.slotID,
          reservationId: appointment.reservationId,
        });

        await updateDoc(appointmentRef, {
          status: "submitted",
          updatedAt: new Date().toISOString(),
        });

        const transactionRef = doc(collection(db, "Transactions"));
        await setDoc(transactionRef, {
          uid: currentUser?.uid,
          UserId: userId,
          patientId: appointment.patientId || safeFormData.patientId,
          transactionCode: `TRANS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          controlNo: safeFormData.controlNo,
          purpose: appointment.department,
          services: services || [],
          doctor: "TBA",
          date: appointment.date || "",
          slotTime: appointment.slotTime || "",
          slotID: appointment.slotID || "",
          status: "Pending",
          createdAt: new Date().toISOString(),
          transactionId: transactionRef.id,
          reservationId: appointment.reservationId,
        });
      }

      alert("✅ Appointments submitted and slots updated!");
      onNavigate?.("transaction", {});
    } catch (err: unknown) {
      console.error("📌 ReviewPage: Error submitting appointments:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`❌ Failed to submit appointments: ${errorMessage}`);
    }
  };

  const servicesByCategory: { [key: string]: string[] } = {
    Abdomen: ["Abdomen Supine", "Abdomen Upright"],
    Chest: ["Chest PA", "Chest Lateral", "Chest Apicolordotic"],
    Spine: ["Cervical AP & L", "Thoracic AP & L", "Lumbosacral AP & L", "Thoracolumbar"],
    Extremities: [
      "Ankle AP & L",
      "Elbow AP & L",
      "Femur AP & L",
      "Forearm AP & L",
      "Foot AP & L",
      "Hand AP & L",
      "Hip AP & L",
      "Humerus AP & L",
      "Knee AP & L",
      "Leg AP & L",
      "Wrist AP & L",
      "Pelvis AP",
      "Shoulder (Int/Ext)",
    ],
    "Head & Sinuses": ["Skull AP & L", "Paranasal Sinuses (C.W.L.)", "Waters’ Vie"],
    Others: ["Others"],
  };

  const servicesByCategoryLab: { [key: string]: string[] } = {
    Screening: ["Drug Test"],
    Hematology: ["Complete Blood Count (CBC)", "Clotting Time and Bleeding Time"],
    "Microscopy-Parasitology": ["Urinalysis", "Fecalysis"],
    "Clinical Chemistry": [
      "RBS (Random Blood Sugar)",
      "FBS (Fasting Blood Sugar)",
      "Lipid Panel",
      "Cholesterol",
      "Triglycerides",
      "High-Density Lipoprotein (HDL)",
      "Low-Density Lipoprotein (LDL)",
      "Very Low-Density Lipoprotein (VLDL)",
      "Serum Sodium (Na+)",
      "Serum Potassium (K+)",
      "Serum Chloride (Cl-)",
      "Serum Creatinine",
      "SGOT / AST",
      "SGPT / ALT",
      "BUA (Blood Uric Acid)",
      "BUN (Blood Urea Nitrogen)",
    ],
    "Immunology and Serology": [
      "HBsAg Screening Test",
      "HCV Screening Test",
      "Syphilis Screening Test",
      "Dengue Duo NS1",
      "Pregnancy Test",
      "Blood Typing",
    ],
    "Blood Chemistry": ["HbA1c"],
    Others: ["Others"],
  };

  const servicesDental: { [key: string]: string[] } = {
    "Dental Services": [
      "Check-up",
      "Oral Prophylaxis",
      "Simple Extraction",
      "Complex Extraction",
      "Temporary Filling",
      "Permanent Filling",
      "Gum Treatment",
      "Incision and Drainage",
    ],
    Others: ["Others"],
  };

  const servicesMedical: { [key: string]: string[] } = {
    "Medical Services": [
      "General Consultation",
      "Pediatric Consultation",
      "Prenatal Consultation",
      "Postnatal Consultation",
      "Family Planning Consultation",
      "Senior Citizen / Geriatric Consultation",
      "Nutrition Counseling",
    ],
    Others: ["Others"],
  };

  return (
    <div className="main-holder">
      <div className="all-services-container">
        <div className="form-header">
          <div className="header-left">
            <img src="/logo.png" alt="DOH Logo" />
          </div>
          <div className="header-center">
            <p>Republic of the Philippines</p>
            <p>Department of Health</p>
            <p>Treatment and Rehabilitation Center Argao</p>
            <h3>OUTPATIENT REQUEST FORM</h3>
          </div>
          <div className="header-right">
            <p>Document No.: TRC-AOD-FM07</p>
            <p>Effective Date: 14 October 2024</p>
            <p>Revision No.: 1</p>
            <p>Page No.: Page 1 of 1</p>
          </div>
        </div>

        {error && <div className="error-message text-red-500 mb-4">{error}</div>}

        <form className="all-services-form">
          <h3 className="text-lg font-bold mb-4">Patient Information</h3>
          <div className="field-group">
            <div>
              <label>Date of Request</label>
              <input type="date" value={safeFormData.requestDate} readOnly />
            </div>
            <div>
              <label>Time of Request</label>
              {/* Fix: Changed from requestDate to requestTime */}
              <input type="time" value={safeFormData.requestTime} readOnly />
            </div>
            <div>
              <label>Control No.</label>
              <input type="text" value={safeFormData.controlNo} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Last Name</label>
              <input type="text" value={safeFormData.lastName} readOnly />
            </div>
            <div>
              <label>First Name</label>
              <input type="text" value={safeFormData.firstName} readOnly />
            </div>
            <div>
              <label>Middle Initial</label>
              <input type="text" value={safeFormData.middleInitial} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Birthdate</label>
              <input type="date" value={safeFormData.birthdate} readOnly />
            </div>
            <div>
              <label>Age</label>
              <input type="number" value={safeFormData.age} readOnly />
            </div>
            <div>
              <label>Gender</label>
              <input type="text" value={safeFormData.gender} readOnly />
            </div>
          </div>

          {safeFormData.gender === "LGBTQ+" && (
            <div className="conditional-field">
              <label>LGBTQ+ Specification</label>
              <input type="text" value={safeFormData.genderSpecify} readOnly />
            </div>
          )}

          <div>
            <label>Citizenship</label>
            <input type="text" value={safeFormData.citizenship} readOnly />
          </div>

          <div className="house-street-group">
            <div>
              <label>House No.</label>
              <input type="text" value={safeFormData.houseNo} readOnly />
            </div>
            <div>
              <label>Street</label>
              <input type="text" value={safeFormData.street} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Province</label>
              <input type="text" value={safeFormData.province} readOnly />
            </div>
            <div>
              <label>Municipality/City</label>
              <input type="text" value={safeFormData.municipality} readOnly />
            </div>
            <div>
              <label>Barangay</label>
              <input type="text" value={safeFormData.barangay} readOnly />
            </div>
          </div>

          <div>
            <label>Email Address</label>
            <input type="email" value={safeFormData.email} readOnly />
          </div>

          <div>
            <label>Mobile/Contact Number</label>
            <input type="tel" value={safeFormData.contact} readOnly />
          </div>

          <div className="services-wrapper">
            <div className="services-container">
              {["Radiographic", "Clinical Laboratory", "Dental", "Medical"].map((dept) => {
                const appointment = appointments.find((a) => a.department === dept);
                const editedData = editedAppointments[dept] || {
                  services: [],
                  otherService: "",
                  complaint: "",
                  lastMenstrualPeriod: "",
                  isPregnant: "No",
                  clearance: false,
                  shield: false,
                  pregnancyTestResult: "Negative",
                };
                const isScheduleDisabled = editedData.services.length === 0;

                return (
                  <div key={dept} className="service-box">
                    <h4>{dept} Services</h4>

                    {dept === "Radiographic" && (
                      <table>
                        <tbody>
                          {Object.entries(servicesByCategory).map(([category, services]) => (
                            <React.Fragment key={category}>
                              <tr className="category-row">
                                <td colSpan={2}>{category}</td>
                              </tr>
                              {services.map((service) => {
                                const isChecked = editedData.services.includes(service);
                                if (service === "Others") {
                                  return (
                                    <tr key="Others">
                                      <td>
                                        <input
                                          type="text"
                                          value={editedData.otherService}
                                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                                          className="border p-2 rounded w-full"
                                          placeholder="Please specify"
                                        />
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleService(dept, "Others")}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={service}>
                                    <td>{service}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleService(dept, service)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <tr>
                            <td colSpan={2}>
                              <span style={{ fontWeight: "bold" }}>
                                Complaint / History (For Female Patients only, ages 10 to 55)
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Date of Last Menstrual Period:</td>
                            <td>
                              <input
                                type="date"
                                value={editedData.lastMenstrualPeriod}
                                onChange={(e) => handleFieldChange(dept, "lastMenstrualPeriod", e.target.value)}
                                className="border p-2 rounded w-full"
                              />
                            </td>
                          </tr>
                          <tr>
                            <td>Are you Pregnant?</td>
                            <td>
                              <div className="flex flex-col space-y-2">
                                <label>
                                  <input
                                    type="radio"
                                    value="Yes"
                                    checked={editedData.isPregnant === "Yes"}
                                    onChange={() => handleFieldChange(dept, "isPregnant", "Yes")}
                                    className="mr-2"
                                  />
                                  Yes
                                </label>
                                {editedData.isPregnant === "Yes" && (
                                  <div className="ml-4 text-sm">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={editedData.clearance}
                                        onChange={(e) => handleFieldChange(dept, "clearance", e.target.checked)}
                                        className="mr-2"
                                      />
                                      With clearance of the attending doctor
                                    </label>
                                    <br />
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={editedData.shield}
                                        onChange={(e) => handleFieldChange(dept, "shield", e.target.checked)}
                                        className="mr-2"
                                      />
                                      With abdominal lead shield
                                    </label>
                                  </div>
                                )}
                                <label>
                                  <input
                                    type="radio"
                                    value="No"
                                    checked={editedData.isPregnant === "No"}
                                    onChange={() => handleFieldChange(dept, "isPregnant", "No")}
                                    className="mr-2"
                                  />
                                  No
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    value="Not sure/Delayed"
                                    checked={editedData.isPregnant === "Not sure/Delayed"}
                                    onChange={() => handleFieldChange(dept, "isPregnant", "Not sure/Delayed")}
                                    className="mr-2"
                                  />
                                  Not sure/Delayed
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>Pregnancy Test Result:</td>
                            <td>
                              <label>
                                <input
                                  type="radio"
                                  value="Positive"
                                  checked={editedData.pregnancyTestResult === "Positive"}
                                  onChange={() => handleFieldChange(dept, "pregnancyTestResult", "Positive")}
                                  className="mr-2"
                                />
                                Positive
                              </label>
                              <br />
                              <label>
                                <input
                                  type="radio"
                                  value="Negative"
                                  checked={editedData.pregnancyTestResult === "Negative"}
                                  onChange={() => handleFieldChange(dept, "pregnancyTestResult", "Negative")}
                                  className="mr-2"
                                />
                                Negative
                              </label>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2}>
                              Date: <strong>{appointment?.date || "Not scheduled"}</strong> &nbsp;&nbsp;
                              Time: <strong>{appointment?.slotTime || "Not scheduled"}</strong> &nbsp;&nbsp;
                              <button
                                type="button"
                                className="change-btns"
                                onClick={() => handleChangeDateTime(dept, appointment)}
                                disabled={isScheduleDisabled}
                              >
                                {appointment ? "Change" : "Schedule"}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {dept === "Clinical Laboratory" && (
                      <table>
                        <tbody>
                          {Object.entries(servicesByCategoryLab).map(([category, services]) => (
                            <React.Fragment key={category}>
                              <tr className="category-row">
                                <td colSpan={2}>{category}</td>
                              </tr>
                              {services.map((service) => {
                                const isChecked = editedData.services.includes(service);
                                if (service === "Others") {
                                  return (
                                    <tr key="Others">
                                      <td>
                                        <input
                                          type="text"
                                          value={editedData.otherService}
                                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                                          className="border p-2 rounded w-full"
                                          placeholder="Please specify"
                                        />
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleService(dept, "Others")}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={service}>
                                    <td>{service}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleService(dept, service)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <tr>
                            <td colSpan={2}>
                              Date: <strong>{appointment?.date || "Not scheduled"}</strong> &nbsp;&nbsp;
                              Time: <strong>{appointment?.slotTime || "Not scheduled"}</strong> &nbsp;&nbsp;
                              <button
                                type="button"
                                className="change-btns"
                                onClick={() => handleChangeDateTime(dept, appointment)}
                                disabled={isScheduleDisabled}
                              >
                                {appointment ? "Change" : "Schedule"}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {dept === "Dental" && (
                      <table>
                        <tbody>
                          {Object.entries(servicesDental).map(([category, services]) => (
                            <React.Fragment key={category}>
                              <tr className="category-row">
                                <td colSpan={2}>{category}</td>
                              </tr>
                              {services.map((service) => {
                                const isChecked = editedData.services.includes(service);
                                if (service === "Others") {
                                  return (
                                    <tr key="Others">
                                      <td>
                                        <input
                                          type="text"
                                          value={editedData.otherService}
                                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                                          className="border p-2 rounded w-full"
                                          placeholder="Please specify"
                                        />
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleService(dept, "Others")}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={service}>
                                    <td>{service}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleService(dept, service)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <tr>
                            <td colSpan={2}>
                              Date: <strong>{appointment?.date || "Not scheduled"}</strong> &nbsp;&nbsp;
                              Time: <strong>{appointment?.slotTime || "Not scheduled"}</strong> &nbsp;&nbsp;
                              <button
                                type="button"
                                className="change-btns"
                                onClick={() => handleChangeDateTime(dept, appointment)}
                                disabled={isScheduleDisabled}
                              >
                                {appointment ? "Change" : "Schedule"}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {dept === "Medical" && (
                      <table>
                        <tbody>
                          {Object.entries(servicesMedical).map(([category, services]) => (
                            <React.Fragment key={category}>
                              <tr className="category-row">
                                <td colSpan={2}>{category}</td>
                              </tr>
                              {services.map((service) => {
                                const isChecked = editedData.services.includes(service);
                                if (service === "Others") {
                                  return (
                                    <tr key="Others">
                                      <td>
                                        <input
                                          type="text"
                                          value={editedData.otherService}
                                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                                          className="border p-2 rounded w-full"
                                          placeholder="Please specify"
                                        />
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleService(dept, "Others")}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={service}>
                                    <td>{service}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleService(dept, service)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <tr>
                            <td colSpan={2}>
                              Date: <strong>{appointment?.date || "Not scheduled"}</strong> &nbsp;&nbsp;
                              Time: <strong>{appointment?.slotTime || "Not scheduled"}</strong> &nbsp;&nbsp;
                              <button
                                type="button"
                                className="change-btns"
                                onClick={() => handleChangeDateTime(dept, appointment)}
                                disabled={isScheduleDisabled}
                              >
                                {appointment ? "Change" : "Schedule"}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="button-containers flex justify-between mt-6">
            <button
              type="button"
              className="nav-button download-btn bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleDownloadPDF}
            >
              📄 Download PDF
            </button>
            <button
              type="button"
              className="nav-button submit-btn bg-green-500 text-white px-4 py-2 rounded"
              onClick={handleSubmit}
            >
              ✅ Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewPage;