import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import "../../assets/MedicalConsultations.css";
import { getAuth } from "firebase/auth";

interface MedicalConsultationsProps {
  onNavigate?: (
    targetView: "calendar" | "review" | "dental" | "calendarmedical",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

const MedicalConsultations: React.FC<MedicalConsultationsProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const services: string[] = [
    "General Consultation",
    "Pediatric Consultation",
    "Prenatal Consultation",
    "Postnatal Consultation",
    "Family Planning Consultation",
    "Senior Citizen / Geriatric Consultation",
    "Nutrition Counseling",
    "Others",
  ];

  const toggleService = (service: string) => {
    if (service === "Others") {
      if (selectedServices.includes("Others")) {
        setSelectedServices((prev) => prev.filter((s) => s !== "Others"));
        setOtherService("");
      } else {
        setSelectedServices((prev) => [...prev, "Others"]);
      }
    } else {
      setSelectedServices((prev) =>
        prev.includes(service)
          ? prev.filter((s) => s !== service)
          : [...prev, service]
      );
    }
  };

  const handleNext = async () => {
  try {
    // No services selected → confirm before navigating
    if (selectedServices.length === 0) {
      const proceed = window.confirm(
        "You haven't selected any services. Are you sure you want to continue?"
      );
      if (!proceed) return;

      setError(null);
      onNavigate?.("review", { ...formData });
      return;
    }

    // Confirm before proceeding if there are selected services
    const proceedWithServices = window.confirm(
      "Are you sure you want to proceed with the selected services?"
    );
    if (!proceedWithServices) return;

    if (selectedServices.includes("Others") && !otherService.trim()) {
      setError("⚠️ Please specify the 'Others' service.");
      return;
    }

    setError(null);

    const servicesToSave = selectedServices.includes("Others")
      ? [...selectedServices.filter((s) => s !== "Others"), `Others: ${otherService}`]
      : selectedServices;

    // Generate displayId
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const prefix = "APT";

    const counterSnap = await getDoc(doc(db, "Counters", dateStr));
    let count = 1;
    if (counterSnap.exists()) {
      count = counterSnap.data().count + 1;
      await updateDoc(doc(db, "Counters", dateStr), { count });
    } else {
      await setDoc(doc(db, "Counters", dateStr), { count });
    }
    const padded = String(count).padStart(3, "0");
    const displayId = `${prefix}-${dateStr}-${padded}`;

     const auth = getAuth();
        const currentUser = auth.currentUser;
        const uid = currentUser?.uid || "";

    const appointmentData = {
      patientId: patientId || formData?.patientId || "",
      controlNo: controlNo || formData?.controlNo || "",
      services: servicesToSave,
      createdAt: new Date().toISOString(),
      displayId,
      dateStr,
      department: "Medical",
      uid, // <-- important: link to current user
    };

    const docRef = await addDoc(collection(db, "Appointments"), appointmentData);
    await updateDoc(docRef, { appointmentId: docRef.id });

    console.log("✅ Medical appointment saved:", docRef.id);

    onNavigate?.("calendarmedical", {
      ...formData,
      appointmentData,
      appointmentId: docRef.id,
      appointmentIds: [...(formData?.appointmentIds || []), docRef.id],
    });
  } catch (err) {
    console.error("Error saving medical appointment:", err);
    setError("❌ Failed to save appointment. Please try again.");
  }
};


  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Medical Consultations</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="services-list space-y-4 pl-2">
        {services.map((service) => (
          <div key={service}>
            <label className="block">
              <input
                type="checkbox"
                checked={selectedServices.includes(service)}
                onChange={() => toggleService(service)}
                className="mr-2"
              />
              {service}
            </label>

            {service === "Others" && selectedServices.includes("Others") && (
              <input
                type="text"
                value={otherService}
                onChange={(e) => setOtherService(e.target.value)}
                className="border p-2 mt-1 ml-6 rounded w-64"
                placeholder="Please specify"
              />
            )}
          </div>
        ))}
      </form>

      <div className="labservices-navigation flex justify-between mt-6">
        <button
          className={`nav-button px-4 py-2 rounded ${
            selectedServices.length > 0 ? "bg-blue-500 text-white" : "bg-green-500 text-white"
          }`}
          type="button"
          onClick={handleNext}
        >
          {selectedServices.length > 0 ? "Show Slots ➡" : "Next ➡"}
        </button>
      </div>
    </div>
  );
};

export default MedicalConsultations;