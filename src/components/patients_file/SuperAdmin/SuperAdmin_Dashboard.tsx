import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaTooth,
   FaStethoscope, FaXRay, FaClinicMedical,  FaUserMd} from "react-icons/fa";
import "../../../assets/SuperAdmin_Dashboard.css";
import logo from "/logo.png";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";


const SuperAdmin_Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };
  

  const notifications = [
    { id: 1, text: "New patient registered in Dental", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ];


const patientUserData = [
  { name: "Clinical Patients", value: 150 },
  { name: "Dental Patients", value: 120 },
  { name: "Radiology Patients", value: 60 },
  { name: "Medical Patients", value: 150 },
  { name: "DDE Patients", value: 95 },
  { name: "Registered Users", value: 250 }
];
 

const adminDeptData = [
  { name: "Clinical Admins", value: 10 },
  { name: "Dental Admins", value: 5 },
  { name: "Radiology Admins", value: 10 },
  { name: "Medical Admins", value: 11 },
  { name: "DDE Admins", value: 6 }
];


const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA46BE"];

  const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, value, percent } = payload[0] as any; // percent is available here
    return (
      <div
        style={{
          background: "#fff",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        <p>{`${name}: ${value} (${percent ? (percent * 100).toFixed(0) : 0}%)`}</p>
      </div>
    );
  }
  return null;
};



  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="logo-boxss" onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}>
            <img src={logo} alt="logos" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>
          <div className="nav-linkss">
            <div className="nav-items active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
            </div>
            <div className="nav-items">
              <FaUsers className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>User Requests</span>
            </div>
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>Manage Admins</span>
            </div>
            <div className="nav-items">
              <FaChartBar className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_reports")}>Reports & Analytics</span>
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
                        onClick={() => {
                          const isConfirmed = window.confirm("Are you sure you want to sign out?");
                          if (isConfirmed) {
                            navigate("/loginadmin"); 
                          }
                        }}
                        className="signout-label"
                      >
                        Sign Out
                      </span>
                    </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content-superadmin">
        {/* Top Navbar */}
        <div className="top-navbar-superadmins">
          <h2 className="navbar-title">Dashboard</h2>
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
                      className={`notification-item ${
                        n.unread ? "unread" : ""
                      }`}
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

        {/* ✅ Summary Cards */}
        <div className="summary-cards-content-wrapper">
          <div className="summary-cards-container">
            <div className="summary-cards-row">
              <div className="summary-cards-row single">
            <div className="card" onClick={() => handleNavigation("/superadmin_clinical")}>
              <FaClinicMedical className="card-icon" />
              <h3>150</h3>
              <p>Total Clinical Patients</p>
            </div>


              <div className="card" onClick={() => handleNavigation("/superadmin_dental")}>
                <FaTooth className="card-icon" />
                <h3>120</h3>
                <p>Total Dental Patients</p>
              </div>
               <div className="card" onClick={() => handleNavigation("/superadmin_radiology")}>
                <FaXRay className="card-icon" />
                <h3>60</h3>
                <p>Total Radiology Patients</p>
              </div>


              <div className="card" onClick={() => handleNavigation("/superadmin_medical")}>
                <FaUserMd className="card-icon" />
               <h3>150</h3>
               <p>Total Medical Patients</p>
                </div>

              <div className="card" onClick={() => handleNavigation("/superadmin_dde")}>
                <FaStethoscope className="card-icon" />
                  <h3>95</h3>
                  <p>Total DDE Patients</p>
              </div>
             

             <div className="card" onClick={() => handleNavigation("/superadmin_users")}>
  <FaUsers className="card-icon" />
  <h3>250</h3>
  <p>Total Registered Users</p>
</div>

 <div className="card" onClick={() => handleNavigation("/superadmin_clinicaladmin")}>
  <FaClinicMedical className="card-icon" />
  <h3>10</h3>
  <p>Clinical Admins</p>
</div>

<div className="card">
  <FaTooth className="card-icon" />
  <h3>5</h3>
  <p>Dental Admins</p>
</div>

<div className="card">
  <FaXRay className="card-icon" />
  <h3>10</h3>
  <p>Radiology Admins</p>
</div>

<div className="card">
  <FaUserMd className="card-icon" />
  <h3>11</h3>
  <p>Medical Admins</p>
</div>

<div className="card">
  <FaStethoscope className="card-icon" />
  <h3>6</h3>
  <p>DDE Admins</p>
</div>
            </div>

          
          </div>
        </div>
      </div>

       

        {/* Charts Section */}
<div className="chart-activity-containers">
  <div className="chart-row">
  
<div className="chart-box">
  <h3 className="chart-titles">Patients per Department</h3>
  <ResponsiveContainer width="100%" height={400}>
    <PieChart width={400} height={400}>
 <Pie
  data={patientUserData}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={100}
  label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}

>
  {adminDeptData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
  ))}
</Pie>
<Tooltip content={<CustomTooltip />} />
<Legend />

 
</PieChart>
  </ResponsiveContainer>
</div>


    {/* Pie Chart for Admins per Department */}
    <div className="chart-box">
      <h3 className="chart-titles">Admins per Department</h3>
      <ResponsiveContainer width="100%" height={400}>
      <PieChart width={400} height={400}>
 <Pie
  data={adminDeptData}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={100}
  label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}

>
  {adminDeptData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
  ))}
</Pie>
<Tooltip content={<CustomTooltip />} />
<Legend />

 
</PieChart>


      </ResponsiveContainer>
    </div>
  </div>
</div>

      </main>
    </div>
  );
};

export default SuperAdmin_Dashboard;
