import React, { useState } from "react";
import { FaInfoCircle, FaEnvelopeOpenText } from "react-icons/fa";
import "../../assets/Notifications.css";

interface Notification {
  id: number;
  text: string;
  read: boolean;
  timestamp: Date;
  icon?: React.ReactNode;
}

interface NotificationsProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  onNavigateBack?: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  notifications = [],
  onMarkAsRead = () => {},
  onDelete = () => {},
  onNavigateBack = () => {},
}) => {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(
    notifications.length > 0
      ? notifications
      : [
          {
            id: 1,
            text: "Your appointment has been approved!",
            read: false,
            timestamp: new Date(),
            icon: <FaInfoCircle />,
          },
          {
            id: 2,
            text: "Reminder: You have an appointment tomorrow.",
            read: true,
            timestamp: new Date(Date.now() - 3600000),
            icon: <FaInfoCircle />,
          },
        ]
  );

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD">("ALL");

  const handleMarkAsRead = (id: number) => {
    setLocalNotifs((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: !notif.read } : notif
      )
    );
    onMarkAsRead(id);
    setOpenMenuId(null);
  };

  const handleDelete = (id: number) => {
    setLocalNotifs((prev) => prev.filter((notif) => notif.id !== id));
    onDelete(id);
    setOpenMenuId(null);
  };

  const toggleMenu = (id: number) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const formatNotifTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hrs ago`;
    return timestamp.toLocaleString();
  };

  const filteredNotifs =
    activeTab === "ALL"
      ? localNotifs
      : localNotifs.filter((notif) => !notif.read);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2 className="notifications-title">
          <FaEnvelopeOpenText style={{ marginRight: "8px" }} />
          Notifications
        </h2>
      </div>

      {/* Filter Tabs */}
      <div className="tab-buttons">
        <button
          className={activeTab === "ALL" ? "tab active" : "tab"}
          onClick={() => setActiveTab("ALL")}
        >
          ALL
        </button>
        <button
          className={activeTab === "UNREAD" ? "tab active" : "tab"}
          onClick={() => setActiveTab("UNREAD")}
        >
          UNREAD
        </button>
      </div>

      {filteredNotifs.length === 0 ? (
        <p className="no-notifications">No notifications available...</p>
      ) : (
        <ul className="notifications-list">
          {filteredNotifs.map((notif) => (
            <li
              key={notif.id}
              className={`notification-item ${notif.read ? "read" : "unread"}`}
            >
              <div className="notif-left-icon">{notif.icon || <FaInfoCircle />}</div>

              <div className="notif-details">
                <p className="notif-text">{notif.text}</p>
                <p className="notif-time">{formatNotifTime(notif.timestamp)}</p>
              </div>

              <div className="notif-options">
                <div className="notif-dots" onClick={() => toggleMenu(notif.id)}>
                  ⋮
                </div>

                {openMenuId === notif.id && (
                  <div className="notif-dropdown-menu">
                    <button onClick={() => handleMarkAsRead(notif.id)}>
                      {notif.read ? "Mark as Unread" : "Mark as Read"}
                    </button>
                    <button onClick={() => handleDelete(notif.id)}>Delete</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
