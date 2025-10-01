import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "../../assets/Transaction.css";
import ShortUniqueId from "short-unique-id";

interface TransactionProps {
  onNavigate?: (
    targetView:
      | "profile"
      | "editprofile"
      | "transaction"
      | "allservices"
      | "calendar"
      | "confirm"
      | "labservices"
      | "radioservices"
      | "dental"
      | "medical"
      | "calendarlab"
      | "calendardental"
      | "calendarmedical"
      | "review"
  ) => void;
}

interface TransactionItem {
  id: string;
  transactionCode: string;
  purpose: string;
  services: string[];
  date: string;
  slotTime: string;
  slotID: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
  reservationId?: string; // Added to match AppointmentCalendar
}

const Transaction: React.FC<TransactionProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [filterDept, setFilterDept] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");
  const [filterDay, setFilterDay] = useState<string>("All");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setTransactions([]);
        return;
      }

      const transactionsQuery = query(
        collection(db, "Transactions"),
        where("uid", "==", user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(transactionsQuery, (snapshot) => {
        const data: TransactionItem[] = snapshot.docs.map((docSnap) => {
          const docData = docSnap.data();
          return {
            id: docSnap.id,
            transactionCode: docData?.transactionCode || "N/A",
            purpose: docData?.purpose || "N/A",
            date: docData?.date || "N/A",
            slotTime: docData?.slotTime || "N/A",
            slotID: docData?.slotID || "",
            status: docData?.status || "Pending",
            services: Array.isArray(docData?.services) ? docData.services : [],
            reservationId: docData?.reservationId || "", // Include reservationId
          };
        });
        setTransactions(data);
      }, (error) => {
        console.error("Error listening to transactions:", error);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleCancel = async (transactionId: string) => {
    const confirmCancel = window.confirm("Do you want to cancel your appointment?");
    if (!confirmCancel) return;

    try {
      await runTransaction(db, async (transaction) => {
        const transactionRef = doc(db, "Transactions", transactionId);
        const transactionSnap = await transaction.get(transactionRef);

        if (!transactionSnap.exists()) {
          console.warn("Transaction not found:", transactionId);
          throw new Error("Transaction not found.");
        }

        const transactionData = transactionSnap.data();
        const { purpose, date, slotID, reservationId } = transactionData;

        // Skip slot update if already Cancelled
        if (transactionData.status === "Cancelled") {
          console.warn("Transaction already cancelled:", transactionId);
          throw new Error("Appointment is already cancelled.");
        }

        // Update slot availability
        const slotRef = doc(db, "Departments", purpose, "Slots", date);
        const slotSnap = await transaction.get(slotRef);

        if (slotSnap.exists() && !slotSnap.data().closed) {
          const slots = slotSnap.data().slots || [];
          const slotIndex = slots.findIndex((s: any) => s.slotID === slotID);

          if (slotIndex !== -1) {
            slots[slotIndex].remaining = (slots[slotIndex].remaining || 0) + 1;
            const totalSlots = slots.reduce((sum: number, s: any) => sum + s.remaining, 0);

            transaction.update(slotRef, {
              slots,
              totalSlots,
              updatedAt: new Date().toISOString(),
            });
            console.log(`📌 Transaction: Incremented remaining for slot ${slotID} on ${date} in ${purpose}`);
          } else {
            console.warn(`Slot ${slotID} not found in ${slotRef.path}`);
          }
        } else {
          console.warn(`Slot document ${slotRef.path} does not exist or is closed`);
        }

        // Delete reservation if it exists
        if (reservationId) {
          const reservationRef = doc(db, "Departments", purpose, "Reservations", reservationId);
          const reservationSnap = await transaction.get(reservationRef);
          if (reservationSnap.exists()) {
            transaction.delete(reservationRef);
            console.log(`📌 Transaction: Deleted reservation ${reservationId}`);
          } else {
            console.warn(`Reservation ${reservationId} not found`);
          }
        }

        // Update transaction status
        transaction.update(transactionRef, {
          status: "Cancelled",
          updatedAt: new Date().toISOString(),
        });
      });

      alert("Your appointment has been cancelled, and the slot is now available.");
    } catch (error) {
      console.error("Error cancelling transaction:", error);
      alert("❌ Failed to cancel appointment. Please try again.");
    }
  };

  const parseDateTime = (dateStr: string, timeStr: string): number => {
    if (!dateStr || !timeStr) return 0;

    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      let [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (modifier?.toLowerCase() === "pm" && hours < 12) {
        hours += 12;
      }
      if (modifier?.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }

      const parsed = new Date(year, month - 1, day, hours, minutes || 0);
      return parsed.getTime();
    } catch {
      return 0;
    }
  };

  const statusOrder: Record<TransactionItem["status"], number> = {
    Pending: 1,
    Approved: 2,
    Completed: 3,
    Rejected: 4,
    Cancelled: 5,
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    const aDate = parseDateTime(a.date, a.slotTime);
    const bDate = parseDateTime(b.date, b.slotTime);
    return aDate - bDate;
  });

  const filteredTransactions = sortedTransactions.filter((t) => {
    const [y, m, d] = t.date.split("-");
    return (
      (filterDept === "All" || t.purpose === filterDept) &&
      (filterStatus === "All" || t.status === filterStatus) &&
      (filterYear === "All" || y === filterYear) &&
      (filterMonth === "All" || m === filterMonth) &&
      (filterDay === "All" || d === filterDay)
    );
  });

  return (
    <div className="appointment-container">
      <div className="appointment-header">
        <h2 className="section-title">TRANSACTIONS</h2>

        <div className="filters">
          <label style={{ marginRight: "10px" }}>
            Department:
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All Departments</option>
              <option value="Medical">Medical</option>
              <option value="Dental">Dental</option>
              <option value="Radiographic">Radiology</option>
              <option value="Clinical Laboratory">Clinical Laboratory</option>
              <option value="DDE">DDE</option>
            </select>
          </label>

          <label style={{ marginRight: "10px" }}>
            Status:
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>

          <label style={{ marginRight: "10px" }}>
            Year:
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All Years</option>
              {Array.from({ length: 2050 - 2000 + 1 }, (_, i) => 2000 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label style={{ marginRight: "10px" }}>
            Month:
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All Months</option>
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((month, i) => {
                const monthValue = String(i + 1).padStart(2, "0");
                return (
                  <option key={month} value={monthValue}>
                    {month}
                  </option>
                );
              })}
            </select>
          </label>

          <label>
            Day:
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All Days</option>
              {[...Array(31)].map((_, i) => {
                const day = String(i + 1).padStart(2, "0");
                return (
                  <option key={day} value={day}>
                    {day}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </div>

      <div className="appointment-table">
        <div className="appointment-row header">
          <div className="col no">Transaction ID</div>
          <div className="col detail">Details</div>
          <div className="col status">Status</div>
          <div className="col action">Action</div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="appointment-row">
            <div className="col details" style={{ textAlign: "center" }}>
              No transactions found.
            </div>
          </div>
        ) : (
          filteredTransactions.map((item) => (
            <div key={item.id} className="appointment-row">
              <div className="col nos">{item.transactionCode}</div>
              <div className="col details">
                <div className="detail-line">
                  <strong>Department:</strong> {item.purpose}
                </div>
                <div className="detail-line">
                  <strong>Slot ID:</strong> {item.slotID}
                </div>
                <div className="detail-line">
                  <strong>Appointment Date:</strong> {item.date}
                </div>
                <div className="detail-line">
                  <strong>Time Slot:</strong> {item.slotTime}
                </div>
                <div className="detail-line">
                  <strong>Services:</strong>
                  <div className="services-list">
                    {item.services.length > 0 ? (
                      <div className="service-badges">
                        {item.services.map((service, index) => (
                          <span key={index} className="service-badge">
                            {service}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="col status">
                <span className={`status ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>

              <div className="col action">
                {item.status === "Pending" && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancel(item.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transaction;