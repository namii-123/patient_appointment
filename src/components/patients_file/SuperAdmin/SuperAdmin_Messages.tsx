
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
  FaSearch,
  FaEnvelope,
  FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";
import "../../../assets/SuperAdmin_UserRequests.css";
import logo from "/logo.png";
import { getFirestore, collection, onSnapshot, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 


interface Message {
  id: string;
  UserId: string | null;
  lastName: string;
  firstName: string;
  messages: string;
  email: string;
  createdAt?: string | Timestamp;
  replied?: boolean; // Added to track replied state
}

const SuperAdmin_Messages: React.FC = () => {
  const navigate = useNavigate();
  const db = getFirestore();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState<string>("");
  const [repliedMessages, setRepliedMessages] = useState<Set<string>>(new Set());

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState([
    { text: "New message received", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Messages"),
      (snapshot) => {
        const messageData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            UserId: data.UserId || null,
            lastName: data.lastName || "",
            firstName: data.firstName || "",
            messages: data.messages || "",
            email: data.email || "",
            createdAt: data.createdAt
              ? (data.createdAt.toDate
                  ? data.createdAt.toDate().toISOString()
                  : data.createdAt)
              : null,
            replied: data.replied || false, // Fetch replied status
          } as Message;
        });
        setMessages(messageData);
        // Update repliedMessages based on Firestore data
        setRepliedMessages(new Set(messageData.filter((msg) => msg.replied).map((msg) => msg.id)));
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages. Please try again.", {
          position: "top-center",
        });
      }
    );
    return () => unsubscribe();
  }, [db]);

  const handleReply = (message: Message) => {
    setSelectedMessage(message);
    setReplyContent("");
    setShowReplyModal(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      toast.error("Please enter a reply message.", { position: "top-center" });
      return;
    }

    try {
      await emailjs.send(
        "service_q2mudmf",
        "template_upm2n35",
        {
          to_email: selectedMessage.email,
          user_name: `${selectedMessage.firstName} ${selectedMessage.lastName}`,
          message: replyContent,
        },
        "vMPW3OOTfIbNkGQL2"
      );
      // Update Firestore with replied status
      await updateDoc(doc(db, "Messages", selectedMessage.id), {
        replied: true,
      });
      toast.success("Reply sent successfully!", { position: "top-center" });
      setRepliedMessages((prev) => new Set(prev).add(selectedMessage.id));
      setShowReplyModal(false);
      setSelectedMessage(null);
      setReplyContent("");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.", {
        position: "top-center",
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this message?");
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "Messages", messageId));
      toast.success("Message deleted successfully!", { position: "top-center" });
      setRepliedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message. Please try again.", {
        position: "top-center",
      });
    }
  };

  const availableMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      (msg.lastName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.firstName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.UserId || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (msg.createdAt) {
      const dateObj =
        typeof msg.createdAt === "string"
          ? new Date(msg.createdAt)
          : (msg.createdAt as Timestamp).toDate();

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

    return matchesSearch && matchesDate;
  });

  const displayedMessages = filteredMessages.slice(
    0,
    rowsPerPage === -1 ? filteredMessages.length : rowsPerPage
  );

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <div
            className="logo-boxss"
            onClick={() => navigate("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logos" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-items">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => navigate("/superadmin_dashboard")}>
                Dashboard
              </span>
            </div>
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => navigate("/superadmin_userrequests")}>
                User Requests
              </span>
            </div>
            <div className="nav-items active">
              <FaEnvelope className="nav-icon" />
              <span>Messages</span>
            </div>
            <div className="nav-items">
              <FaUsers className="nav-icon" />
              <span onClick={() => navigate("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-items">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/superadmin_reports")}>
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

      <main className="main-contents">
        <div className="top-navbar-dentals">
          <h2 className="navbar-title">Messages</h2>
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
                  <div className="notification-empty">No new notifications</div>
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
                  placeholder="Search by Name or User ID..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setMonthFilter(e.target.value)
                }
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setDayFilter(e.target.value)
                }
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

          <p className="user-request-header">All Messages</p>

          <table className="requests-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Message</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedMessages.length > 0 ? (
                displayedMessages.map((msg) => (
                  <tr key={msg.id}>
                    <td>{msg.UserId || "Anonymous"}</td>
                    <td>{msg.lastName}</td>
                    <td>{msg.firstName}</td>
                    <td className="message-cell">{msg.messages}</td>
                    <td>{msg.email}</td>
                    <td>
                      {msg.createdAt
                        ? typeof msg.createdAt === "string"
                          ? new Date(msg.createdAt).toLocaleString()
                          : (msg.createdAt as Timestamp).toDate().toLocaleString()
                        : "N/A"}
                    </td>
                    <td>
                      {msg.replied ? (
                        <button
                          className="delete-btn-message"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <FaTrash /> Delete
                        </button>
                      ) : (
                        <button
                          className="reply-btn"
                          onClick={() => handleReply(msg)}
                        >
                          Reply
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="no-data">
                    No messages found
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

        {showReplyModal && selectedMessage && (
          <div className="modal-overlay-message">
            <div className="modal-box-message">
              <h3>Reply to {selectedMessage.firstName} {selectedMessage.lastName}</h3>
              <p>Original Message: {selectedMessage.messages}</p>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="reply-textarea"
                placeholder="Type your reply here..."
                rows={5}
              />
              <div className="modal-actions-message">
                <button className="confirm-btn-message" onClick={sendReply}>
                  Send Reply
                </button>
                <button
                  className="cancel-btn-message"
                  onClick={() => setShowReplyModal(false)}
                >
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

export default SuperAdmin_Messages;
