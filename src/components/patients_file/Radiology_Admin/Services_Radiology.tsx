import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaClock,
  FaStethoscope,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaUndo,
  FaBroom,
} from "react-icons/fa";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import "../../../assets/Dashboard_Clinical.css";
import logo from "/logo.png";
import { DEFAULT_SERVICES } from "../../../config/defaultServices";
import { X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  isDeleted: boolean;
}

const Services_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherCategory, setOtherCategory] = useState("");

  // One-time cleanup button
  const [showCleanupBtn, setShowCleanupBtn] = useState(true);

  const categories = useMemo(() => {
    const cats = [...new Set(services.map((s) => s.category))].filter(Boolean);
    return cats.sort((a, b) => a.localeCompare(b));
  }, [services]);

  // CLEANUP DUPLICATES (One-time only)
  const cleanupDuplicates = async () => {
    if (!window.confirm("Permanently delete duplicate services? (Keeps the first one)")) return;

    const q = query(collection(db, "RadiologyServices"), where("department", "==", "Radiographic"));
    const snapshot = await getDocs(q);

    const seen = new Map<string, string>(); // "category|lowercase-name" → docId
    const toDelete: string[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.category}|${data.name.trim().toLowerCase()}`;

      if (seen.has(key)) {
        toDelete.push(doc.id);
      } else {
        seen.set(key, doc.id);
      }
    });

    if (toDelete.length === 0) {
      alert("No duplicates found! All clean!");
      setShowCleanupBtn(false);
      return;
    }

    const batch = writeBatch(db);
    toDelete.forEach((id) => batch.delete(doc(db, "RadiologyServices", id)));
    await batch.commit();

    alert(`Cleaned up  ${toDelete.length} duplicate(s)!`);
    setShowCleanupBtn(false);
  };

  // BULLETPROOF SEEDING (Same as Clinical — never adds duplicates)
  useEffect(() => {
    const seedDefaultServices = async () => {
      const colRef = collection(db, "RadiologyServices");
      const q = query(colRef, where("department", "==", "Radiographic"));
      const snapshot = await getDocs(q);

      const existing = new Map<string, boolean>();
      snapshot.forEach((doc) => {
        const d = doc.data();
        const key = `${d.category}|${d.name.trim().toLowerCase()}`;
        existing.set(key, true);
      });

      const batch = writeBatch(db);
      let added = 0;

      Object.entries(DEFAULT_SERVICES).forEach(([category, names]) => {
        names.forEach((rawName) => {
          const name = rawName.trim();
          const key = `${category}|${name.toLowerCase()}`;

          if (!existing.has(key)) {
            const docRef = doc(colRef);
            batch.set(docRef, {
              name,
              category,
              enabled: true,
              isDeleted: false,
              department: "Radiographic",
              createdAt: new Date(),
            });
            added++;
            existing.set(key, true);
          }
        });
      });

      if (added > 0) {
        await batch.commit();
        console.log(`Seeded ${added} missing radiology services`);
      }
    };

    seedDefaultServices();

    // Real-time listener
    const q = query(collection(db, "RadiologyServices"), where("department", "==", "Radiographic"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Service[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        fetched.push({
          id: d.id,
          name: data.name,
          category: data.category || "Uncategorized",
          enabled: data.enabled ?? true,
          isDeleted: data.isDeleted ?? false,
        });
      });
      fetched.sort((a, b) => a.name.localeCompare(b.name));
      setServices(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // SAVE SERVICE (with duplicate prevention)
  const handleSaveService = async () => {
    const name = (editingId ? editName : newServiceName).trim();
    let cat = editingId
      ? editCategory.trim()
      : showOtherInput && otherCategory.trim()
      ? otherCategory.trim()
      : newServiceCategory.trim();

    if (!name) return alert("Service name is required");
    if (!cat) return alert("Category is required");

    // Prevent duplicate when adding
    const key = `${cat}|${name.toLowerCase()}`;
    const exists = services.some(
      (s) => `${s.category}|${s.name.trim().toLowerCase()}` === key && s.id !== editingId
    );

    if (!editingId && exists) {
      return alert("This service already exists in this category!");
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "RadiologyServices", editingId), { name, category: cat });
      } else {
        await addDoc(collection(db, "RadiologyServices"), {
          name,
          category: cat,
          enabled: true,
          department: "Radiographic",
          createdAt: new Date(),
          isDeleted: false,
        });
      }
      closeModal();
    } catch (e) {
      console.error(e);
      alert("Failed to save service");
    }
  };

  const toggleService = async (id: string, cur: boolean) => {
    await updateDoc(doc(db, "RadiologyServices", id), { enabled: !cur });
  };

  const softDeleteService = async (id: string) => {
    if (!window.confirm("Move to trash?")) return;
    await updateDoc(doc(db, "RadiologyServices", id), { isDeleted: true, enabled: false });
  };

  const restoreService = async (id: string) => {
    if (!window.confirm("Restore this service?")) return;
    await updateDoc(doc(db, "RadiologyServices", id), { isDeleted: false });
  };

  const permanentlyDeleteService = async (id: string) => {
    if (!window.confirm("PERMANENTLY DELETE? Cannot undo!")) return;
    await deleteDoc(doc(db, "RadiologyServices", id));
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewServiceName("");
    setNewServiceCategory("");
    setOtherCategory("");
    setShowOtherInput(false);
    setShowAddModal(true);
  };

  const openEditModal = (s: Service) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCategory(s.category);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setShowOtherInput(false);
    setOtherCategory("");
  };

  const handleCategoryChange = (value: string) => {
    if (value === "others") {
      setShowOtherInput(true);
      setNewServiceCategory("");
    } else {
      setShowOtherInput(false);
      setNewServiceCategory(value);
      setOtherCategory("");
    }
  };

     const [showInfoModal, setShowInfoModal] = useState(false);
      const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
      const [showCustomModal, setShowCustomModal] = useState(false);
    const [customModalMessage, setCustomModalMessage] = useState("");
    const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
    const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});
    
    const openCustomModal = (
      message: string,
      type: "success" | "error" | "confirm" = "success",
      onConfirm?: () => void
    ) => {
      setCustomModalMessage(message);
      setCustomModalType(type);
      if (onConfirm) setOnCustomModalConfirm(() => onConfirm);
      setShowCustomModal(true);
    };
    
    const closeCustomModal = () => {
      setShowCustomModal(false);
      setOnCustomModalConfirm(() => {});
    };

  const activeServices = services.filter((s) => !s.isDeleted);
  const trashedServices = services.filter((s) => s.isDeleted);

  return (
    <div className="dashboards">
      {/* SAME SIDEBAR AS BEFORE */}

        <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => navigate("/dashboard_radiology")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Radiology</span>
          </div>

          <nav className="nav-linkss">
            {[
              { to: "/dashboard_radiology", icon: FaTachometerAlt, label: "Dashboard" },
              { to: "/appointments_radiology", icon: FaCalendarAlt, label: "Appointments" },
              { to: "/patientrecords_radiology", icon: FaUsers, label: "Patient Records" },
              { to: "/manageslots_radiology", icon: FaClock, label: "Manage Slots" },
              { to: "", icon: FaStethoscope, label: "Services", active: true },
              { to: "/reports&analytics_radiology", icon: FaChartBar, label: "Reports & Analytics" },
            ].map((item) => (
              <div
                key={item.to}
                className={`nav-item ${item.active || location.pathname.includes(item.to) ? "active" : ""}`}
                onClick={() => item.to && navigate(item.to)}
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Admin</span>
          </div>
            <div className="signout-box">
                                                     <FaSignOutAlt className="signout-icon" />
                                                     <span
                                                       onClick={async () => {
                      openCustomModal(
                        "Are you sure you want to sign out?",
                        "confirm",
                        async () => {
                          try {
                            await signOut(auth);
                            navigate("/loginadmin", { replace: true });
                          } catch (error) {
                            console.error("Error signing out:", error);
                            openCustomModal("Failed to sign out. Please try again.", "error");
                          }
                        }
                      );
                    }}
                                                       className="signout-label"
                                                       style={{ cursor: "pointer" }}
                                                     >
                                                       Sign Out
                                                     </span>
                                                   </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-navbar-radiology">
          <h5 className="navbar-title">Radiology Services Management</h5>
          <div className="notification-wrapper">
            <FaBell className="notification-bell" />
          </div>
        </div>

        <div className="content-wrapper" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3>{showTrash ? "Trashed Services" : "All Services"}</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {showCleanupBtn && !showTrash && (
                <button onClick={cleanupDuplicates} style={{ background: "#ff9800", color: "white", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", border: "none" }}>
                  <FaBroom /> Cleanup Duplicates
                </button>
              )}
              <button onClick={() => setShowTrash(!showTrash)} style={{ background: "#f0f0f0", padding: "10px 16px", borderRadius: "8px", border: "1px solid #ccc" }}>
                {showTrash ? "Show Active" : "Show Trash"} ({trashedServices.length})
              </button>
              {!showTrash && (
                <button onClick={openAddModal} style={{ background: "#005b9f", color: "white", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" , border: "none"}}>
                  <FaPlus /> Add Service
                </button>
              )}
            </div>
          </div>

          {/* SAME RENDERING AS BEFORE BUT WITH SORTING */}
          {loading ? <p>Loading…</p> : (
            <div style={{ display: "grid", gap: "16px" }}>
              {Object.entries(
                (showTrash ? trashedServices : activeServices).reduce((acc, svc) => {
                  if (!acc[svc.category]) acc[svc.category] = [];
                  acc[svc.category].push(svc);
                  return acc;
                }, {} as Record<string, Service[]>)
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, list]) => (
                  <div key={cat} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px", background: "#f9f9f9" }}>
                    <h4 style={{ margin: "0 0 12px", color: "#005b9f", fontWeight: 600 }}>{cat}</h4>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {list.sort((a, b) => a.name.localeCompare(b.name)).map((svc) => (
                        <div key={svc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", opacity: svc.enabled && !svc.isDeleted ? 1 : 0.6 }}>
                          <span style={{ fontWeight: svc.enabled ? "500" : "normal" }}>
                            {svc.name}
                            {svc.isDeleted && <small> (Trashed)</small>}
                            {!svc.enabled && !svc.isDeleted && <small> (Disabled)</small>}
                          </span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {!svc.isDeleted && (
                              <button onClick={() => toggleService(svc.id, svc.enabled)} style={{ background: "none", border: "none", fontSize: "1.4rem" }}>
                                {svc.enabled ? <FaToggleOn color="#4CAF50" /> : <FaToggleOff color="#ccc" />}
                              </button>
                            )}
                            <button onClick={() => openEditModal(svc)} style={{ color: "#005b9f" }}><FaEdit /></button>
                            {svc.isDeleted ? (
                              <>
                                <button onClick={() => restoreService(svc.id)} style={{ color: "#4CAF50" }}><FaUndo /></button>
                                <button onClick={() => permanentlyDeleteService(svc.id)} style={{ color: "#F44336" }}><FaTrash /></button>
                              </>
                            ) : (
                              <button onClick={() => softDeleteService(svc.id)} style={{ color: "#F44336" }}><FaTrash /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* SAME MODAL AS BEFORE */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Service" : "Add New Service"}</h3>
            {/* ... same input fields as before ... */}
            <div style={{ marginBottom: "16px" }}>
              <label>Service Name</label>
              <input value={editingId ? editName : newServiceName} onChange={(e) => editingId ? setEditName(e.target.value) : setNewServiceName(e.target.value)}   placeholder="New service name..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label>Category</label>
              {editingId ? (
                <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
              ) : (
                <>
                  <select value={showOtherInput ? "others" : newServiceCategory} onChange={(e) => handleCategoryChange(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}>
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="others">+ Others (Add New)</option>
                  </select>
                  {showOtherInput && <input value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)}  style={{ width: "100%", marginTop: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} placeholder="New category..." autoFocus />}
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={closeModal} style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: "8px", background: "white" }}>Cancel</button>
              <button onClick={handleSaveService} style={{ padding: "10px 16px", background: "#005b9f", color: "white", border: "none", borderRadius: "8px" }}>
                {editingId ? "Update" : "Add"} Service
              </button>
            </div>
          </div>
        </div>
      )}

      
          {/* CUSTOM UNIFIED MODAL - SAME STYLE SA TRANSACTION PAGE */}
      {showCustomModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
          </audio>
          <div className="radiology-modal-overlay" onClick={closeCustomModal}>
            <div className="radiology-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="radiology-modal-header">
                <img src={logo} alt="Logo" className="radiology-modal-logo" />
                <h3 className="radiology-modal-title">
                  {customModalType === "success" && "SUCCESS"}
                  {customModalType === "error" && "ERROR"}
                  {customModalType === "confirm" && "CONFIRM ACTION"}
                </h3>
                <button className="radiology-modal-close" onClick={closeCustomModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="radiology-modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>
                  {customModalMessage}
                </p>
              </div>
              <div className="radiology-modal-footer">
                {customModalType === "confirm" && (
                  <>
                    <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>
                      No, Cancel
                    </button>
                    <button
                      className="radiology-modal-btn confirm"
                      onClick={() => {
                        closeCustomModal();
                        onCustomModalConfirm();
                      }}
                    >
                      Yes, Proceed
                    </button>
                  </>
                )}
                {(customModalType === "success" || customModalType === "error") && (
                  <button className="radiology-modal-btn ok" onClick={closeCustomModal}>
                    {customModalType === "success" ? "Done" : "OK"}
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

export default Services_Radiology;