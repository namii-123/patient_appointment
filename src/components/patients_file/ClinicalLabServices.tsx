import React, { useState } from "react";
import "../../assets/RadiographicServices.css";
import { db } from "./firebase";
import { collection, addDoc, getDoc, setDoc, updateDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface ClinicalLabServicesProps {
  onNavigate?: (targetView: "calendarlab" | "dental" | "radioservices", data?: any) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

const ClinicalLabServices: React.FC<ClinicalLabServicesProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Services grouped by category
  const servicesByCategory: { [key: string]: string[] } = {
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
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
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
      onNavigate?.("dental", { ...formData });
      return;
    }

    // Confirm before proceeding if there are selected services
    const proceedWithServices = window.confirm(
      "Are you sure you want to proceed with the selected services?"
    );
    if (!proceedWithServices) return;

    // Generate displayId
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const prefix = "APT";

    // Counter for displayId
    const counterSnap = await getDoc(doc(db, "Counters", dateStr));
    let count = 1;
    if (counterSnap.exists()) {
      count = counterSnap.data().count + 1;
      await updateDoc(doc(db, "Counters", dateStr), { count });
    } else {
      await setDoc(doc(db, "Counters", dateStr), { count: 1 });
    }

    const padded = String(count).padStart(3, "0");
    const displayId = `${prefix}-${dateStr}-${padded}`;

    const auth = getAuth();
        const currentUser = auth.currentUser;
        const uid = currentUser?.uid || "";
    
    
        const appointmentData = {
          patientId: patientId || formData?.patientId || "",
          controlNo: controlNo || formData?.controlNo || "",
          services: selectedServices,
          createdAt: new Date().toISOString(),
          displayId,
          dateStr,
          department: "Clinical Laboratory",
          uid, // <-- important: link to current user
        };
    const docRef = await addDoc(collection(db, "Appointments"), appointmentData);
    await updateDoc(docRef, { appointmentId: docRef.id });

    setError(null);
    onNavigate?.("calendarlab", {
      ...formData,
      appointmentData,
      appointmentId: docRef.id,
      department: "Clinical Laboratory",
    });
  } catch (err) {
    console.error("Error saving lab appointment:", err);
    setError("Failed to save appointment. Please try again.");
  }
};



  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Clinical Laboratory Services</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form className="services-list space-y-6">
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <div key={category} className="category">
            <h3 className="font-semibold text-lg mb-2">{category}</h3>
            <div className="space-y-1 pl-4">
              {services.map((service) => (
                <label key={service} className="block">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={() => toggleService(service)}
                    className="mr-2"
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>
        ))}
      </form>

         <div className="labservices-navigation flex justify-between mt-6">
      

        <button
          className="nav-button bg-blue-500 text-white px-4 py-2 rounded"
          type="button"
          onClick={handleNext}
        >
          {selectedServices.length > 0 ? "Show Slots ➡" : "Next ➡"}
        </button>
      </div>
    </div>
  );
};

export default ClinicalLabServices;
