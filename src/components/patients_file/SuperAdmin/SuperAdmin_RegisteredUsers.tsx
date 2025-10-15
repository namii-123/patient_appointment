import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaUsers, FaSignOutAlt, FaArrowLeft, FaCalendarAlt, FaChartBar, FaSearch } from "react-icons/fa";
import "../../../assets/SuperAdmin_RegisteredUsers.css";
import logo from "/logo.png";
import type { ChangeEvent } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Types
interface User {
  id: string;
  UserId: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  email?: string;
  contact?: string;
  role?: string;
  gender?: string;
  birthdate?: string;
  age?: string;
  houseNo?: string;
  street?: string;
  province?: string;
  provinceCode?: string;
  municipality?: string;
  municipalityCode?: string;
  barangay?: string;
  zipcode?: string;
  photoBase64?: string;
}

const SuperAdmin_RegisteredUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");


  const notifications = [
    { id: 1, text: "New user registered", unread: true },
    { id: 2, text: "User role updated", unread: false },
  ];

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        const fetchUserDetails = async () => {
          const loadedUsers: User[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              const userId = docSnap.id;
              return {
                id: userId,
                UserId: data.UserId || "",
                lastname: data.lastName || "Unknown",
                firstname: data.firstName || "Unknown",
                middleInitial: data.middleName?.charAt(0) || "",
                email: data.email || "",
                contact: data.contactNumber || "",
                role: data.role || "User",
                gender: data.gender || "",
                birthdate: data.birthdate || "",
                age: data.age || "",
                houseNo: data.houseNo || "",
                street: data.street || "",
                province: data.province || "",
                provinceCode: data.provinceCode || "",
                municipality: data.municipality || "",
                municipalityCode: data.municipalityCode || "",
                barangay: data.barangay || "",
                zipcode: data.zipcode || "",
                photoBase64: data.photoBase64 || "",
              };
            })
          );
          setUsers(loadedUsers);
          setLoading(false);
        };
        fetchUserDetails();
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  

  const handleViewMore = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };


const filteredUsers = users.filter((u) => {
  const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
  return (
    u.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fullName.includes(searchTerm.toLowerCase())
  );
});

 


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
          <h2 className="navbar-title">Registered Users</h2>
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
        <button className="back-btns" onClick={() => handleNavigation("/superadmin_dashboard")}>
          <FaArrowLeft /> Back
        </button>

     
                  <div className="searchbar-containersss">
                    <div className="searchsss">
                      <FaSearch className="search-iconsss" />
                      <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        className="search-inputss"
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                 
                

        {/* Users Table */}
        <div className="appointments-sections">
          <h3 className="section-titles">All Registered Users</h3>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Middle Initial</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Action</th>
              </tr>
            </thead>
 <tbody>
  {filteredUsers.length > 0 ? (
    filteredUsers.map((u) => (
      <tr key={u.id}>
        <td>{u.UserId}</td>
        <td>{u.lastname}</td>
        <td>{u.firstname}</td>
        <td>{u.middleInitial || "N/A"}</td>
        <td>{u.email || "N/A"}</td>
        <td>{u.contact || "N/A"}</td>
        <td>
          <button
            className="action-button view-mores"
            onClick={() => handleViewMore(u)}
          >
            View More
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={7} style={{ textAlign: "center", padding: "12px" }}>
        {loading ? "Loading..." : "No matching users found."}
      </td>
    </tr>
  )}
</tbody>

          </table>
        </div>

        {/* View More Modal */}
{showModal && selectedUser !== null && (
  <div className="modal-overlayd">
    <div className="modal-contentd">
      <div className="modal-headerd">
        <h3>User Information</h3>
        <button className="close-btnd" onClick={closeModal}>×</button>
      </div>
      <div className="modal-bodyd">
        <table className="patient-info-tabled">
          <tbody>
            <tr><th>User ID</th><td>{selectedUser.UserId}</td></tr>
            <tr><th>Last Name</th><td>{selectedUser.lastname}</td></tr>
            <tr><th>First Name</th><td>{selectedUser.firstname}</td></tr>
            <tr><th>Middle Initial</th><td>{selectedUser.middleInitial || "N/A"}</td></tr>
            <tr><th>Email</th><td>{selectedUser.email || "N/A"}</td></tr>
            <tr><th>Contact Number</th><td>{selectedUser.contact || "N/A"}</td></tr>
            <tr><th>Role</th><td>{selectedUser.role || "N/A"}</td></tr>
            <tr><th>Gender</th><td>{selectedUser.gender || "Not set"}</td></tr>
            <tr><th>Birthdate</th><td>{selectedUser.birthdate || "Not set"}</td></tr>
            <tr><th>Age</th><td>{selectedUser.age || "Not set"}</td></tr>

            {/* Address - separated fields */}
            <tr><th>House No.</th><td>{selectedUser.houseNo || "Not set"}</td></tr>
            <tr><th>Street</th><td>{selectedUser.street || "Not set"}</td></tr>
            <tr><th>Barangay</th><td>{selectedUser.barangay || "Not set"}</td></tr>
            <tr><th>Municipality</th><td>{selectedUser.municipality || "Not set"}</td></tr>
            <tr><th>Province</th><td>{selectedUser.province || "Not set"}</td></tr>
            <tr><th>Zipcode</th><td>{selectedUser.zipcode || "Not set"}</td></tr>

            <tr>
              <th>Photo</th>
              <td>
                <img 
                  src={selectedUser.photoBase64 || "/default-img.jpg"} 
                  alt="User" 
                  style={{ maxWidth: "100px", borderRadius: "6px" }} 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

      </main>
    </div>
  );
};

export default SuperAdmin_RegisteredUsers;