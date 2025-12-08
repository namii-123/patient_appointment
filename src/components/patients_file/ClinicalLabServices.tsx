import React, { useState, useEffect } from "react";
import "../../assets/RadiographicServices.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";


interface ClinicalLabServicesProps {
  onNavigate?: (
    targetView: "calendarlab" | "dental" | "radioservices",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

interface ServiceDoc {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  isDeleted: boolean;
}

const ClinicalLabServices: React.FC<ClinicalLabServicesProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  // ── FETCH & REAL-TIME LISTEN FROM ClinicalServices (Admin) ─────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "ClinicalServices"),
      where("department", "==", "Clinical Laboratory"),
      where("enabled", "==", true),
      where("isDeleted", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const map: Record<string, string[]> = {};

      snapshot.forEach((doc) => {
        const data = doc.data() as ServiceDoc;
        const cat = data.category || "Uncategorized";
        if (!map[cat]) map[cat] = [];
        map[cat].push(data.name);
      });

      // Sort categories & services alphabetically
      const sorted: Record<string, string[]> = {};
      Object.keys(map)
        .sort()
        .forEach((key) => {
          sorted[key] = map[key].sort();
        });

      setServicesByCategory(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ── MODAL HELPERS ─────────────────────────────────────
  const openModal = (
    msg: string,
    type: "confirm" | "error" | "success",
    callback?: () => void
  ) => {
    setModalMessage(msg);
    setModalType(type);
    if (callback) setOnConfirm(() => callback);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setOnConfirm(() => {});
  };

  // ── TOGGLE SERVICE ─────────────────────────────────────
  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  // ── HANDLE NEXT → SAVE APPOINTMENT ─────────────────────
  const handleNext = async () => {
    try {
      if (selectedServices.length === 0) {
        openModal(
          "You haven't selected any lab services.\n\nDo you want to skip and proceed?",
          "confirm",
          () => onNavigate?.("dental", { ...formData })
        );
        return;
      }

      openModal(
        "Clinical Laboratory services confirmed!\n\nYou will now be directed to select your preferred appointment date and time slot.",
        "confirm",
        async () => {
          // Generate displayId (same logic as Radiology)
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const prefix = "APT";

          const counterRef = doc(db, "Counters", dateStr);
          const counterSnap = await getDoc(counterRef);
          let count = 1;

          if (counterSnap.exists()) {
            count = counterSnap.data()?.count + 1 || 1;
            await updateDoc(counterRef, { count });
          } else {
            await setDoc(counterRef, { count: 1 });
          }

          const padded = String(count).padStart(3, "0");
          const displayId = `${prefix}-${dateStr}-${padded}`;

          const auth = getAuth();
          const uid = auth.currentUser?.uid || "";

          const appointmentData = {
            patientId: patientId || formData?.patientId || "",
            controlNo: controlNo || formData?.controlNo || "",
            services: selectedServices,
            createdAt: new Date().toISOString(),
            displayId,
            dateStr,
            department: "Clinical Laboratory",
            uid,
          };

          const docRef = await addDoc(collection(db, "Appointments"), appointmentData);
          await updateDoc(docRef, { appointmentId: docRef.id });

          openModal(
            `Lab appointment created successfully!\n\nAppointment ID: ${displayId}`,
            "success"
          );

          setTimeout(() => {
            closeModal();
            onNavigate?.("calendarlab", {
              ...formData,
              appointmentData,
              appointmentId: docRef.id,
              displayId,
              department: "Clinical Laboratory",
            });
          }, 2000);
        }
      );
    } catch (err: any) {
      console.error("Error creating lab appointment:", err);
      openModal("Failed to create appointment. Please try again.", "error");
    }
  };

  // ── RENDER ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="labservices-container p-6 text-center">
        <p>Loading Clinical Laboratory services...</p>
      </div>
    );
  }

  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Clinical Laboratory Services
      </h2>

      <form className="services-list">
        <div className="services-grid">
          {Object.entries(servicesByCategory).map(([category, services]) => (
            <div key={category} className="category">
              <h3 className="font-bold text-blue-600 mb-3">{category}</h3>
              <div className="space-y-2">
                {services.map((service) => (
                  <label
                    key={service}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-blue-50 p-2 rounded transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service)}
                      onChange={() => toggleService(service)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-800">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </form>

      <div className="labservices-navigation mt-8 text-center">
        <button
          className="nav-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
          type="button"
          onClick={handleNext}
        >
          {selectedServices.length > 0 ? "Show Slots ➡" : "Next ➡"}
        </button>
      </div>

      {/* MODAL - Same as Radiology */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
          </audio>

          <div className="modal-overlay-service" onClick={closeModal}>
            <div
              className="modal-content-service"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-service">
                <img src="/logo.png" alt="Logo" className="modal-logo" />
                <h5>
                  {modalType === "success" && "SUCCESS"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM ACTION"}
                </h5>
              </div>

              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>
                  {modalMessage}
                </p>
              </div>

              <div className="modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="modal-btn cancel" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      className="modal-btn confirm"
                      onClick={() => {
                        closeModal();
                        onConfirm();
                      }}
                    >
                      Confirm
                    </button>
                  </>
                )}
                {(modalType === "error" || modalType === "success") && (
                  <button
                    className="modal-btn ok"
                    onClick={closeModal}
                  >
                    {modalType === "success" ? "Continue" : "OK"}
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

export default ClinicalLabServices;