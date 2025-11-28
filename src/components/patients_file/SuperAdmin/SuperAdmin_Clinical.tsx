import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaArrowLeft, FaEnvelope } from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";




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

const SuperAdmin_Clinical: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Appointment | null>(null);

  const notifications = [
    { id: 1, text: "New patient registered in Dental", unread: true },
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
 
  // Fetch appointments from Firestore
  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Clinical Laboratory")
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
  const canceledCount = appointments.filter((a) => a.status.toLowerCase() === "cancelled").length;


const [monthFilter, setMonthFilter] = useState<string>("");
const [yearFilter, setYearFilter] = useState<string>("");


useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" }); // "November"

  setYearFilter(currentYear);
  setMonthFilter(currentMonthName);
}, []); // run once on mount


const currentYear = new Date().getFullYear();

const [yearOptions, setYearOptions] = useState<number[]>(() => {
  const startYear = currentYear - 5;  
  const endYear = currentYear + 20;    
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
});


const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setYearFilter(e.target.value);
};
 
 
const filteredAppointments = appointments
  .filter((a) => {
  
    if (filter !== "all" && a.status.toLowerCase() !== filter) return false;

    // Exclude rejected completely (optional, pero recommended)
    if (a.status.toLowerCase() === "rejected") return false;

    // Date filter (year & month)
    if (!a.appointmentDate) return true;

    const [yearStr, monthStr] = a.appointmentDate.split("-");
    const appointmentYear = yearStr;
    const appointmentMonthNum = parseInt(monthStr);

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const appointmentMonthName = monthNames[appointmentMonthNum];

    if (yearFilter && yearFilter !== "" && appointmentYear !== yearFilter) {
      return false;
    }
    if (monthFilter && monthFilter !== "" && appointmentMonthName !== monthFilter) {
      return false;
    }

    return true;
  })

  .sort((a, b) => {
    if (!a.appointmentDate || !b.appointmentDate) return 0;
 
    return b.appointmentDate.localeCompare(a.appointmentDate);
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
      
  


      const [currentPage, setCurrentPage] = useState<number>(1);
const [rowsPerPage] = useState<number>(5); 


// PAGINATION LOGIC
const indexOfLastRecord = currentPage * rowsPerPage;
const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
const currentAppointments = filteredAppointments.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAppointments.length / rowsPerPage);

// Ellipsis pagination (same sa UserRequests)
const getPageNumbers = () => {
  const pages: (number | string)[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
    }
  }
  return pages;
};

useEffect(() => {
  setCurrentPage(1);
}, [filter, monthFilter, yearFilter]);

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

      {/* Main Content */}
      <main className="main-content-superadmin">
        {/* Top Navbar */}
        <div className="top-navbar-superadmin">
          <h5 className="navbar-title">Clinical Appointments</h5>
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

     

        {/* Date Filter */}
        <div className="filters-container-clinical">



        
             {/* Back Button */}
              <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
          <FaArrowLeft /> Back
        </button>

<div className="center-filters">
  <div className="filter-clinical">
  <label>Year:</label>
  <select value={yearFilter} onChange={handleYearChange}>
    <option value=""> Years</option>
    {yearOptions.map((year) => (
      <option key={year} value={year.toString()}>
        {year}
      </option>
    ))}
  </select>
</div>




          <div className="filter-clinical">
  <label>Month:</label>
  <select
    value={monthFilter}
    onChange={(e) => setMonthFilter(e.target.value)}
  >
    <option value="">All</option>
    {[
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ].map((m) => (
      <option key={m} value={m}>{m}</option>
    ))}
  </select>
</div>
</div>
  </div>
        

        {/* Summary Cards */}
        <div className="summary-cardss">
          
<div
  className={`summary-cardsss all ${filter === "all" ? "active" : ""}`}
  onClick={() => setFilter("all")}
>
  <h5>
    {pendingCount + approvedCount + completedCount + canceledCount}
  </h5>
  <p>All</p>
</div>
          <div
            className={`summary-cardsss pending ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <h5>{pendingCount}</h5>
            <p>Pending</p>
          </div>
          <div
            className={`summary-cardsss approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h5>{approvedCount}</h5>
            <p>Approved</p>
          </div>
          <div
            className={`summary-cardsss completed ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            <h5>{completedCount}</h5>
            <p>Completed</p>
          </div>
         

          <div
            className={`summary-cardsss canceled ${filter === "cancelled" ? "active" : ""}`}
            onClick={() => setFilter("cancelled")}
          >
            <h5>{canceledCount}</h5>
            <p>Canceled</p>
          </div>
        </div>

        {/* Table for appointments */}
        <div className="appointments-sectionssss">
          <h3 className="section-titlessss">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Appointments
          </h3>
          <table className="appointments-tablessss">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Middle Initial</th>
               
               
                <th>Services</th>
                <th>Appointment Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentAppointments.length > 0 ? (
               currentAppointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.UserId}</td>
                    <td>{a.patientCode}</td>
                    <td>{a.lastname}</td>
                    <td>{a.firstname}</td>
                    <td>{a.middleInitial || "N/A"}</td>
                   
                  
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



{/* PAGINATION */}
<div className="pagination-wrapper" style={{ marginTop: "30px", marginBottom: "20px" }}>
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAppointments.length)} of {filteredAppointments.length} appointments
  </div>

  <div className="pagination-controls">
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="pagination-btn prev-btn"
    >
      Previous
    </button>

    {getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        disabled={page === "..."}
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
      >
        {page}
      </button>
    ))}

    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0}
      className="pagination-btn next-btn"
    >
      Next
    </button>
  </div>
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
        
      </main>
    </div>
  );
};

export default SuperAdmin_Clinical;