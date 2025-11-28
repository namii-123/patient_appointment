import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import "../../assets/RadiographicServices.css";
import { DEFAULT_MEDICAL_SERVICES } from "../../config/defaultMedicalServices";// We'll create this

interface MedicalConsultationsProps {
  onNavigate?: (
    targetView: "calendarmedical" | "review",
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
  // ── STATE ─────────────────────────────────────
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  // ── LOAD + REAL-TIME SERVICES FROM FIRESTORE ─────────────────
  useEffect(() => {
    const loadServices = async () => {
      const q = query(
        collection(db, "MedicalServices"),
        where("department", "==", "Medical"),
        where("enabled", "==", true)
      );

      const snap = await getDocs(q);
      const map: Record<string, string[]> = {};

      if (snap.empty) {
        // Seed default services if none exist
        const batch = writeBatch(db);
        Object.entries(DEFAULT_MEDICAL_SERVICES).forEach(([category, services]) => {
          if (!map[category]) map[category] = [];
          services.forEach((name) => {
            map[category].push(name);
            const ref = doc(collection(db, "MedicalServices"));
            batch.set(ref, {
              name,
              category,
              enabled: true,
              department: "Medical",
              createdAt: new Date(),
            });
          });
        });
        await batch.commit();
      } else {
        snap.forEach((d) => {
          const data = d.data();
          if (!map[data.category]) map[data.category] = [];
          map[data.category].push(data.name);
        });
      }

      setServicesByCategory(map);
      setLoading(false);
    };

    loadServices();
  }, []);

  // Real-time listener (for admin add/edit/delete)
  useEffect(() => {
    const q = query(
      collection(db, "MedicalServices"),
      where("department", "==", "Medical"),
      where("enabled", "==", true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const map: Record<string, string[]> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (!map[data.category]) map[data.category] = [];
        map[data.category].push(data.name);
      });
      setServicesByCategory(map);
    });

    return () => unsub();
  }, []);

  // ── MODAL HELPERS ─────────────────────────────────
  const openModal = (msg: string, type: "confirm" | "error" | "success", cb?: () => void) => {
    setModalMessage(msg);
    setModalType(type);
    if (cb) setOnConfirm(() => cb);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setOnConfirm(() => {});
  };

  // ── TOGGLE SERVICE ───────────────────────────────
  const toggleService = (svc: string) => {
    if (svc === "Others") {
      if (selectedServices.includes("Others")) {
        setSelectedServices((p) => p.filter((s) => s !== "Others"));
        setOtherService("");
      } else {
        setSelectedServices((p) => [...p, "Others"]);
      }
    } else {
      setSelectedServices((p) =>
        p.includes(svc) ? p.filter((s) => s !== svc) : [...p, svc]
      );
    }
  };

  // ── HANDLE NEXT / SAVE APPOINTMENT ─────────────────
  const handleNext = async () => {
    try {
      if (selectedServices.length === 0) {
        openModal(
          "You haven't selected any medical services. Skip and proceed?",
          "confirm",
          () => onNavigate?.("review", { ...formData })
        );
        return;
      }

      if (selectedServices.includes("Others") && !otherService.trim()) {
        openModal("Please specify the service under 'Others'.", "error");
        return;
      }

      const finalServices = selectedServices.includes("Others")
        ? [...selectedServices.filter((s) => s !== "Others"), `Others: ${otherService}`]
        : selectedServices;

      openModal(
        `Selected Medical Services:\n\n${finalServices.join("\n")}\n\nProceed to select appointment date & time?`,
        "confirm",
        async () => {
          // Generate Display ID
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const prefix = "APT";

          const counterRef = doc(db, "Counters", dateStr);
          const counterSnap = await getDoc(counterRef);
          let count = 1;

          if (counterSnap.exists()) {
            count = counterSnap.data()?.count + 1;
            await updateDoc(counterRef, { count });
          } else {
            await setDoc(counterRef, { count: 1 });
          }

          const displayId = `${prefix}-${dateStr}-${String(count).padStart(3, "0")}`;

          // Save Appointment
          const auth = getAuth();
          const uid = auth.currentUser?.uid || "";

          const appointmentData = {
            patientId: patientId || formData?.patientId || "",
            controlNo: controlNo || formData?.controlNo || "",
            services: finalServices,
            createdAt: new Date().toISOString(),
            displayId,
            dateStr,
            department: "Medical",
            uid,
          };

          const docRef = await addDoc(collection(db, "Appointments"), appointmentData);
          await updateDoc(docRef, { appointmentId: docRef.id });

          openModal(`Medical appointment created successfully!\n\nAppointment ID: ${displayId}`, "success");

          setTimeout(() => {
            onNavigate?.("calendarmedical", {
              ...formData,
              appointmentData,
              appointmentId: docRef.id,
              appointmentIds: [...(formData?.appointmentIds || []), docRef.id],
              displayId,
            });
          }, 1800);
        }
      );
    } catch (err: any) {
      console.error("Error creating medical appointment:", err);
      openModal("Failed to save appointment. Please try again.", "error");
    }
  };

  // ── RENDER ─────────────────────────────────────
  if (loading) {
    return <div className="labservices-container p-6">Loading medical services...</div>;
  }

  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Medical Services</h2>

      <form className="services-list">
        <div className="services-grid">
          {Object.entries(servicesByCategory).map(([category, services]) => (
            <div key={category} className="category">
              <h3>{category}</h3>
              {services.map((svc) => (
                <div key={svc}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(svc)}
                      onChange={() => toggleService(svc)}
                    />
                    {svc}
                  </label>

                  {svc === "Others" && selectedServices.includes("Others") && (
                    <input
                      type="text"
                      value={otherService}
                      onChange={(e) => setOtherService(e.target.value)}
                      placeholder="Specify other service..."
                      className="border p-2 mt-1 ml-6 rounded w-64"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </form>

      <div className="labservices-navigation">
        <button
          className="nav-button bg-blue-500 text-white px-6 py-3 rounded font-bold text-lg shadow hover:bg-blue-600 transition"
          onClick={handleNext}
        >
          {selectedServices.length > 0 ? "Show Slots ➡" : "Next ➡"}
        </button>
      </div>

      {/* MODAL - SAME AS RADIOLOGY */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
          </audio>

          <div className="modal-overlay-service" onClick={closeModal}>
            <div className="modal-content-service" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-service">
                <img src="/logo.png" alt="DOH" className="modal-logo" />
                <h3>
                  {modalType === "success" && "SUCCESS"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM ACTION"}
                </h3>
              </div>

              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center", fontWeight: "600" }}>
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
                  <button className="modal-btn ok" onClick={closeModal}>
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

export default MedicalConsultations;