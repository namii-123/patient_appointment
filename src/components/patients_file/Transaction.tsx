import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "../../assets/Transaction.css";
import { X } from "lucide-react";

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
      | "review",
    data?: any
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
  reservationId?: string;
  patientId?: string;
  controlNo?: string;
  patientCode?: string;
  checklist?: {
    courtOrder: boolean;
    officialReceipt: boolean;
    requestForm: boolean;
    dataPrivacy: boolean;
    hasValidID: boolean;
    vitalSigns: boolean;
  };
  lastName?: string;
  firstName?: string;
  middleInitial?: string;
  validIDData?: any;
  courtOrderData?: any;
  paoData?: any;
  empData?: any;
  lawyersRequestData?: any;
  receiptData?: any;
  createdAt?: string; // Added createdAt field
}

interface NavigateData {
  patientId?: string;
  controlNo: string;
  patientCode: string;
  hasValidID?: boolean;
  department?: string;
  requestDate?: string;
  lastName?: string;
  firstName?: string;
  middleInitial?: string;
  checklist?: {
    courtOrder: boolean;
    officialReceipt: boolean;
    requestForm: boolean;
    dataPrivacy: boolean;
    hasValidID: boolean;
    vitalSigns: boolean;
  };
  validIDData?: any;
  courtOrderData?: any;
  paoData?: any;
  empData?: any;
  lawyersRequestData?: any;
  receiptData?: any;
  appointmentId?: string;
}

const Transaction: React.FC<TransactionProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [filterDept, setFilterDept] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");
  const [filterDay, setFilterDay] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);
const [modalMessage, setModalMessage] = useState("");
const [modalType, setModalType] = useState<"success" | "error" | "confirm">("confirm");
const [onModalConfirm, setOnModalConfirm] = useState<() => void>(() => {});


const openModal = (
  message: string,
  type: "success" | "error" | "confirm",
  onConfirm?: () => void
) => {
  setModalMessage(message);
  setModalType(type);
  if (onConfirm) setOnModalConfirm(() => onConfirm);
  setShowModal(true);
};

const closeModal = () => {
  setShowModal(false);
  setOnModalConfirm(() => {});
};


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
            date: docData?.date || "",
            slotTime: docData?.slotTime || "",
            slotID: docData?.slotID || "",
            status: docData?.status || "Pending",
            services: Array.isArray(docData?.services) ? docData.services : [],
            reservationId: docData?.reservationId || "",
            patientId: docData?.patientId || "",
            controlNo: docData?.controlNo || "",
            patientCode: docData?.patientCode || "",
            checklist: docData?.checklist || {
              courtOrder: false,
              officialReceipt: false,
              requestForm: false,
              dataPrivacy: false,
              hasValidID: false,
              vitalSigns: false,
            },
            lastName: docData?.lastName || "",
            firstName: docData?.firstName || "",
            middleInitial: docData?.middleInitial || "",
            validIDData: docData?.validIDData || null,
            courtOrderData: docData?.courtOrderData || null,
            paoData: docData?.paoData || null,
            empData: docData?.empData || null,
            lawyersRequestData: docData?.lawyersRequestData || null,
            receiptData: docData?.receiptData || null,
            createdAt: docData?.createdAt ? (docData.createdAt.toDate ? docData.createdAt.toDate().toISOString().split("T")[0] : docData.createdAt) : "", // Handle createdAt
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




useEffect(() => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear().toString();

  setFilterDay(day);
  setFilterMonth(month);
  setFilterYear(year);
}, []); 



const handleCancel = async (transactionId: string) => {
  openModal(
    "Do you want to cancel your appointment?",
    "confirm",
    async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const transactionRef = doc(db, "Transactions", transactionId);
          const transactionSnap = await transaction.get(transactionRef);

          if (!transactionSnap.exists()) {
            throw new Error("Transaction not found.");
          }

          const data = transactionSnap.data()!;
          const {
            purpose,
            date,
            slotID,
            reservationId,
            status,
            lastName,
            firstName,
            slotTime,
          } = data;

          if (status === "Cancelled") {
            throw new Error("Appointment is already cancelled.");
          }

          // === STEP 1: ALL READS FIRST ===
          let slotSnap = null;
          let reservationSnap = null;

          if (slotID && date) {
            const slotRef = doc(db, "Departments", purpose, "Slots", date);
            slotSnap = await transaction.get(slotRef);
          }

          if (reservationId) {
            const reservationRef = doc(db, "Departments", purpose, "Reservations", reservationId);
            reservationSnap = await transaction.get(reservationRef);
          }

          // === STEP 2: ALL WRITES AFTER ===
          // 1. Admin Notification
          const adminNotifRef = collection(db, "admin_notifications");
          transaction.set(doc(adminNotifRef), {
            type: "appointment_cancelled",
            message: `Appointment cancelled by patient: ${lastName}, ${firstName} on ${date} at ${slotTime}`,
            patientName: `${firstName} ${lastName}`,
            date,
            slotTime,
            purpose,
            transactionId,
            timestamp: new Date().toISOString(),
            read: false,
          });

          // 2. Re-open slot
          if (slotSnap?.exists() && !slotSnap.data().closed && slotID) {
            const slots = slotSnap.data().slots || [];
            const slotIndex = slots.findIndex((s: any) => s.slotID === slotID);
            if (slotIndex !== -1) {
              const updatedSlots = [...slots];
              updatedSlots[slotIndex].remaining = (updatedSlots[slotIndex].remaining || 0) + 1;
              const totalSlots = updatedSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);

              const slotRef = doc(db, "Departments", purpose, "Slots", date);
              transaction.update(slotRef, {
                slots: updatedSlots,
                totalSlots,
                updatedAt: new Date().toISOString(),
              });
            }
          }

          // 3. Delete reservation
          if (reservationSnap?.exists()) {
            const reservationRef = doc(db, "Departments", purpose, "Reservations", reservationId);
            transaction.delete(reservationRef);
          }

          // 4. Update transaction status
          transaction.update(transactionRef, {
            status: "Cancelled",
            updatedAt: new Date().toISOString(),
          });
        });

        openModal(
          "Your appointment has been cancelled!\n\nThe slot is now available for others.",
          "success"
        );
      } catch (error: any) {
        console.error("Cancel failed:", error);
        openModal(
          error.message || "Failed to cancel. Please try again.",
          "error"
        );
      }
    }
  );
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
    const [y, m, d] = t.date.split("-") || ["", "", ""];
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
        <h2  className="section-title">TRANSACTIONS</h2>
        <div className="filters">
          <label style={{ marginRight: "10px" }}>
            Department:
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="All">All</option>
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
              <option value="All">All</option>
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
    {(() => {
      const transactionYears = transactions
        .map(t => t.date.split("-")[0])
        .filter(Boolean)
        .map(Number);

      const latestYear = transactionYears.length > 0
        ? Math.max(...transactionYears)
        : new Date().getFullYear();

      const startYear = 2025;
      const endYear = latestYear + 20;

      const years = [];
      for (let y = endYear; y >= startYear; y--) {
        years.push(y);
      }

      return (
        <>
          {years.map(year => (
            <option key={year} value={year}>
              {year}  
            </option>
          ))}
          <option value="All">All</option>
        </>
      );
    })()}
  </select>
</label>
         <label style={{ marginRight: "10px" }}>
  Month:
  <select
    value={filterMonth}
    onChange={(e) => setFilterMonth(e.target.value)}
    style={{ marginLeft: "5px" }}
  >
    {(() => {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const current = new Date().getMonth();
      const recent: { name: string; value: string; }[] = [];

      for (let i = 0; i < 3; i++) {
        const idx = (current - i + 12) % 12;
        recent.push({ name: months[idx], value: String(idx + 1).padStart(2, "0") });
      }

      return (
        <>
          {recent.map(m => (
            <option key={m.value} value={m.value}>
              {m.name} 
            </option>
          ))}
          {months.map((m, i) => {
            const val = String(i + 1).padStart(2, "0");
            if (recent.some(r => r.value === val)) return null;
            return <option key={val} value={val}>{m}</option>;
          })}
          <option value="All">All</option>
        </>
      );
    })()}
  </select>
</label>
         <label>
  Day:
  <select
    value={filterDay}
    onChange={(e) => setFilterDay(e.target.value)}
    style={{ marginLeft: "5px" }}
  >
    {[...Array(2)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = String(d.getDate()).padStart(2, "0");
      return (
        <option key={day} value={day}>
          {day}  
        </option>
      );
    })}

    {[...Array(31)].map((_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const today = String(new Date().getDate()).padStart(2, "0");
      const yesterday = String(new Date().getDate() - 1).padStart(2, "0");
      if (day === today || day === yesterday) return null;
      return <option key={day} value={day}>{day}</option>;
    })}
    <option value="All">All</option>
  </select>
</label>
        </div>
      </div>
      <div className="appointment-table">
        <div className="appointment-row header">
          <div className="col no">Transaction ID</div>
          <div className="col detail">Details</div>
          <div className="col statuss">Status</div>
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
              <div className="col no">{item.transactionCode}</div>
              <div className="col details">
                <div className="detail-line">
                  <strong>Department:</strong> {item.purpose}
                </div>
                <div className="detail-line">
                  <strong>Control No.:</strong> {item.controlNo || "N/A"}
                </div>
                {item.purpose === "DDE" && item.status === "Rejected" ? (
                  item.createdAt && (
                    <div className="detail-line">
                      <strong>Appointment Date:</strong> {item.createdAt}
                    </div>
                  )
                ) : (
                  (item.purpose !== "DDE" || item.status !== "Pending") && item.date && (
                    <div className="detail-line">
                      <strong>Appointment Date:</strong> {item.date}
                    </div>
                  )
                )}
                {(item.purpose !== "DDE" || item.status !== "Pending") && item.slotID && (
                  <div className="detail-line">
                    <strong>Slot ID:</strong> {item.slotID}
                  </div>
                )}
                {(item.purpose !== "DDE" || item.status !== "Pending") && item.slotTime && (
                  <div className="detail-line">
                    <strong>Time Slot:</strong> {item.slotTime}
                  </div>
                )}
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
                    className="cancel-btnt"
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


      {/* TRANSACTION MODAL */}
{showModal && (
  <>
    <audio autoPlay>
      <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
    </audio>

    <div className="transaction-modal-overlay" onClick={closeModal}>
      <div className="transaction-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="transaction-modal-header">
          <img src="/logo.png" alt="DOH Logo" className="transaction-modal-logo" />
          <h3 className="transaction-modal-title">
  {modalType === "success" && "SUCCESS"}
  {modalType === "error" && "ERROR"}
  {modalType === "confirm" && "CONFIRM CANCELLATION"}
</h3>
          <button className="transaction-modal-close" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>

        <div className="transaction-modal-body">
          <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{modalMessage}</p>
        </div>

        <div className="transaction-modal-footer">
          {modalType === "confirm" && (
            <>
              <button className="transaction-modal-btn cancel" onClick={closeModal}>
                No, Keep It
              </button>
              <button
                className="transaction-modal-btn confirm"
                onClick={() => {
                  closeModal();
                  onModalConfirm();
                }}
              >
                Yes, Cancel
              </button>
            </>
          )}
          {(modalType === "success" || modalType === "error") && (
            <button className="transaction-modal-btn ok" onClick={closeModal}>
              {modalType === "success" ? "Done" : "OK"}
            </button>
          )}
        </div>
      </div>
    </div>
  </>
)}
    </div>
  );
};

export default Transaction;