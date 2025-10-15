import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../../../assets/SuperAdmin_UserRequests.css";
import logo from "/logo.png";
import { getFirestore, collection, onSnapshot, doc, Timestamp, setDoc, deleteDoc } from "firebase/firestore";
import emailjs from "@emailjs/browser";

interface Notification {
  text: string;
  unread: boolean;
}

interface UserRequest {
  id: string;
  adminId: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  status: "Pending" | "Rejected";
  department?: string;
  createdAt?: string | Timestamp;
}

const SuperAdmin_UserRequests: React.FC = () => {
  const navigate = useNavigate();
  const db = getFirestore();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"Approve" | "Reject" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new user access requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "UserAdmin"), (snapshot) => {
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          adminId: data.adminId || "",
          firstname: data.firstname || "",
          lastname: data.lastname || "",
          username: data.username || "",
          email: data.email || "",
          status: data.status === "pending"
            ? "Pending"
            : data.status === "rejected"
            ? "Rejected"
            : "Pending",
          department: data.department || "",
          createdAt: data.createdAt
            ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt)
            : null,
        } as UserRequest;
      });
      setUserRequests(requests);
    });
    return () => unsubscribe();
  }, [db]);

  const handleApprove = (id: string) => {
    setSelectedUserId(id);
    setSelectedAction("Approve");
    setShowModal(true);
  };

  const handleReject = (id: string) => {
    setSelectedUserId(id);
    setSelectedAction("Reject");
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedUserId || !selectedAction) return;

    const userDoc = doc(db, "UserAdmin", selectedUserId);
    const userRequest = userRequests.find((req) => req.id === selectedUserId);
    const manageAdminsCollection = collection(db, "ManageAdmins");

    try {
      if (selectedAction === "Approve") {
        if (!selectedDept) {
          toast.error("Please select a department before approving.", { position: "top-center" });
          return;
        }

        let role = "";
        switch (selectedDept) {
          case "Dental": role = "Dental Admin"; break;
          case "Medical": role = "Medical Admin"; break;
          case "Clinical Laboratory": role = "Clinical Admin"; break;
          case "Radiographic": role = "Radiographic Admin"; break;
          case "DDE": role = "DDE Admin"; break;
          default: role = "Staff";
        }

        await setDoc(doc(manageAdminsCollection, selectedUserId), {
          uid: userRequest?.id,
          adminId: userRequest?.adminId || "",
          firstname: userRequest?.firstname || "",
          lastname: userRequest?.lastname || "",
          username: userRequest?.username || "",
          email: userRequest?.email || "",
          department: selectedDept,
          role: role,
          status: "approved",
          isActive: true,
          createdAt: userRequest?.createdAt || Timestamp.now(),
        });
        await deleteDoc(userDoc);

        if (userRequest?.email) {
          await emailjs.send(
            "service_fvyid4o",
            "template_o7mlooj",
            {
              to_email: userRequest.email,
              user_name: `${userRequest.firstname} ${userRequest.lastname}`,
              admin_id: userRequest.adminId,
              department: selectedDept,
              role: role,
              message: `Department: ${selectedDept} \n\nCongratulations! Your request has been approved. You are assigned as ${role} under ${selectedDept} department.\nYou can now login to your account.`,
            },
            "gyNTIneY8SBg563r5"
          );
          toast.success("User approved and moved to Manage Admins.", { position: "top-center" });
        }
      } else if (selectedAction === "Reject") {
        if (!rejectReason.trim()) {
          toast.error("Please provide a reason for rejection.", { position: "top-center" });
          return;
        }

        await setDoc(doc(manageAdminsCollection, selectedUserId), {
          uid: userRequest?.id,
          adminId: userRequest?.adminId || "",
          firstname: userRequest?.firstname || "",
          lastname: userRequest?.lastname || "",
          username: userRequest?.username || "",
          email: userRequest?.email || "",
          department: "N/A",
          role: "N/A",
          status: "rejected",
          reason: rejectReason,
          isActive: false,
          createdAt: userRequest?.createdAt || Timestamp.now(),
        });
        await deleteDoc(userDoc);

        if (userRequest?.email) {
          await emailjs.send(
            "service_fvyid4o",
            "template_o7mlooj",
            {
              to_email: userRequest.email,
              user_name: `${userRequest.firstname} ${userRequest.lastname}`,
              admin_id: userRequest.adminId,
              reason: rejectReason,
              message: `We regret to inform you that your request has been rejected. \n\nReason: ${rejectReason}`,
            },
            "gyNTIneY8SBg563r5"
          );
          toast.success("User rejected and moved to Manage Admins.", { position: "top-center" });
        }
      }

      setShowModal(false);
      setSelectedAction(null);
      setSelectedUserId(null);
      setSelectedDept("");
      setRejectReason("");
    } catch (error) {
      console.error("Error processing user request:", error);
      toast.error("Failed to process user request. Please try again.", { position: "top-center" });
    }
  };

  const availableMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const availableDays = Array.from({ length: 31 }, (_, index) => index + 1);

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

  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");

  const filteredRequests = userRequests.filter((req) => {
    const matchesSearch =
      (req.lastname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.firstname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.adminId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ? true : req.status === statusFilter;

    let matchesDate = true;
    if (req.createdAt) {
      const dateObj =
        typeof req.createdAt === "string"
          ? new Date(req.createdAt)
          : (req.createdAt as Timestamp).toDate();

      const year = dateObj.getFullYear();
      const month = dateObj.toLocaleString("default", { month: "long" });
      const day = dateObj.getDate();

      if (yearFilter !== "All" && year.toString() !== yearFilter) {
        matchesDate = false;
      }
      if (monthFilter !== "All" && month !== monthFilter) {
        matchesDate = false;
      }
      if (dayFilter !== "All" && day.toString() !== dayFilter) {
        matchesDate = false;
      }
    } else {
      if (yearFilter !== "All" || monthFilter !== "All" || dayFilter !== "All") {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const displayedRequests = filteredRequests.slice(0, rowsPerPage === -1 ? filteredRequests.length : rowsPerPage);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <div
            className="logo-boxss"
            onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logos" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-items">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_dashboard")}>
                Dashboard
              </span>
            </div>
            <div className="nav-items active">
              <FaCalendarAlt className="nav-icon" />
              <span>User Requests</span>
            </div>
            <div className="nav-items">
              <FaUsers className="nav-icon" />
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
          </nav>
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

      <main className="main-contents">
        <div className="top-navbar-dentals">
          <h2 className="navbar-title">User Access Requests</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
            )}

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
                      {notif.unread && (
                        <span className="notification-badge">New</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    No new notifications
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="content-wrapper-requests">
          <div className="filter-barss">
            <div className="searchbar-containerss">
              <div className="searchss">
                <FaSearch className="search-iconss" />
                <input
                  type="text"
                  placeholder="Search by Name or ID..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

           

            <div className="filtersss">
              <label>Year:</label>
              <select
                className="status-dropdowns"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                onClick={handleYearClick}
              >
                <option value="All">All</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="filtersss">
              <label>Month:</label>
              <select
                className="status-dropdowns"
                value={monthFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setMonthFilter(e.target.value)}
              >
                <option value="All">All</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="filtersss">
              <label>Day:</label>
              <select
                className="status-dropdowns"
                value={dayFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setDayFilter(e.target.value)}
              >
                <option value="All">All</option>
                {availableDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="user-request-header">All User Access Requests</p>

          <table className="requests-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedRequests.length > 0 ? (
                displayedRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.adminId}</td>
                    <td>{req.lastname}</td>
                    <td>{req.firstname}</td>
                    <td>{req.username}</td>
                    <td>{req.email}</td>
                    <td>
                      {req.createdAt
                        ? typeof req.createdAt === "string"
                          ? new Date(req.createdAt).toLocaleString()
                          : (req.createdAt as Timestamp).toDate().toLocaleString()
                        : "N/A"}
                    </td>
                    <td className={`status-cell ${(req.status || "").toLowerCase()}`}>
                      {req.status}
                    </td>
                    <td>
                      {req.status === "Pending" && (
                        <div className="buttons">
                          <button className="approve-btn" onClick={() => handleApprove(req.id)}>
                            Approve
                          </button>
                          <button className="reject-btn" onClick={() => handleReject(req.id)}>
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "Rejected" && (
                        <span className="rejected-label">✘ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="no-data">
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="table-footer">
            <div className="rows-per-page">
              <label>Show </label>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rows-dropdown"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={-1}>All</option>
              </select>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>{selectedAction === "Approve" ? "Approve User" : "Reject User"}</h3>

              {selectedAction === "Approve" && (
                <>
                  <p>Select Department:</p>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="department-select"
                  >
                    <option value="">-- Choose Department --</option>
                    <option value="Radiographic">Radiographic</option>
                    <option value="Dental">Dental</option>
                    <option value="Clinical Laboratory">Clinical Laboratory</option>
                    <option value="Medical">Medical</option>
                    <option value="DDE">DDE</option>
                  </select>
                </>
              )}

              {selectedAction === "Reject" && (
                <>
                  <p>Reason for Rejection:</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="reason-textarea"
                    placeholder="Enter reason for rejection..."
                  />
                </>
              )}

              <div className="modal-actions">
                <button className="confirm-btn" onClick={confirmAction}>
                  Confirm
                </button>
                <button className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdmin_UserRequests;