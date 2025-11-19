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
import "../../../assets/Dashboard_Clinical.css"; // You can reuse or rename to Dashboard_Medical.css
import logo from "/logo.png";
import { DEFAULT_MEDICAL_SERVICES } from "../../../config/defaultMedicalServices"; // Create this file

interface Service {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  isDeleted: boolean;
}

const Services_Medical: React.FC = () => {
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

  // ONE-TIME DUPLICATE CLEANUP
  const cleanupDuplicates = async () => {
    if (!window.confirm("This will permanently delete duplicate medical services (keeps the first one). Continue?")) return;

    const q = query(collection(db, "MedicalServices"), where("department", "==", "Medical"));
    const snapshot = await getDocs(q);

    const seen = new Map<string, string>();
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
    toDelete.forEach((id) => batch.delete(doc(db, "MedicalServices", id)));
    await batch.commit();

    alert(`Cleaned up ${toDelete.length} duplicate(s)!`);
    setShowCleanupBtn(false);
  };

  // BULLETPROOF SEEDING — Runs once on mount
  useEffect(() => {
    const seedDefaultServices = async () => {
      const colRef = collection(db, "MedicalServices");
      const q = query(colRef, where("department", "==", "Medical"));
      const snapshot = await getDocs(q);

      const existing = new Map<string, boolean>();
      snapshot.forEach((doc) => {
        const d = doc.data();
        const key = `${d.category}|${d.name.trim().toLowerCase()}`;
        existing.set(key, true);
      });

      const batch = writeBatch(db);
      let added = 0;

      Object.entries(DEFAULT_MEDICAL_SERVICES).forEach(([category, names]) => {
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
              department: "Medical",
              createdAt: new Date(),
            });
            added++;
            existing.set(key, true);
          }
        });
      });

      if (added > 0) {
        await batch.commit();
        console.log(`Seeded ${added} missing medical services`);
      }
    };

    seedDefaultServices();

    // Real-time listener
    const q = query(collection(db, "MedicalServices"), where("department", "==", "Medical"));
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

  // CRUD Operations
  const handleSaveService = async () => {
    const name = (editingId ? editName : newServiceName).trim();
    let cat = editingId
      ? editCategory.trim()
      : showOtherInput && otherCategory.trim()
      ? otherCategory.trim()
      : newServiceCategory.trim();

    if (!name) return alert("Service name is required");
    if (!cat) return alert("Category is required");

    const normalizedKey = `${cat}|${name.toLowerCase()}`;
    const alreadyExists = services.some(
      (s) =>
        `${s.category}|${s.name.trim().toLowerCase()}` === normalizedKey && s.id !== editingId
    );

    if (!editingId && alreadyExists) {
      return alert("This service already exists in this category!");
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "MedicalServices", editingId), { name, category: cat });
      } else {
        await addDoc(collection(db, "MedicalServices"), {
          name,
          category: cat,
          enabled: true,
          isDeleted: false,
          department: "Medical",
          createdAt: new Date(),
        });
      }
      closeModal();
    } catch (e) {
      console.error(e);
      alert("Failed to save service");
    }
  };

  const toggleService = async (id: string, cur: boolean) => {
    await updateDoc(doc(db, "MedicalServices", id), { enabled: !cur });
  };

  const softDeleteService = async (id: string) => {
    if (!window.confirm("Move to trash?")) return;
    await updateDoc(doc(db, "MedicalServices", id), { isDeleted: true, enabled: false });
  };

  const restoreService = async (id: string) => {
    if (!window.confirm("Restore this service?")) return;
    await updateDoc(doc(db, "MedicalServices", id), { isDeleted: false });
  };

  const permanentlyDeleteService = async (id: string) => {
    if (!window.confirm("PERMANENTLY DELETE? Cannot undo!")) return;
    await deleteDoc(doc(db, "MedicalServices", id));
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

  const activeServices = services.filter((s) => !s.isDeleted);
  const trashedServices = services.filter((s) => s.isDeleted);

  return (
    <div className="dashboards">
      {/* SIDEBAR */}
      <aside className="sidebars">
        <div>
          <div className="logo-boxs" onClick={() => navigate("/dashboard_medical")} style={{ cursor: "pointer" }}>
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Medical</span>
          </div>

          <nav className="nav-linkss">
            {[
              { to: "/dashboard_medical", icon: FaTachometerAlt, label: "Dashboard" },
              { to: "/appointments_medical", icon: FaCalendarAlt, label: "Appointments" },
              { to: "/patientrecords_medical", icon: FaUsers, label: "Patient Records" },
              { to: "/manageslots_medical", icon: FaClock, label: "Manage Slots" },
              { to: "", icon: FaStethoscope, label: "Services", active: true },
              { to: "/reports&analytics_medical", icon: FaChartBar, label: "Reports & Analytics" },
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
                if (window.confirm("Sign out?")) {
                  await signOut(auth);
                  navigate("/loginadmin", { replace: true });
                }
              }}
              className="signout-label"
              style={{ cursor: "pointer" }}
            >
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="top-navbar-clinical">
          <h5 className="navbar-title">Medical Services Management</h5>
          <div className="notification-wrapper">
            <FaBell className="notification-bell" />
          </div>
        </div>

        <div className="content-wrapper" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3>{showTrash ? "Trashed Services" : "All Medical Services"}</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {showCleanupBtn && !showTrash && (
                <button
                  onClick={cleanupDuplicates}
                  style={{
                    background: "#ff9800",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaBroom /> Cleanup Duplicates
                </button>
              )}
              <button
                onClick={() => setShowTrash(!showTrash)}
                style={{ background: "#f0f0f0", padding: "10px 16px", borderRadius: "8px", border: "1px solid #ccc" }}
              >
                {showTrash ? "Show Active" : "Show Trash"} ({trashedServices.length})
              </button>
              {!showTrash && (
                <button
                  onClick={openAddModal}
                  style={{
                    background: "#005b9f",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaPlus /> Add Service
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p>Loading services…</p>
          ) : (
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
                        <div
                          key={svc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px",
                            background: "white",
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            opacity: svc.enabled && !svc.isDeleted ? 1 : 0.6,
                          }}
                        >
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
                            <button onClick={() => openEditModal(svc)} style={{ color: "#005b9f" }}>
                              <FaEdit />
                            </button>
                            {svc.isDeleted ? (
                              <>
                                <button onClick={() => restoreService(svc.id)} style={{ color: "#4CAF50" }}>
                                  <FaUndo />
                                </button>
                                <button onClick={() => permanentlyDeleteService(svc.id)} style={{ color: "#F44336" }}>
                                  <FaTrash />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => softDeleteService(svc.id)} style={{ color: "#F44336" }}>
                                <FaTrash />
                              </button>
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

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{ background: "white", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingId ? "Edit Service" : "Add New Medical Service"}</h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>Service Name</label>
              <input
                type="text"
                value={editingId ? editName : newServiceName}
                onChange={(e) => (editingId ? setEditName(e.target.value) : setNewServiceName(e.target.value))}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                placeholder="e.g., General Consultation"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>Category</label>
              {editingId ? (
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                />
              ) : (
                <>
                  <select
                    value={showOtherInput ? "others" : newServiceCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="others">+ Others (Add New)</option>
                  </select>
                  {showOtherInput && (
                    <input
                      type="text"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginTop: "8px" }}
                      placeholder="New category name..."
                      autoFocus
                    />
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={closeModal}
                style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: "8px", background: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveService}
                style={{ padding: "10px 16px", background: "#005b9f", color: "white", border: "none", borderRadius: "8px" }}
              >
                {editingId ? "Update" : "Add"} Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services_Medical;