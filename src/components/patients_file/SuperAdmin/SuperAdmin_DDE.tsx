import React, { useState } from "react";
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
} from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";

const SuperAdmin_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<string>("all");

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const notifications = [
    { id: 1, text: "New patient registered in Dental", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ];

    // inside SuperAdmin_ManageAdmins
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");

  // Example dental appointments (replace with backend data later)
  const ddeAppointments = [
  {
    id: 1,
    userId: "U-001",
    patientId: "P-001",
    lastname: "Doe",
    firstname: "John",
    middleInitial: "A",
    age: 25,
    gender: "Male",
    services: "Dental",
    appointmentDate: "2025-09-25",
    slot: "9:00 AM",
    status: "pending",
  },
  {
    id: 2,
    userId: "U-002",
    patientId: "P-002",
    lastname: "Smith",
    firstname: "Jane",
    middleInitial: "B",
    age: 30,
    gender: "Female",
    services: "Radiology",
    appointmentDate: "2025-09-26",
    slot: "10:00 AM",
    status: "approved",
  },
  {
    id: 3,
    userId: "U-003",
    patientId: "P-003",
    lastname: "Lee",
    firstname: "Michael",
    middleInitial: "C",
    age: 40,
    gender: "Male",
    services: "Check-up",
    appointmentDate: "2025-09-27",
    slot: "11:00 AM",
    status: "rejected",
  },
];



  // Count totals
  const pendingCount = ddeAppointments.filter((a) => a.status === "pending").length;
  const approvedCount = ddeAppointments.filter((a) => a.status === "approved").length;
  const completedCount = ddeAppointments.filter((a) => a.status === "completed").length;
  const rejectedCount = ddeAppointments.filter((a) => a.status === "rejected").length;
   const canceledCount = ddeAppointments.filter((a) => a.status === "canceled").length;


  const filteredAppointments = ddeAppointments.filter((a) => {
  
   if (filter !== "all" && a.status !== filter) return false;
 
   
   const [year, month, day] = a.appointmentDate.split("-");
 
   if (selectedYear && year !== selectedYear) return false;
   if (selectedMonth && month !== selectedMonth) return false;
   if (selectedDay && day !== selectedDay) return false;
 
   return true;
 });
 
 
 
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

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="logo-boxss">
            <img src={logo} alt="logo" className="logosss" />
            <span className="logo-text">HealthSys</span>
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
            <span className="signout-label">Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content-superadmin">
        {/* Top Navbar */}
        <div className="top-navbar-superadmin">
          <h2 className="navbar-title">DDE Appointments</h2>
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
                    onClick={() =>
                      notifications.forEach((n) => (n.unread = false))
                    }
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
      onChange={(e) => setSelectedMonth(e.target.value)}>
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
            <h3>{ddeAppointments.length}</h3>
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
  className={`summary-card canceled ${filter === "canceled" ? "active" : ""}`}
  onClick={() => setFilter("canceled")}
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
        <td>{a.userId}</td>
        <td>{a.patientId}</td>
        <td>{a.lastname}</td>
        <td>{a.firstname}</td>
        <td>{a.middleInitial}</td>
        <td>{a.age}</td>
        <td>{a.gender}</td>
        <td>{a.services}</td>
        <td>{a.appointmentDate}</td>
        <td>{a.slot}</td>
        <td>
          <span className={`status-badge ${a.status}`}>
            {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
          </span>
        </td>
        <td>
          <button className="action-button view-mores">View More</button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={12} style={{ textAlign: "center", padding: "12px" }}>
        No appointments found.
      </td>
    </tr>
  )}
</tbody>

  </table>
</div>


      </main>
    </div>
  );
};

export default SuperAdmin_DDE;
