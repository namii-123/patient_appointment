import React, { useState, useEffect } from "react";
import { doc, getDoc, addDoc, collection, updateDoc, setDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import { X } from "lucide-react";
import { writeBatch } from "firebase/firestore";
import "../../assets/RadiographicServices.css";
import { DEFAULT_SERVICES } from "../../config/defaultServices";

interface RadiographicServicesProps {
  onNavigate?: (
    targetView: "calendar" | "confirm" | "allservices" | "labservices",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

/* --------------------------------------------------------------
   Types for Firestore documents
   -------------------------------------------------------------- */
interface ServiceDoc {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
}

/* --------------------------------------------------------------
   Component
   -------------------------------------------------------------- */
const RadiographicServices: React.FC<RadiographicServicesProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  // ── UI STATE ─────────────────────────────────────
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState("");
  const [isPregnant, setIsPregnant] = useState<"Yes" | "No" | "Not sure/Delayed">("No");
  const [pregnancyTestResult, setPregnancyTestResult] = useState<"Positive" | "Negative">(
    "Negative"
  );
  const [clearance, setClearance] = useState(false);
  const [shield, setShield] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});
  
  

  // ── DATA FROM FIRESTORE ─────────────────────────────
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Load services (seed defaults if empty) + real-time listener
  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "RadiologyServices"),
        where("department", "==", "Radiographic"),
        where("enabled", "==", true)
      );
      const snap = await getDocs(q);
      const map: Record<string, string[]> = {};

      if (snap.empty) {
        // Seed defaults (same logic as admin page)
        const batch = writeBatch(db);
        Object.entries(DEFAULT_SERVICES).forEach(([cat, list]) => {
          map[cat] = [...list]; // spread to create mutable copy
          list.forEach((name) => {
            const ref = doc(collection(db, "RadiologyServices"));
            batch.set(ref, {
              name,
              category: cat,
              enabled: true,
              department: "Radiographic",
              createdAt: new Date(),
            });
          });
        });
        await batch.commit();
      } else {
        snap.forEach((d) => {
          const data = d.data() as ServiceDoc;
          if (!map[data.category]) map[data.category] = [];
          map[data.category].push(data.name);
        });
      }
      setServicesByCategory(map);
      setLoading(false);
    };
    load();
  }, []);

  // Real-time listener for updates (enable/disable, add, delete)
  useEffect(() => {
    const q = query(
      collection(db, "RadiologyServices"),
      where("department", "==", "Radiographic"),
      where("enabled", "==", true)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const map: Record<string, string[]> = {};
      snapshot.forEach((d) => {
        const data = d.data() as ServiceDoc;
        if (!map[data.category]) map[data.category] = [];
        map[data.category].push(data.name);
      });
      setServicesByCategory(map);
    });
    return () => unsub();
  }, []);

  // ── MODAL HELPERS ─────────────────────────────────────
  const openModal = (
    msg: string,
    type: "confirm" | "error" | "success",
    cb?: () => void
  ) => {
    setModalMessage(msg);
    setModalType(type);
    if (cb) setOnConfirm(() => cb);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setOnConfirm(() => {});
  };

  // ── SERVICE SELECTION ─────────────────────────────────
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

  // ── NEXT / SAVE APPOINTMENT ───────────────────────────
  const handleNext = async () => {
    try {
      if (selectedServices.length === 0) {
        openModal(
          "You haven't selected any services. Continue anyway?",
          "confirm",
          () => onNavigate?.("labservices", { ...formData })
        );
        return;
      }

      if (selectedServices.includes("Others") && !otherService.trim()) {
        openModal("Please specify the 'Others' service.", "error");
        return;
      }

      openModal(
        "Radiographic services confirmed!\n\nYou will now choose a date & time slot.",
        "confirm",
        async () => {
          // Resolve final service list
          const finalServices = selectedServices.includes("Others")
            ? [
                ...selectedServices.filter((s) => s !== "Others"),
                `Others: ${otherService}`,
              ]
            : selectedServices;

          // Generate display ID
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const prefix = "APT";
          const counterDoc = doc(db, "Counters", dateStr);
          const counterSnap = await getDoc(counterDoc);
          let count = 1;
          if (counterSnap.exists()) {
            count = counterSnap.data().count + 1;
            await updateDoc(counterDoc, { count });
          } else {
            await setDoc(counterDoc, { count: 1 });
          }
          const padded = String(count).padStart(3, "0");
          const displayId = `${prefix}-${dateStr}-${padded}`;

          // Save appointment
          const auth = getAuth();
          const uid = auth.currentUser?.uid ?? "";
          const payload = {
            patientId: patientId || formData?.patientId || "",
            controlNo: controlNo || formData?.controlNo || "",
            services: finalServices,
            isPregnant,
            clearance,
            shield,
            pregnancyTestResult,
            lastMenstrualPeriod: lastMenstrualPeriod || "",
            createdAt: new Date().toISOString(),
            displayId,
            dateStr,
            uid,
            department: "Radiographic",
          };
          const ref = await addDoc(collection(db, "Appointments"), payload);
          await updateDoc(ref, { appointmentId: ref.id });

          openModal(`Appointment created!\nID: ${displayId}`, "success");
          setTimeout(() => {
            onNavigate?.("calendar", {
              ...formData,
              appointmentData: payload,
              appointmentId: ref.id,
              displayId,
            });
          }, 1800);
        }
      );
    } catch (err) {
      console.error(err);
      openModal("Failed to create appointment.", "error");
    }
  };

  // ── RENDER ───────────────────────────────────────
  if (loading) return <div className="labservices-container p-6">Loading services…</div>;

  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Radiographic Services</h2>

      <form className="services-list">
        {/* ── SERVICES GRID ── */}
        <div className="services-grid">
          {Object.entries(servicesByCategory).map(([cat, list]) => (
            <div key={cat} className="category">
              <h3>{cat}</h3>
              {list.map((svc) => (
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
                      placeholder="Specify here..."
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── PREGNANCY SECTION ── */}
        <div className="pregnancy-section">
          <h3>Female Patients (10‑55 yrs)</h3>
          <div>
            <label>Date of Last Menstrual Period:</label>
            <input
              type="date"
              value={lastMenstrualPeriod}
              onChange={(e) => setLastMenstrualPeriod(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1.5px solid #005b9f",
              }}
            />
          </div>

          <div className="pregnancy-grid">
            <div>
              <strong>Are you pregnant?</strong>
              <br />
              {(["Yes", "No", "Not sure/Delayed"] as const).map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    value={opt}
                    checked={isPregnant === opt}
                    onChange={() => setIsPregnant(opt)}
                  />
                  {opt}
                </label>
              ))}
              {isPregnant === "Yes" && (
                <div className="sub-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={clearance}
                      onChange={(e) => setClearance(e.target.checked)}
                    />
                    With doctor's clearance
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={shield}
                      onChange={(e) => setShield(e.target.checked)}
                    />
                    With lead shield
                  </label>
                </div>
              )}
            </div>

            <div>
              <strong>Pregnancy Test Result:</strong>
              <br />
              {(["Positive", "Negative"] as const).map((res) => (
                <label key={res}>
                  <input
                    type="radio"
                    value={res}
                    checked={pregnancyTestResult === res}
                    onChange={() => setPregnancyTestResult(res)}
                  />
                  {res}
                </label>
              ))}
            </div>
          </div>
        </div>
      </form>

      {/* ── NAVIGATION ── */}
      <div className="labservices-navigation">
        <button
          className="nav-button bg-blue-500 text-white px-4 py-2 rounded"
          type="button"
          onClick={handleNext}
        >
          {selectedServices.length > 0 ? "Show Slots ➡" : "Next ➡"}
        </button>
      </div>

      {/* ── MODAL ── */}
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
                <p style={{ whiteSpace: "pre-line" }}>{modalMessage}</p>
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

export default RadiographicServices;