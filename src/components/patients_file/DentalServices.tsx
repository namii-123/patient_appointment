import React, { useState, useEffect } from "react";
import { doc, getDoc, addDoc, collection, updateDoc, setDoc, getDocs, query, where, onSnapshot, writeBatch } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import "../../assets/RadiographicServices.css"; // Reused
import { DEFAULT_DENTAL_SERVICES } from "../../config/defaultDentalServices";

interface DentalServicesProps {
  onNavigate?: (
    targetView: "calendardental" | "medical",
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
}

const DentalServices: React.FC<DentalServicesProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  // Load + Seed defaults (same as Radiology)
  useEffect(() => {
    const loadAndSeed = async () => {
      const q = query(
        collection(db, "DentalServices"),
        where("department", "==", "Dental"),
        where("enabled", "==", true)
      );
      const snap = await getDocs(q);
      const map: Record<string, string[]> = {};

      if (snap.empty) {
        const batch = writeBatch(db);
        Object.entries(DEFAULT_DENTAL_SERVICES).forEach(([cat, list]) => {
          map[cat] = [...list];
          list.forEach((name) => {
            const ref = doc(collection(db, "DentalServices"));
            batch.set(ref, {
              name,
              category: cat,
              enabled: true,
              department: "Dental",
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

    loadAndSeed();
  }, []);

  // Real-time listener (updates when admin adds/disables services)
  useEffect(() => {
    const q = query(
      collection(db, "DentalServices"),
      where("department", "==", "Dental"),
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

  const toggleService = (svc: string) => {
    if (svc === "Others") {
      if (selectedServices.includes("Others")) {
        setSelectedServices(prev => prev.filter(s => s !== "Others"));
        setOtherService("");
      } else {
        setSelectedServices(prev => [...prev, "Others"]);
      }
    } else {
      setSelectedServices(prev =>
        prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]
      );
    }
  };

  const handleNext = async () => {
    try {
      if (selectedServices.length === 0) {
        openModal(
          "You haven't selected any services. Skip and go to next page?",
          "confirm",
          () => onNavigate?.("medical", { ...formData })
        );
        return;
      }

      if (selectedServices.includes("Others") && !otherService.trim()) {
        openModal("Please specify the 'Others' service.", "error");
        return;
      }

      openModal(
        "Dental services confirmed!\n\nYou will now be directed to select your preferred appointment date and time slot.",
        "confirm",
        async () => {
          const finalServices = selectedServices.includes("Others")
            ? [...selectedServices.filter(s => s !== "Others"), `Others: ${otherService}`]
            : selectedServices;

          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const prefix = "APT";

          const counterDoc = doc(db, "Counters", dateStr);
          const counterSnap = await getDoc(counterDoc);
          let count = 1;
          if (counterSnap.exists()) {
            count = counterSnap.data()?.count + 1;
            await updateDoc(counterDoc, { count });
          } else {
            await setDoc(counterDoc, { count: 1 });
          }
          const padded = String(count).padStart(3, "0");
          const displayId = `${prefix}-${dateStr}-${padded}`;

          const auth = getAuth();
          const uid = auth.currentUser?.uid || "";

          const appointmentData = {
            patientId: patientId || formData?.patientId || "",
            controlNo: controlNo || formData?.controlNo || "",
            services: finalServices,
            createdAt: new Date().toISOString(),
            displayId,
            dateStr,
            department: "Dental",
            uid,
          };

          const ref = await addDoc(collection(db, "Appointments"), appointmentData);
          await updateDoc(ref, { appointmentId: ref.id });

          openModal(`Dental appointment created!\n\nID: ${displayId}`, "success");

          setTimeout(() => {
            onNavigate?.("calendardental", {
              ...formData,
              appointmentData,
              appointmentId: ref.id,
              appointmentIds: [...(formData?.appointmentIds || []), ref.id],
              displayId,
            });
          }, 1800);
        }
      );
    } catch (err) {
      console.error("Error saving dental appointment:", err);
      openModal("Failed to save appointment. Please try again.", "error");
    }
  };

  if (loading) {
    return <div className="labservices-container p-6">Loading dental services…</div>;
  }

  return (
    <div className="labservices-container p-6">
      <h2 className="text-2xl font-bold mb-4">Dental Services</h2>

      <form className="services-list">
        <div className="services-grid">
          {Object.entries(servicesByCategory).map(([category, services]) => (
            <div key={category} className="category">
              <h3>{category}</h3>
              {services.map((service) => (
                <div key={service}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service)}
                      onChange={() => toggleService(service)}
                    />
                    {service}
                  </label>

                  {service === "Others" && selectedServices.includes("Others") && (
                    <input
                      type="text"
                      value={otherService}
                      onChange={(e) => setOtherService(e.target.value)}
                      placeholder="Specify here..."
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
          {selectedServices.length > 0 ? "Show Slots" : "Next"}
        </button>
      </div>

      {/* MODAL */}
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
                    <button className="modal-btn cancel" onClick={closeModal}>Cancel</button>
                    <button className="modal-btn confirm" onClick={() => { closeModal(); onConfirm(); }}>
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

export default DentalServices;