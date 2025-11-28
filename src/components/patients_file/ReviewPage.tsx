import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDocs, collection, updateDoc, setDoc, getDoc, runTransaction,  deleteDoc, onSnapshot } from "firebase/firestore";
import "../../assets/ReviewPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getAuth } from "firebase/auth";
import { query, where } from "firebase/firestore";
import ShortUniqueId from "short-unique-id";
import { X } from "lucide-react";
import { DEFAULT_SERVICES } from "../../config/defaultServices";
import { DEFAULT_CLINICAL_SERVICES } from "../../config/defaultClinicalServices";
import { DEFAULT_DENTAL_SERVICES } from "../../config/defaultDentalServices";
import { DEFAULT_MEDICAL_SERVICES } from "../../config/defaultMedicalServices";


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
    const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "confirm">("confirm");
  const [onModalConfirm, setOnModalConfirm] = useState<() => void>(() => {});

  
  const [radiologyServices, setRadiologyServices] = useState<Record<string, string[]>>({});


 useEffect(() => {
  const q = query(
    collection(db, "RadiologyServices"),
    where("department", "==", "Radiographic"),
    where("enabled", "==", true),
    where("isDeleted", "==", false)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const map: Record<string, string[]> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!map[data.category]) map[data.category] = [];
      map[data.category].push(data.name);
    });

    // Sort categories alphabetically
    const sortedMap: Record<string, string[]> = {};
    Object.keys(map)
      .sort()
      .forEach((key) => {
        sortedMap[key] = map[key];
      });

    setRadiologyServices(sortedMap); // already have this state
  }, (error) => {
    console.error("Error loading radiology services:", error);
    setError("Failed to load Radiographic services.");
  });

  return () => unsub();
}, []);


  const openModal = (
    message: string,
    type: "success" | "error" | "confirm",
    onConfirm?: () => void
  ) => {
    setModalMessage(message);
    setModalType(type);
    if (onConfirm) setOnModalConfirm(() => onConfirm);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setOnModalConfirm(() => {});
  };


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
    throw new Error(`Missing required data for ${department} booking`);
  }

  try {
    await runTransaction(db, async (transaction) => {
      const slotRef = doc(db, "Departments", department, "Slots", date);
      const slotSnap = await transaction.get(slotRef);
      const reservationRef = doc(db, "Departments", department, "Reservations", reservationId);
      const reservationSnap = await transaction.get(reservationRef);

      // Restore previous slot if exists
      if (previousDate && previousSlotId) {
        const prevSlotRef = doc(db, "Departments", department, "Slots", previousDate);
        const prevSnap = await transaction.get(prevSlotRef);
        if (prevSnap.exists() && !prevSnap.data()?.closed && !prevSnap.data()?.unlimited) {
          const prevSlots = prevSnap.data()?.slots || [];
          const idx = prevSlots.findIndex((s: any) => s.slotID === previousSlotId);
          if (idx !== -1) {
            prevSlots[idx].remaining += 1;
            const total = prevSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);
            transaction.update(prevSlotRef, {
              slots: prevSlots,
              totalSlots: total,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Check if the target date is unlimited
      if (!slotSnap.exists()) {
        throw new Error("Slot document not found");
      }

      const slotData = slotSnap.data()!;

      // KUNG UNLIMITED → ayaw na decrement, ayaw na check remaining
      if (slotData.unlimited) {
        console.log(`Unlimited slot detected for ${department} on ${date}. Skipping decrement.`);
      } 
      // KUNG NAay SLOTS ARRAY (normal mode)
      else if (slotData.slots && Array.isArray(slotData.slots)) {
        const currentSlots = slotData.slots;
        const slotIndex = currentSlots.findIndex((s: any) => s.slotID === slotId);

        if (slotIndex === -1) {
          throw new Error(`Slot ID ${slotId} not found in slots array`);
        }
        if (currentSlots[slotIndex].remaining <= 0) {
          throw new Error(`Slot ${slotId} is fully booked`);
        }

        currentSlots[slotIndex].remaining -= 1;
        const newTotal = currentSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);

        transaction.update(slotRef, {
          slots: currentSlots,
          totalSlots: newTotal,
          updatedAt: new Date().toISOString(),
        });
      }
      // KUNG WALA slots array pero naay totalSlots (old format?) → skip or warn
      else {
        console.warn("No slots array found, but not unlimited. Possible data issue.");
      }

      // Confirm reservation
      transaction.update(reservationRef, {
        status: "confirmed",
        updatedAt: new Date().toISOString(),
      });
    });

    console.log(`${department} booking finalized successfully! (Unlimited: ${slotId.startsWith("UNLIMITED")})`);
  } catch (err: any) {
    console.error(`Error finalizing ${department} booking:`, err);
    throw err;
  }
};

const [isPdfDownloaded, setIsPdfDownloaded] = useState(false);

const handleDownloadPDF = async () => {
  const element = document.querySelector(".all-services-container") as HTMLElement;
  if (!element) {
    openModal("Page content not found.", "error");
    return;
  }

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, .button-containers, .change-btns').forEach(el => el.remove());

    // INJECT SUPER CLEAN PRINT STYLES
    const printStyle = document.createElement("style");
    printStyle.innerHTML = `
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif !important; }
      .all-services-container {
        width: 215.9mm !important;
        padding: 8mm 9mm !important;
        font-size: 9pt !important;
        line-height: 1.2 !important;
      }

      /* FORCE EACH SERVICE BOX TO START ON NEW PAGE */
      .service-box {
        page-break-before: always !important;   /* ← KINI ANG MAGIC */
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        margin-top: 5mm !important;            /* ← Margin sa taas para limpyo */
        border: 1px solid #003087 !important;
        border-radius: 4px !important;
        overflow: hidden;
      }

      .service-box:first-of-type {
        page-break-before: avoid !important;    /* Ang una ra (Clinical Lab) dili mag-new page */
        margin-top: 4mm !important;
      }

      .service-box h4 {
        background: #003087 !important;
        color: white !important;
        padding: 8px !important;
        margin: -8px -9px 10px -9px !important;
        font-size: 8pt !important;
        text-align: center;
        font-weight: bold;
      }

      table { 
        width: 100% !important; 
        font-size: 8pt !important; 
        border-collapse: collapse;
      }
      td { padding: 3px 5px !important; vertical-align: top; }
      .category-row td {
        background: #e6e6e6 !important;
        font-weight: bold !important;
        font-size: 8pt !important;
        padding: 5px !important;
      }

      /* Schedule footer */
      .schedule-footer {
        padding: 8px !important;
        background: #f0f0f0 !important;
        border-top: 1px solid #ccc !important;
        font-size: 9.5pt !important;
        font-weight: bold;
        margin-top: auto;
      }

      /* Certification page */
      .cert-page {
        page-break-before: always;
        height: 150.2mm;
        padding: 60mm 20mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
    `;
    clone.appendChild(printStyle);

    // Add certification
    const certDiv = document.createElement("div");
    certDiv.className = "cert-page";
    certDiv.innerHTML = `
      <p style="font-size: 10pt; font-weight: bold; margin-bottom: 30px; ">
        I hereby certify that the above information is true and correct.
      </p>
      <div style="margin: 50px 0;">
        <p style="font-size: 9pt; font-weight: bold;">
          ${`${safeFormData.lastName}, ${safeFormData.firstName}${safeFormData.middleInitial ? ' ' + safeFormData.middleInitial + '.' : ''}`.toUpperCase()}
        </p>
        <div style="border-bottom: 2px solid #000; width: 480px; margin: 20px auto;"></div>
        <p style="font-size: 9pt; font-style: italic; color: #333;">Signature over Printed Name</p>
      </div>
      <p style="font-size: 10pt; margin-top: 30px;">
        Date: <strong>${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
      </p>
    `;
    clone.appendChild(certDiv);

    // Temporary container
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "215.9mm";
    container.style.background = "white";
    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 1500));

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 815,
      windowWidth: 815,
      logging: false,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [215.9, 330.2],
    });

    const pageHeight = 330.2;
    const imgHeight = (canvas.height * 215.9) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, 215.9, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, 215.9, imgHeight);
      heightLeft -= pageHeight;
    }

    const patientName = `${safeFormData.lastName}_${safeFormData.firstName}`
      .replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    pdf.save(`TRC_Outpatient_Request_${patientName}_${dateStr}.pdf`);


    setIsPdfDownloaded(true);
    openModal("PDF downloaded successfully!", "success");
  } catch (err) {
    console.error("PDF Error:", err);
    openModal("Failed to generate PDF.", "error");
    setIsPdfDownloaded(false);
  }
};


   const handleSubmit = async () => {
    if (!isPdfDownloaded) {
    openModal(
      "Please download the PDF form first before submitting.\n\nThis is required for your records and verification.",
      "error"
    );
    return;
  }
    try {
      if (appointments.length === 0) {
        openModal("No appointments found to submit.", "error");
        return;
      }

      const validAppointments = appointments.filter((appointment) => {
        const editedData = editedAppointments[appointment.department] || {};
        return editedData.services && editedData.services.length > 0;
      });

      if (validAppointments.length === 0) {
        openModal("No departments have services selected. Please select at least one service.", "error");
        return;
      }

      openModal(
        "Are you sure you want to submit your appointment request?",
        "confirm",
        async () => {
          try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            let userId = "";

            if (currentUser) {
              const userRef = doc(db, "Users", currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                userId = userSnap.data().UserId || "";
              } else {
                openModal("User data not found.", "error");
                return;
              }
            } else {
              openModal("No logged-in user found.", "error");
              return;
            }

            for (const appointment of validAppointments) {
              if (!appointment.reservationId || !appointment.slotID || !appointment.date || !appointment.slotTime) {
                openModal(`Missing data for ${appointment.department}. Please schedule first.`, "error");
                return;
              }

              const editedData = editedAppointments[appointment.department] || {};
              if (editedData.services.includes("Others") && !editedData.otherService?.trim()) {
                openModal(`Please specify the 'Others' service for ${appointment.department}.`, "error");
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

            openModal("Appointments submitted successfully!\n\nYou can check your transactions.", "success");
            setTimeout(() => {
              onNavigate?.("transaction", {});
            }, 2000);
          } catch (err: unknown) {
            console.error("Submit error:", err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            openModal(`Failed to submit: ${msg}`, "error");
          }
        }
      );
    } catch (err: unknown) {
      console.error("Submit error:", err);
      openModal("An error occurred. Please try again.", "error");
    }
  };


  const [radiologyServicesMerged, setRadiologyServicesMerged] = useState<Record<string, string[]>>({});
useEffect(() => {
  const q = query(
    collection(db, "RadiologyServices"),
    where("department", "==", "Radiographic"),
    where("enabled", "==", true),
    where("isDeleted", "==", false)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const fromDb: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category as string;
      const name = data.name as string;

      if (!fromDb[category]) fromDb[category] = [];
      fromDb[category].push(name);
    });

    // Start with defaults (now Record<string, ...> so safe)
    const merged: Record<string, string[]> = { ...DEFAULT_SERVICES };

    // Add dynamic services (new categories + new items)
    Object.entries(fromDb).forEach(([category, services]) => {
      if (!merged[category]) {
        merged[category] = [];
      }
      services.forEach((svc) => {
        if (!merged[category].includes(svc)) {
          merged[category].push(svc);
        }
      });
    });

    // Sort categories
    const sorted = Object.keys(merged)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = merged[key].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);

    setRadiologyServicesMerged(sorted);
  }, (error) => {
    console.error("Error loading radiology services:", error);
    const fallback = Object.keys(DEFAULT_SERVICES)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = [...DEFAULT_SERVICES[key]].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);
    setRadiologyServicesMerged(fallback);
  });

  return () => unsub();
}, []);




const [clinicalServicesMerged, setClinicalServicesMerged] = useState<Record<string, string[]>>({});


 useEffect(() => {
  const q = query(
    collection(db, "ClinicalServices"),
    where("department", "==", "Clinical Laboratory"),
    where("enabled", "==", true),
    where("isDeleted", "==", false)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const fromDb: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category as string;
      const name = data.name as string;

      if (!fromDb[category]) fromDb[category] = [];
      fromDb[category].push(name);
    });

    // Merge with defaults
    const merged: Record<string, string[]> = { ...DEFAULT_CLINICAL_SERVICES };

    Object.entries(fromDb).forEach(([category, services]) => {
      if (!merged[category]) merged[category] = [];
      services.forEach((svc) => {
        if (!merged[category].includes(svc)) {
          merged[category].push(svc);
        }
      });
    });

    // Sort everything
    const sorted = Object.keys(merged)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = merged[key].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);

    setClinicalServicesMerged(sorted);
  }, (error) => {
    console.error("Error loading clinical services:", error);
    // Fallback to defaults
    const fallback = Object.keys(DEFAULT_CLINICAL_SERVICES)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = [...DEFAULT_CLINICAL_SERVICES[key]].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);
    setClinicalServicesMerged(fallback);
  });

  return () => unsub();
}, []);


const [dentalServicesMerged, setDentalServicesMerged] = useState<Record<string, string[]>>({});
useEffect(() => {
  const q = query(
    collection(db, "DentalServices"),
    where("department", "==", "Dental"),
    where("enabled", "==", true),
    where("isDeleted", "==", false)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const fromDb: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category as string;
      const name = data.name as string;

      if (!fromDb[category]) fromDb[category] = [];
      fromDb[category].push(name);
    });

    // Merge with defaults (from config)
    const merged: Record<string, string[]> = { ...DEFAULT_DENTAL_SERVICES };

    Object.entries(fromDb).forEach(([category, services]) => {
      if (!merged[category]) merged[category] = [];
      services.forEach((svc) => {
        if (!merged[category].includes(svc)) {
          merged[category].push(svc);
        }
      });
    });

    // Sort categories and services
    const sorted = Object.keys(merged)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = merged[key].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);

    setDentalServicesMerged(sorted);
  }, (error) => {
    console.error("Error loading dental services:", error);
    // Fallback to defaults only
    const fallback = Object.keys(DEFAULT_DENTAL_SERVICES)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = [...DEFAULT_DENTAL_SERVICES[key]].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);
    setDentalServicesMerged(fallback);
  });

  return () => unsub();
}, []);



const [medicalServicesMerged, setMedicalServicesMerged] = useState<Record<string, string[]>>({});

useEffect(() => {
  const q = query(
    collection(db, "MedicalServices"),
    where("department", "==", "Medical"),
    where("enabled", "==", true),
    where("isDeleted", "==", false)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const fromDb: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category as string;
      const name = data.name as string;

      if (!fromDb[category]) fromDb[category] = [];
      fromDb[category].push(name);
    });

    // Merge with defaults (from your DEFAULT_MEDICAL_SERVICES)
    const merged: Record<string, string[]> = { ...DEFAULT_MEDICAL_SERVICES };

    Object.entries(fromDb).forEach(([category, services]) => {
      if (!merged[category]) merged[category] = [];
      services.forEach((svc) => {
        if (!merged[category].includes(svc)) {
          merged[category].push(svc);
        }
      });
    });

    // Sort categories and services
    const sorted = Object.keys(merged)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = merged[key].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);

    setMedicalServicesMerged(sorted);
  }, (error) => {
    console.error("Error loading medical services:", error);
    // Fallback to defaults
    const fallback = Object.keys(DEFAULT_MEDICAL_SERVICES)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = [...DEFAULT_MEDICAL_SERVICES[key]].sort((a, b) => a.localeCompare(b));
        return acc;
      }, {} as Record<string, string[]>);
    setMedicalServicesMerged(fallback);
  });

  return () => unsub();
}, []);


const renderDepartmentServices = (
  dept: string,
  servicesMap: Record<string, string[]>,
  hasPregnancySection: boolean = false
) => {
  const appointment = appointments.find(a => a.department === dept);
  const editedData = editedAppointments[dept] || {
    services: [],
    otherService: "",
    lastMenstrualPeriod: "",
    isPregnant: "No",
    clearance: false,
    shield: false,
    pregnancyTestResult: "Negative"
  };
  const isScheduleDisabled = editedData.services.length === 0;

  return (
    // ← GIKUHA ANG <table> UG GIBUTANG TANAN SA <div> PARA MO-GROW SIYA
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "9.5pt", borderCollapse: "collapse", height: "100%" }}>
          <tbody style={{ display: "block", height: "100%" }}>
            {/* SERVICES */}
            {Object.entries(servicesMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, services]) => (
                <React.Fragment key={category}>
                  <tr>
                    <td colSpan={2} style={{
                      background: "#e6e6e6",
                      fontWeight: "bold",
                      padding: "7px 6px",
                      textAlign: "center",
                      fontSize: "10pt"
                    }}>
                      {category}
                    </td>
                  </tr>
                  {services.map(service => {
                    const isOthers = service === "Others";
                    const isChecked = editedData.services.includes(service);

                    if (isOthers) {
                      return (
                        <tr key="Others">
                          <td colSpan={2} style={{ padding: "8px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="text"
                                value={editedData.otherService || ""}
                                onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                                placeholder="Specify other service..."
                                style={{ flex: 1, padding: "6px", border: "1px solid #333", borderRadius: "4px" }}
                                disabled={!isChecked}
                              />
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleService(dept, "Others")}
                                style={{ transform: "scale(1.2)" }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={service}>
                        <td style={{ padding: "4px 8px", width: "100%" }}>{service}</td>
                        <td style={{ width: "50px", textAlign: "center" }}>
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

            {/* Pregnancy Section */}
            {hasPregnancySection && (
          <>
            <tr>
              <td colSpan={2} style={{ background: "#f0f0f0", padding: "10px 6px", fontWeight: "bold", fontSize: "10pt" }}>
                Complaint / History (For Female Patients only, ages 10 to 55)
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>Last Menstrual Period:</td>
              <td>
                <input
                  type="date"
                  value={editedData.lastMenstrualPeriod || ""}
                  onChange={(e) => handleFieldChange(dept, "lastMenstrualPeriod", e.target.value)}
                  style={{ width: "100%" }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>Are you Pregnant?</td>
              <td style={{ fontSize: "9.5pt" }}>
                <label><input type="radio" checked={editedData.isPregnant === "Yes"} onChange={() => handleFieldChange(dept, "isPregnant", "Yes")} /> Yes</label><br/>
                <label><input type="radio" checked={editedData.isPregnant === "No"} onChange={() => handleFieldChange(dept, "isPregnant", "No")} /> No</label><br/>
                <label><input type="radio" checked={editedData.isPregnant === "Not sure/Delayed"} onChange={() => handleFieldChange(dept, "isPregnant", "Not sure/Delayed")} /> Not sure/Delayed</label>
                {editedData.isPregnant === "Yes" && (
                  <div style={{ marginTop: "6px" }}>
                    <label><input type="checkbox" checked={editedData.clearance} onChange={e => handleFieldChange(dept, "clearance", e.target.checked)} /> With clearance</label><br/>
                    <label><input type="checkbox" checked={editedData.shield} onChange={e => handleFieldChange(dept, "shield", e.target.checked)} /> With abdominal lead shield</label>
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>Pregnancy Test Result:</td>
              <td>
                <label><input type="radio" checked={editedData.pregnancyTestResult === "Positive"} onChange={() => handleFieldChange(dept, "pregnancyTestResult", "Positive")} /> Positive</label>&nbsp;&nbsp;
                <label><input type="radio" checked={editedData.pregnancyTestResult === "Negative"} onChange={() => handleFieldChange(dept, "pregnancyTestResult", "Negative")} /> Negative</label>
              </td>
            </tr>
          </>
        )}
              
                
           
          </tbody>
        </table>
      </div>

      {/* SCHEDULE ROW — SEPARATE PARA STICK SA UBOS */}
      <div style={{
        padding: "12px 8px",
        background: "#f9f9f9",
        borderTop: "1px solid #ddd",
        fontWeight: "bold",
        marginTop: "auto"   // ← KINI ANG MAGIC: pushes this to bottom
      }}>
        Date: <strong>{appointment?.date || "Not scheduled"}</strong> &nbsp;&nbsp;
        Time: <strong>{appointment?.slotTime || "Not scheduled"}</strong>
        <button
          type="button"
          className="change-btns"
          style={{ float: "right", fontSize: "11pt" }}
          onClick={() => handleChangeDateTime(dept, appointment)}
          disabled={isScheduleDisabled}
        >
          {appointment ? "Change Schedule" : "Schedule Now"}
        </button>
      </div>
    </div>
  );
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
            <h5>OUTPATIENT REQUEST FORM</h5>
          </div>
          <div className="header-right">
            <p>Document No.: TRC-AOD-FM-07</p>
            <p>Effective Date: 22 August 2025</p>
            <p>Revision No.: 3</p>
            <p>Page No.: Page 1 of 1</p>
          </div>
        </div>

        {error && <div className="error-message text-red-500 mb-4">{error}</div>}

        <form className="all-services-form">
        


{/* PATIENT INFORMATION – EXACT SAME SA PICTURE, HUGOT, NO EXTRA SPACE */}
<div style={{ marginBottom: "16px", fontSize: "10pt" }}>
  <h3 style={{
    fontSize: "13pt",
    fontWeight: "bold",
    color: "#003087",
    borderBottom: "3px solid #003087",
    paddingBottom: "6px",
    margin: "0 0 10px 0"
  }}>
    Patient Information
  </h3>

{/* EXACT NA GYUD: Date, Time, Control No — usa ra ka linya + underline sa ubos */}
<div style={{ marginBottom: "14px", fontSize: "10.5pt" }}>
  <div style={{ 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "baseline",
    flexWrap: "nowrap",
    gap: "20px"
  }}>
    {/* Date of Request - Left */}
    <div style={{ flex: "1", minWidth: "180px" }}>
      <strong>Date of Request:</strong>{' '}
      <span style={{ fontWeight: "bold" }}>
        {safeFormData.requestDate 
          ? new Date(safeFormData.requestDate).toLocaleDateString('en-PH') 
          : "____/____/____"
        }
      </span>
    </div>

    {/* Time of Request - Center */}
    <div style={{ flex: "1", textAlign: "center", minWidth: "140px" }}>
      <strong>Time of Request:</strong>{' '}
      <span style={{ fontWeight: "bold" }}>
        {safeFormData.requestTime ? safeFormData.requestTime : "__:__ __"}
      </span>
    </div>

    {/* Control No - Right (red & bold) */}
    <div style={{ flex: "1", textAlign: "right", minWidth: "180px" }}>
      <strong>Control No:</strong>{' '}
      <span style={{ 
        color: "#c62828", 
        fontWeight: "bold", 
        fontSize: "11.5pt",
        letterSpacing: "0.8px"
      }}>
        {safeFormData.controlNo || "__________"}
      </span>
    </div>
  </div>

  {/* Full underline sa ilawom */}
  <div style={{ 
    borderBottom: "1px solid #000", 
    marginTop: "4px"
  }}></div>
</div>

  {/* ROW 2: Name, Age, Birthdate */}
  <div style={{ display: "flex", alignItems: "end", gap: "12px", fontSize: "10pt", lineHeight: "1.2" }}>
  {/* NAME - Gipamubo ug gi-compact */}
  <div style={{ flex: 1, minWidth: "0" }}>
    <strong style={{ fontSize: "9pt" }}>Name:</strong>
    <div style={{ display: "flex", gap: "8px", marginTop: "3px" }}>
      <div style={{ flex: "1.2" }}>
        <div style={{ fontWeight: "bold", fontSize: "11pt" }}>
          {safeFormData.lastName?.toUpperCase() || "__________________"}
        </div>
        <div style={{ borderBottom: "1px solid #000", marginTop: "1px" }}></div>
        <small style={{ fontSize: "7pt", color: "#666" }}>Last Name</small>
      </div>
      <div style={{ flex: "1" }}>
        <div style={{ fontWeight: "bold", fontSize: "11pt" }}>
          {safeFormData.firstName?.toUpperCase() || "________________"}
        </div>
        <div style={{ borderBottom: "1px solid #000", marginTop: "1px" }}></div>
        <small style={{ fontSize: "7pt", color: "#666" }}>First Name</small>
      </div>
      <div style={{ width: "28px" }}>
        <div style={{ fontWeight: "bold", fontSize: "11pt" }}>
          {safeFormData.middleInitial?.toUpperCase() || "__"}
        </div>
        <div style={{ borderBottom: "1px solid #000", marginTop: "1px" }}></div>
        <small style={{ fontSize: "7pt", color: "#666" }}>M.I.</small>
      </div>
    </div>
  </div>

  {/* AGE - Nipis ra kay gamay ra siya */}
  <div style={{ textAlign: "center", minWidth: "45px" }}>
    <strong style={{ fontSize: "9pt" }}>Age:</strong>
    <div style={{ 
      borderBottom: "1px solid #000", 
      width: "36px", 
      margin: "2px auto 0" 
    }}>
      <strong style={{ fontSize: "11pt" }}>{safeFormData.age || "__"}</strong>
    </div>
  </div>

  {/* BIRTHDATE - Gipamubo ang underline */}
  <div style={{ textAlign: "center", minWidth: "100px" }}>
    <strong style={{ fontSize: "9pt" }}>Birthdate:</strong>
    <div style={{ 
      borderBottom: "1px solid #000", 
      width: "92px", 
      margin: "2px auto 0" 
    }}>
      <span style={{ fontSize: "10pt", letterSpacing: "1px" }}>
        {safeFormData.birthdate 
          ? new Date(safeFormData.birthdate).toLocaleDateString('en-PH')
          : "__ / __ / ____"}
      </span>
    </div>
  </div>
</div>



  {/* ROW 3: Gender – NINDOT NA TAN-AWON, AUTOMATIC CHECKED */}
<div style={{ marginBottom: "12px" }}>
  <strong>Gender:</strong>
  <div style={{ 
    display: "flex", 
    gap: "28px", 
    marginTop: "8px", 
    fontSize: "10pt",
    flexWrap: "wrap",
    alignItems: "center"
  }}>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: safeFormData.gender === "Feminine" ? "bold" : "normal", color: safeFormData.gender === "Feminine" ? "#003087" : "#000" }}>
      <span style={{
        width: "14px",
        height: "14px",
        border: "2px solid #000",
        display: "inline-block",
        background: safeFormData.gender === "Female" ? "#003087" : "white",
        position: "relative"
      }}>
        {safeFormData.gender === "Female" && (
          <span style={{
            position: "absolute",
            top: "1px",
            left: "3px",
            width: "6px",
            height: "6px",
            background: "white",
            borderRadius: "1px",
            transform: "rotate(45deg)"
          }}></span>
        )}
      </span>
      Feminine
    </label>

    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: safeFormData.gender === "Masculine" ? "bold" : "normal", color: safeFormData.gender === "Masculine" ? "#003087" : "#000" }}>
      <span style={{
        width: "14px",
        height: "14px",
        border: "2px solid #000",
        display: "inline-block",
        background: safeFormData.gender === "Male" ? "#003087" : "white",
        position: "relative"
      }}>
        {safeFormData.gender === "Male" && (
          <span style={{
            position: "absolute",
            top: "1px",
            left: "3px",
            width: "6px",
            height: "6px",
            background: "white",
            borderRadius: "1px",
            transform: "rotate(45deg)"
          }}></span>
        )}
      </span>
      Masculine
    </label>

    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: safeFormData.gender === "LGBTQ+" ? "bold" : "normal", color: safeFormData.gender === "LGBTQ+" ? "#003087" : "#000" }}>
      <span style={{
        width: "14px",
        height: "14px",
        border: "2px solid #000",
        display: "inline-block",
        background: safeFormData.gender === "LGBTQ+" ? "#003087" : "white",
        position: "relative"
      }}>
        {safeFormData.gender === "LGBTQ+" && (
          <span style={{
            position: "absolute",
            top: "1px",
            left: "3px",
            width: "6px",
            height: "6px",
            background: "white",
            borderRadius: "1px",
            transform: "rotate(45deg)"
          }}></span>
        )}
      </span>
      LGBTQ+
      {safeFormData.gender === "LGBTQ+" && safeFormData.genderSpecify && (
        <span style={{ marginLeft: "6px", color: "#c62828", fontWeight: "bold", fontSize: "9.5pt" }}>
          ({safeFormData.genderSpecify})
        </span>
      )}
    </label>

    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: safeFormData.gender === "Prefer not to answer" ? "bold" : "normal", color: safeFormData.gender === "Prefer not to answer" ? "#003087" : "#000" }}>
      <span style={{
        width: "14px",
        height: "14px",
        border: "2px solid #000",
        display: "inline-block",
        background: safeFormData.gender === "Prefer not to answer" ? "#003087" : "white",
        position: "relative"
      }}>
        {safeFormData.gender === "Prefer not to answer" && (
          <span style={{
            position: "absolute",
            top: "1px",
            left: "3px",
            width: "6px",
            height: "6px",
            background: "white",
            borderRadius: "1px",
            transform: "rotate(45deg)"
          }}></span>
        )}
      </span>
      Prefer not to answer
    </label>
  </div>
</div>

  {/* ROW 4: Address */}
  <div style={{ marginBottom: "8px" }}>
    <strong>Address:</strong>
    <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: "bold" }}>{safeFormData.houseNo || ""} {safeFormData.street || "______________________________"}</span>
        <div style={{ borderBottom: "1px solid #000", marginTop: "2px" }}></div>
        <small style={{ color: "#666", fontSize: "8pt" }}>House No. & Street</small>
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: "bold" }}>{safeFormData.barangay || "______________________________"}</span>
        <div style={{ borderBottom: "1px solid #000", marginTop: "2px" }}></div>
        <small style={{ color: "#666", fontSize: "8pt" }}>Barangay</small>
      </div>
    </div>
    <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: "bold" }}>{safeFormData.municipality || "______________________________"}</span>
        <div style={{ borderBottom: "1px solid #000", marginTop: "2px" }}></div>
        <small style={{ color: "#666", fontSize: "8pt" }}>Municipality/City</small>
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: "bold" }}>{safeFormData.province || "______________________________"}</span>
        <div style={{ borderBottom: "1px solid #000", marginTop: "2px" }}></div>
        <small style={{ color: "#666", fontSize: "8pt" }}>Province</small>
      </div>
    </div>
  </div>

  {/* ROW 5: Contact Number */}
  <div style={{ display: "flex", gap: "20px", alignItems: "end" }}>
    <div>
      <strong>Contact Number:</strong>
      <div style={{ borderBottom: "1px solid #000", marginTop: "4px", width: "200px", display: "inline-block" }}>
        {" "}<strong style={{ color: "#1565c0" }}>{safeFormData.contact || "__________________"}</strong>
      </div>
    </div>
    <div style={{ marginLeft: "auto" }}>
      <strong>Email:</strong> <span style={{ color: "#c62828" }}>{safeFormData.email || "______________________________"}</span>
    </div>
  </div>
</div>


<div className="services-wrapper">
  {/* Responsive Grid: 2 columns → 1 column on mobile */}
  <div className="services-grid">
    {/* LEFT COLUMN */}
    <div className="services-column">
      <div className="service-box">
        <h4 className="service-header">Clinical Laboratory Services</h4>
        {renderDepartmentServices("Clinical Laboratory", clinicalServicesMerged)}
      </div>

      <div className="service-box">
        <h4 className="service-header">Dental Services</h4>
        {renderDepartmentServices("Dental", dentalServicesMerged)}
      </div>
    </div>

    {/* RIGHT COLUMN */}
    <div className="services-column">
      <div className="service-box">
        <h4 className="service-header">Radiographic Services</h4>
        {renderDepartmentServices("Radiographic", radiologyServicesMerged, true)}
      </div>

      <div className="service-box">
        <h4 className="service-header">Medical Services</h4>
        {renderDepartmentServices("Medical", medicalServicesMerged)}
      </div>
    </div>
  </div>
</div>


          <div className="button-containers">
  {/* DOWNLOAD PDF BUTTON */}
  <button
    type="button"
    className="formal-btn download-btn"
    onClick={handleDownloadPDF}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    <span>Download PDF Form</span>
  </button>

  {/* SUBMIT BUTTON */}
 <button
  type="button"
  className={`formal-btn submit-btn ${!isPdfDownloaded ? 'disabled' : ''}`}
  onClick={handleSubmit}
  disabled={!isPdfDownloaded}
  style={{
    opacity: isPdfDownloaded ? 1 : 0.5,
    cursor: isPdfDownloaded ? 'pointer' : 'not-allowed'
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
  <span>
    {isPdfDownloaded ? "Submit Request" : "Download PDF First"}
  </span>
</button>
</div>
        </form>
      </div>


            {/* REVIEW SUBMIT MODAL - SAME RA SA TRANSACTION */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
          </audio>

          <div className="review-modal-overlay" onClick={closeModal}>
            <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="review-modal-header">
                <img src="/logo.png" alt="DOH Logo" className="review-modal-logo" />
                <h3 className="review-modal-title">
                  {modalType === "success" && "SUCCESS"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM SUBMISSION"}
                </h3>
                <button className="review-modal-close" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="review-modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{modalMessage}</p>
              </div>

              <div className="review-modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="review-modal-btn cancel" onClick={closeModal}>
                      No, Go Back
                    </button>
                    <button
                      className="review-modal-btn confirm"
                      onClick={() => {
                        closeModal();
                        onModalConfirm();
                      }}
                    >
                      Yes, Submit
                    </button>
                  </>
                )}
                {(modalType === "success" || modalType === "error") && (
                  <button className="review-modal-btn ok" onClick={closeModal}>
                    {modalType === "success" ? "Done" : "OK"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ReviewPage;