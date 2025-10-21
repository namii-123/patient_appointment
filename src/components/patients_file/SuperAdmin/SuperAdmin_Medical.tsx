
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaArrowLeft,
  FaEnvelope,
} from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 

// Types
interface Appointment {
  id: string;
  UserId: string;
  patientId: string;
  patientCode: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
  appointmentDate: string;
  slot: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Canceled";
  controlNo?: string;
  birthdate?: string;
  citizenship?: string;
  houseNo?: string;
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  email?: string;
  contact?: string;
  purpose?: string;
  slotID?: string;
}

const SuperAdmin_Medical: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Appointment | null>(null);

  const notifications = [
    { id: 1, text: "New patient registered in Medical", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ];

  // Reset modal state on mount
  useEffect(() => {
    setShowModal(false);
    setSelectedPatientRecord(null);
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log("showModal:", showModal, "selectedPatientRecord:", selectedPatientRecord);
  }, [showModal, selectedPatientRecord]);

  // Year options
  const [yearOptions, setYearOptions] = useState<number[]>(() => {
    return Array.from({ length: 11 }, (_, i) => 2025 + i);
  });

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedYear(value);

    const lastYear = yearOptions[yearOptions.length - 1];
    if (value === lastYear.toString()) {
      const newYears = Array.from({ length: 10 }, (_, i) => lastYear + i + 1);
      setYearOptions((prev) => [...prev, ...newYears]);
    }
  };

  // Fetch appointments from Firestore
  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Medical")
    );

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      const loaded: Appointment[] = [];

      for (const t of transSnap.docs) {
        const tData = t.data();

        let patientData: any = {
          UserId: "",
          lastname: "Unknown",
          firstname: "Unknown",
          middleInitial: "",
          age: 0,
          gender: "",
          patientCode: "",
          controlNo: "",
          birthdate: "",
          citizenship: "",
          houseNo: "",
          street: "",
          barangay: "",
          municipality: "",
          province: "",
          email: "",
          contact: "",
        };

        let userId = "";
        if (tData.uid) {
          const userRef = doc(db, "Users", tData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userId = userSnap.data().UserId || "";
          }
        }

        if (tData.patientId) {
          const pRef = doc(db, "Patients", tData.patientId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            patientData = pSnap.data();
          } else {
            console.warn(`No patient document found for patientId: ${tData.patientId}`);
          }
        } else {
          console.warn(`No patientId in transaction: ${t.id}`);
        }

        loaded.push({
          id: t.id,
          UserId: userId,
          patientId: tData.patientId || "",
          patientCode: patientData.patientCode || "",
          lastname: patientData.lastName || "Unknown",
          firstname: patientData.firstName || "Unknown",
          middleInitial: patientData.middleInitial || "",
          age: patientData.age || 0,
          gender: patientData.gender || "",
          services: Array.isArray(tData.services) ? tData.services : [],
          appointmentDate: tData.date || "",
          slot: tData.slotTime || "",
          status: tData.status || "Pending",
          controlNo: patientData.controlNo || "",
          birthdate: patientData.birthdate || "",
          citizenship: patientData.citizenship || "",
          houseNo: patientData.houseNo || "",
          street: patientData.street || "",
          barangay: patientData.barangay || "",
          municipality: patientData.municipality || "",
          province: patientData.province || "",
          email: patientData.email || "",
          contact: patientData.contact || "",
          purpose: tData.purpose || "",
          slotID: tData.slotID || "",
        });
      }

      console.log("Loaded appointments:", loaded);
      setAppointments(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Count totals
  const pendingCount = appointments.filter((a) => a.status.toLowerCase() === "pending").length;
  const approvedCount = appointments.filter((a) => a.status.toLowerCase() === "approved").length;
  const completedCount = appointments.filter((a) => a.status.toLowerCase() === "completed").length;
  const rejectedCount = appointments.filter((a) => a.status.toLowerCase() === "rejected").length;
  const canceledCount = appointments.filter((a) => a.status.toLowerCase() === "cancelled").length;

  // Filter appointments
  const filteredAppointments = appointments.filter((a) => {
    if (filter !== "all" && a.status.toLowerCase() !== filter) return false;

    const [year, month, day] = a.appointmentDate.split("-");

    if (selectedYear && year !== selectedYear) return false;
    if (selectedMonth && month !== selectedMonth) return false;
    if (selectedDay && day !== selectedDay) return false;

    return true;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleViewMore = (record: Appointment) => {
    console.log("handleViewMore called with record:", record);
    setSelectedPatientRecord(record);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatientRecord(null);
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="logo-boxss">
            <img src={logo} alt="logo" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>
          <div className="nav-linkss">
            <div className="nav-item active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>
                User Requests
              </span>
            </div>
             <div className="nav-items">
                          <FaEnvelope className="nav-icon" />
                          <span onClick={() => handleNavigation("/superadmin_messages")}>
                            Messages
                          </span>
                        </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_reports")}>
                Reports & Analytics
              </span>
            </div>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Super Admin</span>
          </div>
          <div className="signout-box">
                                 <FaSignOutAlt className="signout-icon" />
                                 <span
                                   onClick={async () => {
                                     const isConfirmed = window.confirm("Are you sure you want to sign out?");
                                     if (isConfirmed) {
                                       try {
                                         await signOut(auth);
                                         navigate("/loginadmin", { replace: true });
                                       } catch (error) {
                                         console.error("Error signing out:", error);
                                         alert("Failed to sign out. Please try again.");
                                       }
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

      {/* Main Content */}
      <main className="main-content-superadmin">
        {/* Top Navbar */}
        <div className="top-navbar-superadmin">
          <h2 className="navbar-title">Medical Appointments</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {notifications.filter((n) => n.unread).length > 0 && (
              <span className="notification-count">
                {notifications.filter((n) => n.unread).length}
              </span>
            )}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  <button
                    className="mark-read-btn"
                    onClick={() => notifications.forEach((n) => (n.unread = false))}
                  >
                    Mark all as read
                  </button>
                </div>
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${n.unread ? "unread" : ""}`}
                    >
                      <span>{n.text}</span>
                      {n.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
          <FaArrowLeft /> Back
        </button>

        {/* Date Filter */}
        <div className="filters-container-clinical">
          <div className="filter-clinical">
            <label>Date:</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Month</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="filter-clinical">
            <select
              id="day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-clinical">
            <select id="year" value={selectedYear} onChange={handleYearChange}>
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div
            className={`summary-card all ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <h3>{appointments.length}</h3>
            <p>All</p>
          </div>
          <div
            className={`summary-card pending ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <h3>{pendingCount}</h3>
            <p>Pending</p>
          </div>
          <div
            className={`summary-card approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h3>{approvedCount}</h3>
            <p>Approved</p>
          </div>
          <div
            className={`summary-card completed ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            <h3>{completedCount}</h3>
            <p>Completed</p>
          </div>
          <div
            className={`summary-card rejected ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            <h3>{rejectedCount}</h3>
            <p>Rejected</p>
          </div>
          <div
            className={`summary-card canceled ${filter === "cancelled" ? "active" : ""}`}
            onClick={() => setFilter("cancelled")}
          >
            <h3>{canceledCount}</h3>
            <p>Canceled</p>
          </div>
        </div>

        {/* Table for appointments */}
        <div className="appointments-section">
          <h3 className="section-title">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Appointments
          </h3>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Middle Initial</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Services</th>
                <th>Appointment Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.UserId}</td>
                    <td>{a.patientCode}</td>
                    <td>{a.lastname}</td>
                    <td>{a.firstname}</td>
                    <td>{a.middleInitial || "N/A"}</td>
                    <td>{a.age}</td>
                    <td>{a.gender}</td>
                    <td>{a.services.join(", ")}</td>
                    <td>{a.appointmentDate}</td>
                    <td>{a.slot}</td>
                    <td>
                      <span className={`status-badge ${a.status.toLowerCase()}`}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-button view-mores"
                        onClick={() => handleViewMore(a)}
                      >
                        View More
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "12px" }}>
                    {loading ? "Loading..." : "No appointments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View More Modal */}
        {showModal && selectedPatientRecord !== null && (
          <div className="modal-overlayd">
            <div className="modal-contentd">
              <div className="modal-inner">
                <div className="modal-headerd">
                  <h3>Patient Information</h3>
                  <button className="close-btnd" onClick={closeModal}>×</button>
                </div>
                <div className="modal-bodyd">
                  <table className="patient-info-tabled">
                    <tbody>
                      <tr><th>User ID</th><td>{selectedPatientRecord.UserId}</td></tr>
                      <tr><th>Patient ID</th><td>{selectedPatientRecord.patientCode}</td></tr>
                      <tr><th>Control No.</th><td>{selectedPatientRecord.controlNo || "N/A"}</td></tr>
                      <tr><th>Last Name</th><td>{selectedPatientRecord.lastname}</td></tr>
                      <tr><th>First Name</th><td>{selectedPatientRecord.firstname}</td></tr>
                      <tr><th>Middle Initial</th><td>{selectedPatientRecord.middleInitial || "N/A"}</td></tr>
                      <tr><th>Birthdate</th><td>{selectedPatientRecord.birthdate || "N/A"}</td></tr>
                      <tr><th>Age</th><td>{selectedPatientRecord.age}</td></tr>
                      <tr><th>Gender</th><td>{selectedPatientRecord.gender}</td></tr>
                      <tr><th>Citizenship</th><td>{selectedPatientRecord.citizenship || "N/A"}</td></tr>
                      <tr className="section-headerd">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr><th>House No.</th><td>{selectedPatientRecord.houseNo || "N/A"}</td></tr>
                      <tr><th>Street</th><td>{selectedPatientRecord.street || "N/A"}</td></tr>
                      <tr><th>Barangay</th><td>{selectedPatientRecord.barangay || "N/A"}</td></tr>
                      <tr><th>Municipality</th><td>{selectedPatientRecord.municipality || "N/A"}</td></tr>
                      <tr><th>Province</th><td>{selectedPatientRecord.province || "N/A"}</td></tr>
                      <tr><th>Email</th><td>{selectedPatientRecord.email || "N/A"}</td></tr>
                      <tr><th>Contact</th><td>{selectedPatientRecord.contact || "N/A"}</td></tr>
                      <tr><th>Department</th><td>{selectedPatientRecord.purpose || "N/A"}</td></tr>
                      <tr><th>Services</th><td>{selectedPatientRecord.services.join(", ") || "N/A"}</td></tr>
                      <tr><th>Request Date</th><td>{selectedPatientRecord.appointmentDate || "N/A"}</td></tr>
                      <tr><th>Slot ID</th><td>{selectedPatientRecord.slotID || "N/A"}</td></tr>
                      <tr><th>Slot</th><td>{selectedPatientRecord.slot || "N/A"}</td></tr>
                      <tr><th>Status</th><td>{selectedPatientRecord.status}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdmin_Medical;
