import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUserTimes,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaTooth,
  FaStethoscope,
  FaXRay,
  FaClinicMedical,
  FaUserMd,
  FaEnvelope,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../../../assets/SuperAdmin_Dashboard.css";
import logo from "/logo.png";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 



interface DepartmentQuery {
  collection: string;
  department?: string;
  patientPurpose?: string;
  status?: string;
}

const departmentQueries: Record<string, DepartmentQuery> = {
  Clinical: {
    collection: "ManageAdmins",
    department: "Clinical Laboratory",
    patientPurpose: "Clinical Laboratory",
  },
  Dental: {
    collection: "ManageAdmins",
    department: "Dental",
    patientPurpose: "Dental",
  },
  Radiology: {
    collection: "ManageAdmins",
    department: "Radiographic",
    patientPurpose: "Radiographic",
  },
  Medical: {
    collection: "ManageAdmins",
    department: "Medical",
    patientPurpose: "Medical",
  },
  DDE: {
    collection: "ManageAdmins",
    department: "DDE",
    patientPurpose: "DDE",
  },
  Rejected: {
    collection: "ManageAdmins",
    status: "rejected",
  },
};

const SuperAdmin_Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminCounts, setAdminCounts] = useState({
    Clinical: 0,
    Dental: 0,
    Radiology: 0,
    Medical: 0,
    DDE: 0,
    Rejected: 0,
  });
  const [patientCounts, setPatientCounts] = useState({
    Clinical: 0,
    Dental: 0,
    Radiology: 0,
    Medical: 0,
    DDE: 0,
  });
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState(0);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New patient registered in Dental", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA46BE", "#FF4560"];
  const REGISTERED_USER_COLOR = "#FF4560";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percent } = payload[0];
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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setShowNotifications(false);
  };

  // Fetch total registered users
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        setTotalRegisteredUsers(snapshot.docs.length);
      },
      (error) => {
        console.error("Error fetching total registered users:", error);
        toast.error("Failed to fetch registered users: ${error.message}", {
          position: "top-center",
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch admin counts
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.entries(departmentQueries).forEach(([dept, queryConfig]) => {
      const { collection: coll, department, status } = queryConfig;
      const adminQuery = status
        ? query(collection(db, coll), where("status", "==", status))
        : query(collection(db, coll), where("department", "==", department));
      const unsubscribe = onSnapshot(
        adminQuery,
        (snap) => {
          const count = snap.docs.length;
          console.log(
            `[DEBUG] ${dept} count: ${count}, Query: collection=${coll}, status=${status || "N/A"}, department=${
              department || "N/A"
            }`
          );
          if (dept === "Rejected") {
            console.log(
              `[DEBUG] Rejected admins documents:`,
              snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
            if (count === 0) {
              console.log("[DEBUG] No rejected admins found in", coll);
            }
          }
          setAdminCounts((prev) => ({ ...prev, [dept]: count }));
        },
        (error) => {
          console.error(`Error fetching ${dept} admins:`, error);
          toast.error(`Failed to fetch ${dept} admins: ${error.message}`, {
            position: "top-center",
          });
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  // Fetch patient counts
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.entries(departmentQueries).forEach(([dept, queryConfig]) => {
      const { patientPurpose } = queryConfig;
      if (!patientPurpose) return;
      const transQuery = query(
        collection(db, "Transactions"),
        where("purpose", "==", patientPurpose)
      );
      const unsubscribe = onSnapshot(
        transQuery,
        (snap) => {
          const patientIds = new Set<string>();
          snap.forEach((doc) => {
            const data = doc.data();
            if (data.patientId) patientIds.add(data.patientId);
          });
          const count = patientIds.size;
          setPatientCounts((prev) => ({ ...prev, [dept]: count }));
        },
        (error) => {
          console.error(`Error fetching ${dept} patients:`, error);
          toast.error(`Failed to fetch ${dept} patients: ${error.message}`, {
            position: "top-center",
          });
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const patientUserData = [
    { name: "Clinical Patients", value: patientCounts.Clinical },
    { name: "Dental Patients", value: patientCounts.Dental },
    { name: "Radiology Patients", value: patientCounts.Radiology },
    { name: "Medical Patients", value: patientCounts.Medical },
    { name: "DDE Patients", value: patientCounts.DDE },
    { name: "Registered Users", value: totalRegisteredUsers },
  ];

  const adminDeptData = [
    { name: "Clinical Admins", value: adminCounts.Clinical },
    { name: "Dental Admins", value: adminCounts.Dental },
    { name: "Radiology Admins", value: adminCounts.Radiology },
    { name: "Medical Admins", value: adminCounts.Medical },
    { name: "DDE Admins", value: adminCounts.DDE },
    { name: "Rejected Admins", value: adminCounts.Rejected },
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div
            className="logo-boxss"
            onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>
          <div className="nav-linkss">
            <div className="nav-items active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
            </div>
            <div className="nav-items">
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
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-items">
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
                  <button className="mark-read-btn" onClick={markAllAsRead}>
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

        {/* Summary Cards */}
        <div className="summary-cards-content-wrapper">
          <div className="summary-cards-container">
            <div className="summary-cards-row">
              <div className="summary-cards-row single">
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_clinical")}
                >
                  <FaClinicMedical className="card-icon" />
                  <h3>{patientCounts.Clinical}</h3>
                  <p>Total Clinical Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dental")}
                >
                  <FaTooth className="card-icon" />
                  <h3>{patientCounts.Dental}</h3>
                  <p>Total Dental Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_radiology")}
                >
                  <FaXRay className="card-icon" />
                  <h3>{patientCounts.Radiology}</h3>
                  <p>Total Radiology Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_medical")}
                >
                  <FaUserMd className="card-icon" />
                  <h3>{patientCounts.Medical}</h3>
                  <p>Total Medical Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dde")}
                >
                  <FaStethoscope className="card-icon" />
                  <h3>{patientCounts.DDE}</h3>
                  <p>Total DDE Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_registeredusers")}
                >
                  <FaUsers className="card-icon" />
                  <h3>{totalRegisteredUsers}</h3>
                  <p>Total Registered Users</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_clinicaladmin")}
                >
                  <FaClinicMedical className="card-icon" />
                  <h3>{adminCounts.Clinical}</h3>
                  <p>Clinical Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dentaladmin")}
                >
                  <FaTooth className="card-icon" />
                  <h3>{adminCounts.Dental}</h3>
                  <p>Dental Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_radiologyadmin")}
                >
                  <FaXRay className="card-icon" />
                  <h3>{adminCounts.Radiology}</h3>
                  <p>Radiology Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_medicaladmin")}
                >
                  <FaUserMd className="card-icon" />
                  <h3>{adminCounts.Medical}</h3>
                  <p>Medical Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_ddeadmin")}
                >
                  <FaStethoscope className="card-icon" />
                  <h3>{adminCounts.DDE}</h3>
                  <p>DDE Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_rejectedadmins")}
                >
                  <FaUserTimes className="card-icon" />
                  <h3>{adminCounts.Rejected}</h3>
                  <p>Rejected Admins</p>
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
                    {patientUserData.map((entry, index) => {
                      const fillColor =
                        entry.name === "Registered Users"
                          ? REGISTERED_USER_COLOR
                          : COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={fillColor} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
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