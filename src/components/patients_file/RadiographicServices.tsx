import React, { useState, useEffect } from "react";
import "../../assets/RadiographicServices.css";
import { doc, updateDoc, collection, addDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

interface RadiographicServicesProps {
  onNavigate?: (
    targetView: "calendar" | "confirm" | "allservices" | "labservices",
    data?: any
  ) => void;
  patientId?: string; // Add patientId prop
  controlNo?: string; // Add controlNo prop
  formData?: any; // Add formData to carry over from AllServices
}


const RadiographicServices: React.FC<RadiographicServicesProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState<string>("");
  const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState<string>("");
  const [isPregnant, setIsPregnant] = useState<"Yes" | "No" | "Not sure/Delayed">("No");
  const [pregnancyTestResult, setPregnancyTestResult] = useState<"Positive" | "Negative">("Negative");
  const [clearance, setClearance] = useState(false);
  const [shield, setShield] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
      );
    }
  };



useEffect(() => {
  if (patientId) {
    const fetchPatient = async () => {
      const docRef = doc(db, "Patients", patientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        console.log("📌 Patient from Firestore:", snap.data());
      }
    };
    fetchPatient();
  }

  if (formData) {
    console.log("📌 FormData from AllServices:", formData);
  }
}, [patientId, formData]);



  useEffect(() => {
  const fetchPatient = async () => {
    if (!patientId) return;
    const docRef = doc(db, "Patients", patientId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log("Fetched patient data:", snap.data());
    } else {
      console.warn("No patient found with ID:", patientId);
    }
  };

  fetchPatient();
}, [patientId]);



  const handleNext = async () => {
  try {
    if (selectedServices.length === 0) {
      // No services selected → confirm before navigating
      const proceed = window.confirm(
        "You haven't selected any services. Are you sure you want to continue?"
      );
      if (!proceed) return;

      setError(null);
      onNavigate?.("labservices", { ...formData });
      return;
    }

    if (selectedServices.includes("Others") && !otherService.trim()) {
      setError("Please specify the 'Others' service.");
      return;
    }

    // Confirm before proceeding even if services are selected
    const proceedWithServices = window.confirm(
      "Are you sure you want to proceed with the selected services?"
    );
    if (!proceedWithServices) return;

    const services = selectedServices.includes("Others")
      ? [...selectedServices.filter((s) => s !== "Others"), `Others: ${otherService}`]
      : selectedServices;

    // Generate displayId
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const prefix = "APT";

    // Count existing appointments today
    const snapshot = await getDoc(doc(db, "Counters", dateStr));
    let count = 1;
    if (snapshot.exists()) {
      count = snapshot.data().count + 1;
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
      services,
      isPregnant,
      clearance,
      shield,
      pregnancyTestResult,
      lastMenstrualPeriod: lastMenstrualPeriod || "",
      createdAt: new Date().toISOString(),
      displayId,
      dateStr,
      uid,
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, "Appointments"), appointmentData);
    await updateDoc(docRef, { appointmentId: docRef.id });

    console.log("✅ Appointment saved:", { appointmentId: docRef.id, displayId });

    setError(null);
    onNavigate?.("calendar", { ...formData, appointmentData, appointmentId: docRef.id });
  } catch (err) {
    console.error("Error saving appointment:", err);
    setError("Failed to save appointment. Please try again.");
  }
};



  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Radiographic Services</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="services-list space-y-6">
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <div key={category} className="category">
            <h3 className="font-semibold text-lg mb-2">{category}</h3>
            <div className="space-y-1 pl-4">
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
            </div>
          </div>
        ))}

        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold text-lg mb-3">
            Complaint/History <span className="text-sm font-normal">(For Female Patients only, ages 10 to 55)</span>
          </h3>

          <div className="mb-3">
            <label className="block font-medium mb-1">Date of Last Menstrual Period:</label>
           <input
  type="date"
  value={lastMenstrualPeriod}
  onChange={(e) => setLastMenstrualPeriod(e.target.value)}
  className="border p-2 w-60 rounded"
/>

          </div>

          <div className="mb-4">
  <h4 className="font-medium mb-2">Are you Pregnant?</h4>
  <div className="space-y-2 ml-4">
    {/* Yes option */}
    <label className="block">
      <input
        type="radio"
        value="Yes"
        checked={isPregnant === "Yes"}
        onChange={() => setIsPregnant("Yes")}
        className="mr-2"
      />
      Yes
    </label>

    {/* Show sub-options only if Yes is selected */}
   {isPregnant === "Yes" && (
  <div className="ml-8 text-sm text-gray-700 space-y-1">
    <label className="block">
      <input
        type="checkbox"
        className="mr-2"
        checked={clearance}
        onChange={(e) => setClearance(e.target.checked)}
      />
      With clearance of the attending doctor
    </label>
    <label className="block">
      <input
        type="checkbox"
        className="mr-2"
        checked={shield}
        onChange={(e) => setShield(e.target.checked)}
      />
      With abdominal lead shield
    </label>
  </div>
)}

    {/* No option */}
    <label className="block">
      <input
        type="radio"
        value="No"
        checked={isPregnant === "No"}
        onChange={() => setIsPregnant("No")}
        className="mr-2"
      />
      No
    </label>

    {/* Not sure option */}
    <label className="block">
      <input
        type="radio"
        value="Not sure/Delayed"
        checked={isPregnant === "Not sure/Delayed"}
        onChange={() => setIsPregnant("Not sure/Delayed")}
        className="mr-2"
      />
      Not sure/Delayed
    </label>
  </div>
</div>


          <div>
            <h4 className="font-medium mb-2">Pregnancy Test Result:</h4>
            <div className="ml-4 flex space-x-6">
              <label>
                <input
                  type="radio"
                  value="Positive"
                  checked={pregnancyTestResult === "Positive"}
                  onChange={() => setPregnancyTestResult("Positive")}
                  className="mr-2"
                />
                Positive
              </label>
              <label>
                <input
                  type="radio"
                  value="Negative"
                  checked={pregnancyTestResult === "Negative"}
                  onChange={() => setPregnancyTestResult("Negative")}
                  className="mr-2"
                />
                Negative
              </label>
            </div>
          </div>
        </div>
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

export default RadiographicServices;