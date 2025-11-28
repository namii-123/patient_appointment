
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
import { X } from "lucide-react";


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
          createdAt: data.createdAt || null,
          replied: data.replied || false,
        } as Message;
      });

      // ✅ Sort by latest createdAt first (handles Timestamp or string)
      const sortedMessages = messageData.sort((a, b) => {
        const dateA =
          a.createdAt instanceof Timestamp
            ? a.createdAt.toDate().getTime()
            : a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;

        const dateB =
          b.createdAt instanceof Timestamp
            ? b.createdAt.toDate().getTime()
            : b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;

        return dateB - dateA;
      });

      setMessages(sortedMessages);
      setRepliedMessages(
        new Set(sortedMessages.filter((msg) => msg.replied).map((msg) => msg.id))
      );
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

const handleDelete = (messageId: string, previewText?: string) => {
  const displayText = previewText 
    ? `"${previewText.length > 60 ? previewText.slice(0, 60) + "..." : previewText}"`
    : "this message";

  openCustomModal(
    `Are you sure you want to delete ${displayText}?\n\nThis action cannot be undone.`,
    "confirm",
    async () => {
      try {
        await deleteDoc(doc(db, "Messages", messageId));

        // Update local state
        setRepliedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });

        // Success toast
        toast.success("Message deleted successfully!", { 
          position: "top-center" 
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        toast.error("Failed to delete message. Please try again.", {
          position: "top-center",
        });
      }
    }
  );
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

const [currentPage, setCurrentPage] = useState<number>(1);
// ← Ibutang diri ang useEffect
useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = now.toLocaleString("default", { month: "long" });

  setYearFilter(currentYear);
  setMonthFilter(currentMonth);
}, []);

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
     
    } else {
      if (yearFilter !== "All" || monthFilter !== "All" ) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesDate;
  });

  // PAGINATION LOGIC (same sa UserRequests)
const indexOfLastRecord = currentPage * rowsPerPage;
const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;

const currentMessages = rowsPerPage === -1
  ? filteredMessages
  : filteredMessages.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredMessages.length / rowsPerPage);



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

      <main className="main-contents">
        <div className="top-navbar-dentals">
          <h5 className="navbar-title">Messages</h5>
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
<div className="filter-group">
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
              {currentMessages.length > 0 ? (
                currentMessages.map((msg) => (
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

         {/* PAGINATION - SAME STYLE SA USER REQUESTS */}
<div className="pagination-wrapper" style={{ marginTop: "20px" }}>
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredMessages.length)} of {filteredMessages.length} messages
  </div>
  
  <div className="pagination-controls">
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1 || rowsPerPage === -1}
      className="pagination-btn prev-btn"
    >
      Previous
    </button>

    {getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        disabled={page === "..." || rowsPerPage === -1}
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
      >
        {page}
      </button>
    ))}

    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0 || rowsPerPage === -1}
      className="pagination-btn next-btn"
    >
      Next
    </button>
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

export default SuperAdmin_Messages;
