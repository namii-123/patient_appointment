import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDocs, collection, updateDoc, setDoc, getDoc, runTransaction, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
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
  const element = document.querySelector(".all-services-container") as HTMLElement;
  if (!element) {
    openModal("Page content not found.", "error");
    return;
  }

  try {
    const clone = element.cloneNode(true) as HTMLElement;

    // REMOVE ALL BUTTONS
    clone.querySelectorAll('button, .button-containers, .change-btns').forEach(el => el.remove());

    // ADD CERTIFICATION PAGE
 const certDiv = document.createElement("div");
certDiv.innerHTML = `
  <div style="
    page-break-before: always;
    height: 330mm;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    font-family: Arial, sans-serif;
    padding-top: 100mm;
    text-align: center;
  ">
    <!-- Certification Text -->
    <p style="
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 60px 0;
      max-width: 700px;
      line-height: 1.5;
    ">
      I hereby certify that the above information is true and correct.
    </p>

    <!-- Signature over Printed Name - CORRECT ORDER -->
    <!-- Signature over Printed Name - FINAL LAYOUT -->
<div style="margin: 40px 0; text-align: center;">
  <!-- PATIENT NAME (CAPSLOCK) -->
  <p style="
    margin: 0 0 8px 0;
    font-size: 11pt;
    font-weight: bold;
  ">
    ${(() => {
      const fullName = `${safeFormData.lastName}, ${safeFormData.firstName}${safeFormData.middleInitial ? ' ' + safeFormData.middleInitial + '.' : ''}`;
      return fullName.toUpperCase() || "________________________";
    })()}
  </p>

  <!-- SIGNATURE LINE -->
  <div style="
    border-bottom: 2px solid #000;
    width: 400px;
    margin: 0 auto 8px auto;
  "></div>

  <!-- LABEL BELOW LINE -->
  <p style="
    margin: 0;
    font-size: 10pt;
    font-style: italic;
    color: #333;
  ">
    Signature over Printed Name
  </p>
</div>

    <!-- Date -->
    <p style="
      font-size: 14pt;
      margin: 50px 0 0 0;
    ">
      Date: <strong>${new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</strong>
    </p>
  </div>
`;
clone.appendChild(certDiv);

    // INJECT PRINT STYLES — EXACT SAME SIZES, BUT ALLOW PAGE BREAKS
    const printStyle = document.createElement("style");
    printStyle.innerHTML = `
      * { box-sizing: border-box !important; }
      body, html { margin: 0; padding: 0; }
      
      .all-services-container {
        width: 215.9mm !important;
        min-height: 330.2mm !important;
        padding: 10mm 12mm !important;
        font-family: Arial, sans-serif !important;
        font-size: 10pt !important;
        background: white !important;
        line-height: 1.3 !important;
      }

      /* PATIENT INFO - TIGHTER LAYOUT */
      .field-group, .house-street-group, .field-groups {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }
      .field-group > div, .house-street-group > div, .field-groups > div {
        flex: 1 1 calc(33.333% - 8px) !important;
        min-width: 120px !important;
      }

      /* INPUT FIELDS - EXACT SAME */
      input[type="text"], input[type="date"], input[type="time"], input[type="number"], input[type="email"], input[type="tel"] {
        width: 100% !important;
        padding: 6px 8px !important;
        border: 1px solid #000 !important;
        background: white !important;
        font-size: 10pt !important;
        min-height: 40px !important;
      }

      /* SERVICES - 2 COLUMNS, TIGHTER */
      .services-container {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        margin-top: 12px !important;
      }

      /* TABLE - COMPACT (EXACT SAME) */
      table { 
        width: 100% !important; 
        table-layout: fixed !important; 
        border-collapse: collapse !important;
        font-size: 9pt !important;
      }
      td { 
        padding: 4px 6px !important; 
        vertical-align: top !important;
        word-wrap: break-word !important;
      }
      .category-row td {
        font-weight: bold !important;
        background: #f0f0f0 !important;
        font-size: 9.5pt !important;
      }

      /* CHECKBOX & RADIO */
      input[type="checkbox"], input[type="radio"] {
        transform: scale(1) !important;
      }

      /* HEADER */
      .form-header {
        display: grid !important;
        grid-template-columns: 70px 1fr 160px !important;
        gap: 8px !important;
        margin-bottom: 12px !important;
      }
      .header-center { font-size: 9pt !important; }
      .header-right { font-size: 8pt !important; }

      /* PAGE BREAK CONTROL — ALLOW NATURAL BREAKS */
      .service-box, h3, h4 { 
        page-break-inside: avoid !important; 
      }
      h3, h4 { 
        margin: 10px 0 6px !important; 
        font-size: 11pt !important; 
      }

      /* IMPORTANT: ALLOW PAGE BREAKS INSIDE CONTAINER */
      .all-services-container > div {
        page-break-inside: auto !important;
      }

      @page { 
        margin: 0; 
        size: 8.5in 13in; 
      }
    `;
    clone.appendChild(printStyle);

    // TEMP CONTAINER
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "215.9mm";
    container.style.background = "white";
    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 1200)); // bit longer para sure ang rendering

    // CAPTURE WITH HIGH QUALITY
    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: container.scrollWidth,
      height: container.scrollHeight,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
      logging: false,
    });

    document.body.removeChild(container);

    // MULTI-PAGE PDF SETUP
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", [215.9, 330.2]); // long bond
    const pageWidth = 215.9;
    const pageHeight = 330.2;
    const imgHeightPerPage = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeightPerPage;
    let position = 0;

    // First page
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightPerPage);
    heightLeft -= pageHeight;

    // Add new pages if content is taller
    while (heightLeft > 0) {
      position = heightLeft - imgHeightPerPage;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightPerPage);
      heightLeft -= pageHeight;
    }

    // Filename
    const patientName = `${safeFormData.lastName}_${safeFormData.firstName}`
      .replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `TRC_Outpatient_Request_${patientName}_${dateStr}.pdf`;

    pdf.save(filename);
    openModal("PDF successfully downloaded!", "success");

  } catch (err) {
    console.error("PDF Error:", err);
    openModal("Failed to generate PDF.", "error");
  }
};



   const handleSubmit = async () => {
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

         

          <div className="house-street-group">
             <div>
            <label>Citizenship</label>
            <input type="text" value={safeFormData.citizenship} readOnly />
          </div>
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

           <div className="field-groups">
          <div>
            <label>Email Address</label>
            <input type="email" value={safeFormData.email} readOnly />
          </div>

          <div>
            <label>Mobile/Contact Number</label>
            <input type="tel" value={safeFormData.contact} readOnly />
          </div>
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
      {Object.entries(radiologyServicesMerged)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, services]) => (
          <React.Fragment key={category}>
            <tr className="category-row">
              <td colSpan={2}>{category}</td>
            </tr>
            {services.map((service) => {
              const isOthers = service === "Others";
              const isChecked = editedData.services.includes(service);
              const displayName = isOthers ? "Others (please specify)" : service;

              if (isOthers) {
                return (
                  <tr key="Others">
                    <td colSpan={2}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="text"
                          value={editedData.otherService || ""}
                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                          placeholder="Specify other service here..."
                          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #000" }}
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
                  <td>{displayName}</td>
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
      {Object.entries(clinicalServicesMerged)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, services]) => (
          <React.Fragment key={category}>
            <tr className="category-row">
              <td colSpan={2}>{category}</td>
            </tr>
            {services.map((service) => {
              const isOthers = service === "Others";
              const isChecked = editedData.services.includes(service);
              const displayName = isOthers ? "Others (please specify)" : service;

              if (isOthers) {
                return (
                  <tr key="Others">
                    <td colSpan={2}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="text"
                          value={editedData.otherService || ""}
                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                          placeholder="Specify other service here..."
                          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #000" }}
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
                  <td>{displayName}</td>
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
      {Object.entries(dentalServicesMerged)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, services]) => (
          <React.Fragment key={category}>
            <tr className="category-row">
              <td colSpan={2}>{category}</td>
            </tr>
            {services.map((service) => {
              const isOthers = service === "Others";
              const isChecked = editedData.services.includes(service);
              const displayName = isOthers ? "Others (please specify)" : service;

              if (isOthers) {
                return (
                  <tr key="Others">
                    <td colSpan={2}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="text"
                          value={editedData.otherService || ""}
                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                          placeholder="Specify other dental service..."
                          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #000" }}
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
                  <td>{displayName}</td>
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
      {Object.entries(medicalServicesMerged) // We'll create this state below
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, services]) => (
          <React.Fragment key={category}>
            <tr className="category-row">
              <td colSpan={2}>{category}</td>
            </tr>
            {services.map((service) => {
              const isOthers = service === "Others";
              const isChecked = editedData.services.includes(service);
              const displayName = isOthers ? "Others (please specify)" : service;

              if (isOthers) {
                return (
                  <tr key="Others">
                    <td colSpan={2}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="text"
                          value={editedData.otherService || ""}
                          onChange={(e) => handleOtherServiceChange(dept, e.target.value)}
                          placeholder="Specify other medical service..."
                          style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #000",
                          }}
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
                  <td>{displayName}</td>
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
    className="formal-btn submit-btn"
    onClick={handleSubmit}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <span>Submit Request</span>
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