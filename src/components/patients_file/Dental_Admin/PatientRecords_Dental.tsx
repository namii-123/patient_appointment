import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent } from "react";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaSearch,
  FaTimes,
  FaClock,
  FaStethoscope,
} from "react-icons/fa";
import "../../../assets/PatientRecords_Radiology.css";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

interface PatientRecord {
  id: string;
  UserId: string;
  patientId: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
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
  date: string;
  slotTime: string;
  slotID: string;
  purpose: string;
  status: "Approved" | "Rejected" | "Completed";
}

interface Notification {
  text: string;
  unread: boolean;
}

const PatientRecords_Dental: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");
  const [dayFilter, setDayFilter] = useState<string>("All");
 


  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  useEffect(() => {
    const fetchPatientRecords = async () => {
      setLoading(true);
      try {
        
        const transQuery = query(
          collection(db, "Transactions"),
          where("purpose", "==", "Dental"),
          where("status", "in", ["Approved", "Rejected", "Completed"]) 
        );
        const transSnap = await getDocs(transQuery);
        const loaded: PatientRecord[] = [];

        for (const t of transSnap.docs) {
          const tData = t.data();

          let patientData: any = {
            UserId: " ",
            lastName: "Unknown",
            firstName: "Unknown",
            middleInitial: "Unknown",
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

            let userId = " ";
                if (tData.uid) {
                  const userRef = doc(db, "Users", tData.uid);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    userId = userSnap.data().UserId || " ";
                  }
                }


          if (tData.patientId) {
            const pRef = doc(db, "Patients", tData.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              patientData = pSnap.data();
              console.log(`Fetched patient data for ID ${tData.patientId}:`, patientData);
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
            lastName: patientData.lastName || "Unknown",
            firstName: patientData.firstName || "Unknown",
            middleInitial: patientData.middleInitial || "Unknown",
            age: patientData.age || 0,
            gender: patientData.gender || "",
            services: Array.isArray(tData.services) ? tData.services : [],
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
            date: tData.date || "",
            slotTime: tData.slotTime|| "",
            slotID: tData.slotID || " ",
            purpose: tData.purpose || " ",
            status: tData.status || "Approved",
          });
        }

        console.log("Loaded patient records:", loaded);
        setPatientRecords(loaded);
      } catch (error) {
        console.error("Error fetching patient records:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientRecords();
  }, []);

  const handleAction = (action: string, patientRecord: PatientRecord) => {
    setSelectedPatientRecord(patientRecord);
    if (action === "Completed" && patientRecord.status === "Approved") {
      setShowCompletedModal(true);
    } else if (action === "View Record") {
      setShowRecordModal(true);
    } else {
      console.log(`${action} patient record with ID: ${patientRecord.id}`);
    }
  };

  const confirmCompleted = async () => {
    if (selectedPatientRecord) {
      try {
        const ref = doc(db, "Transactions", selectedPatientRecord.id);
        await updateDoc(ref, { status: "Completed" });

       
        setPatientRecords((prev) =>
          prev.map((rec) =>
            rec.id === selectedPatientRecord.id
              ? { ...rec, status: "Completed" }
              : rec
          )
        );

        console.log(`Marked as completed: ${selectedPatientRecord.id}`);
      } catch (error) {
        console.error("Error marking as completed:", error);
        alert("❌ Error marking as completed. Please try again.");
      }
    }
    setShowCompletedModal(false);
    setSelectedPatientRecord(null);
  };

  const filteredPatientRecords = patientRecords.filter((rec) => {
    const fullName = `${rec.firstName} ${rec.lastName} ${rec.middleInitial || ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      rec.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    // Extract date parts (assume format YYYY-MM-DD)
    const [year, month, day] = rec.date.split("-");

    const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
    const matchesYear = yearFilter === "All" || year === yearFilter;
    const matchesMonth = monthFilter === "All" || month === monthFilter;
    const matchesDay = dayFilter === "All" || day === dayFilter;

    return matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesDay;
  });




  const [availableYears, setAvailableYears] = useState(() => {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i);
    });
  
    const handleYearClick = () => {
      const maxYear = Math.max(...availableYears);
      const currentYear = new Date().getFullYear();
      if (maxYear < currentYear + 50) {
       
        const newYears = Array.from({ length: 10 }, (_, i) => maxYear + i + 1);
        setAvailableYears((prev) => [...prev, ...newYears]);
      }
    };


  return (
    <div className="dashboards">
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => navigate("/dashboard_dental")}
            style={{ cursor: "pointer" }}
          >
            <img src="/logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">DENTAL</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => navigate("/dashboard_dental")}>Dashboard</span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => navigate("/appointments_dental")}>Appointments</span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Patient Records</span>
            </div>
             <div className="nav-item">
              <FaClock className="nav-icon" />
             <span onClick={() => navigate("/manageslots_dental")}>Manage Slots</span>
            </div>


             <div className="nav-item">
                 <FaStethoscope className="nav-icon" />
                       <span onClick={() => navigate("/services_clinical")}>
                          Services
                       </span>
              </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/reports&analytics_dental")}>Reports & Analytics</span>
            </div>
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

      <main className="main-content">
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Patient Records</h5>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  notifications.map((notif, index) => (
                    <div
                      key={index}
                      className={`notification-item ${notif.unread ? "unread" : ""}`}
                    >
                      <span>{notif.text}</span>
                      {notif.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="content-wrapper">
          <div className="filter-barr">
            <div className="search-containerrr">
              <div className="search-bar-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Name or Number..."
                  className="search-bar"
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="filter">
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="filter">
      <label>Year:</label>
      <select
        className="status-dropdown"
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        onClick={handleYearClick} 
      >
        <option value="All Years">All Years</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
            <div className="filter">
              <label>Month:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All">All Months</option>
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
            <div className="filter">
              <label>Day:</label>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All">All Days</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="appointments-heading">All Accepted Appointments</p>

          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Patient ID</th>
                  <th>Lastname</th>
                  <th>Firstname</th>
                  
                  <th>Services</th>
                  <th>Appointment Date</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatientRecords.length > 0 ? (
                  filteredPatientRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>{rec.UserId}</td>
                      <td>{rec.patientCode}</td>
                      <td>{rec.lastName}</td>
                      <td>{rec.firstName}</td>
                     
                      <td>{rec.services.join(", ")}</td>
                      <td>{rec.date}</td>
                      <td>{rec.slotTime}</td>
                      <td>
                        <span className={`status-text ${rec.status.toLowerCase()}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.status === "Approved" && (
                          <button
                            onClick={() => handleAction("Completed", rec)}
                            className="action-btns completed"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleAction("View Record", rec)}
                          className="action-btns view"
                        >
                          View More
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="no-records">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Mark as Completed</h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>{`${selectedPatientRecord?.lastName}, ${selectedPatientRecord?.firstName}`}</strong>{" "}
              as completed?
            </p>
            <div className="modal-buttons">
              <button onClick={confirmCompleted} className="modal-confirm">
                Yes
              </button>
              <button onClick={() => setShowCompletedModal(false)} className="modal-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecordModal && selectedPatientRecord && (
        <div className="modal-overlay">
          <div className="modal-boxs record-modal">
            <button
              className="modal-close-icon"
              onClick={() => setShowRecordModal(false)}
            >
              <FaTimes />
            </button>
            <h3>Patient Information</h3>
            <div className="modal-contentss">
              <table className="info-table">
                <tbody>
                  <tr>
                    <th>User ID</th>
                    <td>{selectedPatientRecord.UserId}</td>
                  </tr>
                  <tr>
                    <th>Patient ID</th>
                    <td>{selectedPatientRecord.patientCode}</td>
                  </tr>
                  <tr>
                    <th>Control No.</th>
                    <td>{selectedPatientRecord.controlNo}</td>
                  </tr>
                  <tr>
                    <th>Last Name</th>
                    <td>{selectedPatientRecord.lastName}</td>
                  </tr>
                  <tr>
                    <th>First Name</th>
                    <td>{selectedPatientRecord.firstName}</td>
                  </tr>
                  <tr>
                    <th>Middle Initial</th>
                    <td>{selectedPatientRecord.middleInitial || "N/A"}</td>
                  </tr>
                  <tr>
                    <th>Birthdate</th>
                    <td>{selectedPatientRecord.birthdate}</td>
                  </tr>
                  <tr>
                    <th>Age</th>
                    <td>{selectedPatientRecord.age}</td>
                  </tr>
                  <tr>
                    <th>Gender</th>
                    <td>{selectedPatientRecord.gender}</td>
                  </tr>
                  <tr>
                    <th>Citizenship</th>
                    <td>{selectedPatientRecord.citizenship}</td>
                  </tr>
                  <tr className="section-header">
                    <th colSpan={2}>Address</th>
                  </tr>
                  <tr>
                    <th>House No.</th>
                    <td>{selectedPatientRecord.houseNo}</td>
                  </tr>
                  <tr>
                    <th>Street</th>
                    <td>{selectedPatientRecord.street}</td>
                  </tr>
                  <tr>
                    <th>Barangay</th>
                    <td>{selectedPatientRecord.barangay}</td>
                  </tr>
                  <tr>
                    <th>Municipality</th>
                    <td>{selectedPatientRecord.municipality}</td>
                  </tr>
                  <tr>
                    <th>Province</th>
                    <td>{selectedPatientRecord.province}</td>
                  </tr>
                  <tr>
                    <th>Email</th>
                    <td>{selectedPatientRecord.email}</td>
                  </tr>
                  <tr>
                    <th>Contact</th>
                    <td>{selectedPatientRecord.contact}</td>
                  </tr>
                  <tr>
                    <th>Department</th>
                    <td>{selectedPatientRecord.purpose}</td>
                  </tr>
                  <tr>
                    <th>Services</th>
                    <td>{selectedPatientRecord.services.join(", ")}</td>
                  </tr>
                  <tr>
                    <th>Appointment Date</th>
                    <td>{selectedPatientRecord.date}</td>
                  </tr>
                   <tr>
                    <th>Slot ID</th>
                    <td>{selectedPatientRecord.slotID}</td>
                  </tr>
                  <tr>
                    <th>Slot</th>
                    <td>{selectedPatientRecord.slotTime}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>{selectedPatientRecord.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords_Dental;