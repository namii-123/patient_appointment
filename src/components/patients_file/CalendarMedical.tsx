import React, { useState, useEffect } from "react";
import "../../assets/AppointmentCalendar.css";
import { X, CheckCircle } from "lucide-react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  runTransaction,
} from "firebase/firestore";
import ShortUniqueId from "short-unique-id";

interface CalendarMedicalProps {
  formData?: {
    patientId: string;
    appointmentId: string;
    fromReview?: boolean;
    previousDate?: string;
    previousSlotId?: string;
    previousSlotTime?: string;
    previousReservationId?: string;
    [key: string]: any;
  };
  onNavigate?: (
    targetView: "review" | "allservices" | "calendar" | "labservices" | "radioservices" | "dental" | "medical" | "transaction",
    data?: any
  ) => void;
}

interface Slot {
  slotID: string;
  time: string;
  remaining: number;
}

const predefinedTimes = [
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "13:00 PM - 14:00 PM",
  "14:00 PM - 15:00 PM",
];

const CalendarMedical: React.FC<CalendarMedicalProps> = ({ formData, onNavigate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uid = new ShortUniqueId({ length: 10 });
  const department = "Medical";

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [daysInfo, setDaysInfo] = useState<{ day: number; weekday: string }[]>([]);

  const [dayStatus, setDayStatus] = useState<
    Record<number, { unlimited: boolean; closed: boolean; totalSlots: number; slots?: Slot[] }>
  >({});

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ slotID: string; time: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);

  // Reusable Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirmAction, setOnConfirmReview] = useState<() => void>(() => {});

  const openModal = (
    msg: string,
    type: "confirm" | "error" | "success" = "confirm",
    callback?: () => void
  ) => {
    setModalMessage(msg);
    setModalType(type);
    if (callback) setOnConfirmReview(() => callback);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setOnConfirmReview(() => {});
  };

  // Load calendar + real-time status
  useEffect(() => {
    const totalDays = new Date(year, month, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return { day: i + 1, weekday: date.toLocaleDateString("en-US", { weekday: "short" }) };
    });
    setDaysInfo(days);

    const unsubs: (() => void)[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const ref = doc(db, "Departments", department, "Slots", dateKey);

      const unsub = onSnapshot(ref, (snap) => {
        let status: any = {
          unlimited: true,
          closed: false,
          totalSlots: 999,
          slots: [],
        };

        if (snap.exists()) {
          const data = snap.data()!;
          if (data.closed) {
            status = { unlimited: false, closed: true, totalSlots: 0 };
          } else if (data.unlimited) {
            status = { unlimited: true, closed: false, totalSlots: 999 };
          } else {
            const slots = (data.slots || []) as Slot[];
            const total = slots.reduce((sum, s) => sum + s.remaining, 0);
            status = { unlimited: false, closed: false, totalSlots: total, slots };
          }
        }

        setDayStatus((prev) => ({ ...prev, [d]: status }));
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach((u) => u());
  }, [year, month]);

  // Select Date
  const handleSelectDate = async (day: number) => {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, day);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isPast = dateObj < today;

    if (isWeekend) return openModal("Weekends are closed.", "error");
    if (isPast) return openModal("Cannot select past dates.", "error");

    const status = dayStatus[day];
    if (!status) return;
    if (status.closed) return openModal("This date is closed by admin.", "error");

    const ref = doc(db, "Departments", department, "Slots", dateKey);
    const snap = await getDoc(ref);

    let slots: Slot[] = [];

    if (snap.exists()) {
      const data = snap.data()!;

      if (data.unlimited) {
        slots = predefinedTimes.map((time) => ({
          slotID: `SLOT-${uid.randomUUID()}`,
          time,
          remaining: 999,
        }));
      } else if (data.closed) {
        openModal("This date is closed.", "error");
        return;
      } else {
        slots = (data.slots || []).map((s: any) => ({
          ...s,
          slotID: s.slotID?.startsWith("SLOT-") ? s.slotID : `SLOT-${uid.randomUUID()}`,
        }));
      }
    } else {
      // First time → create default limited slots (Medical = 3 per slot)
      slots = predefinedTimes.map((time) => ({
        slotID: `SLOT-${uid.randomUUID()}`,
        time,
        remaining: 3,
      }));
    }

    setSelectedDate(dateKey);
    setTimeSlots(slots);
    setSelectedSlot(null);
    setShowModal(true);
    setError(null);
  };

  // Select Time Slot
  const handleSelectSlot = async (slotTime: string) => {
    if (!selectedDate || !selectedSlot) return;

    const slotRef = doc(db, "Departments", department, "Slots", selectedDate);
    const slotSnap = await getDoc(slotRef);

    if (!slotSnap.exists() || slotSnap.data()?.closed) {
      openModal("This date is no longer available.", "error");
      setShowModal(false);
      return;
    }

    const isUnlimited = slotSnap.data()?.unlimited === true;
    const targetSlot = timeSlots.find((s) => s.time === slotTime);

    if (!targetSlot) {
      openModal("Slot not found.", "error");
      return;
    }

    if (!isUnlimited && targetSlot.remaining <= 0) {
      openModal("This time slot is fully booked.", "error");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // Delete old draft reservation
        if (formData?.previousReservationId) {
          const oldResRef = doc(db, "Departments", department, "Reservations", formData.previousReservationId);
          transaction.delete(oldResRef);
        }

        // Create new draft reservation
        const newResRef = doc(collection(db, "Departments", department, "Reservations"));
        transaction.set(newResRef, {
          slotID: targetSlot.slotID,
          date: selectedDate,
          time: slotTime,
          appointmentId: formData!.appointmentId,
          patientId: formData!.patientId,
          status: "draft",
          createdAt: new Date().toISOString(),
        });

        // Update main appointment
        transaction.update(doc(db, "Appointments", formData!.appointmentId), {
          department,
          date: selectedDate,
          slotID: targetSlot.slotID,
          slotTime: slotTime,
          reservationId: newResRef.id,
          status: "pending",
          updatedAt: new Date().toISOString(),
        });
      });

      setReservationId(targetSlot.slotID);
      setShowModal(false);
      openModal(`Medical slot selected!\n${slotTime}\nYou can change this later.`, "success");
    } catch (err: any) {
      console.error("Select slot error:", err);
      openModal("Failed to select slot. Please try again.", "error");
    }
  };

  return (
    <div className="calendar-container pb-24">
      <h2>Select Appointment Date (Medical)</h2>
      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      {/* Month/Year Controls */}
      <div className="calendar-controls">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            setYear(y);
            if (y === maxYear) setMaxYear(maxYear + 20);
          }}
        >
          {Array.from({ length: maxYear - today.getFullYear() + 1 }, (_, i) => today.getFullYear() + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-wrapper">
        <div className="weekday-headers">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="weekday-header">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}

          {daysInfo.map(({ day, weekday }) => {
            const date = new Date(year, month - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPast = date < today;
            const status = dayStatus[day] || { unlimited: true, closed: false, totalSlots: 999 };
            const isSelected = selectedDate?.endsWith(`-${String(day).padStart(2, "0")}`);

            const disabled = isWeekend || isPast || status.closed || (!status.unlimited && status.totalSlots === 0);
            const display = isWeekend ? "Closed" : isPast ? "Past" : status.closed ? "Closed" : status.unlimited ? "Unlimited" : `${status.totalSlots} slots`;

            return (
              <div
                key={day}
                className={`calendar-day ${disabled ? "fully-booked" : ""} ${isSelected ? "selected-date" : ""}`}
                onClick={() => !disabled && handleSelectDate(day)}
              >
                <p className="day-number">{day}</p>
                <small className="weekday">{weekday}</small>
                <span className="slots-info">{display}</span>
                {isSelected && selectedSlot && <CheckCircle className="selected-checkmark" size={16} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Slot Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal relative">
            <button className="close-buttons absolute top-3 right-3" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-center">
              Available Time Slots - {selectedDate}
            </h3>
            <div className="time-slots-grid">
              {timeSlots.map((slot) => {
                const isUnlimited = dayStatus[parseInt(selectedDate!.split("-")[2])]?.unlimited;
                const remaining = isUnlimited ? 999 : slot.remaining;

                return (
                  <button
                    key={slot.slotID}
                    disabled={remaining === 0}
                    className={`time-slot-btn ${selectedSlot?.slotID === slot.slotID ? "selected" : ""} ${remaining === 0 ? "disabled" : ""}`}
                    onClick={() => setSelectedSlot({ slotID: slot.slotID, time: slot.time })}
                  >
                    {slot.time} {isUnlimited ? "(Unlimited)" : `(${remaining} left)`}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex justify-center">
              <button
                disabled={!selectedSlot}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold disabled:bg-gray-400"
                onClick={() => {
                  if (selectedSlot) {
                    openModal(
                      `Confirm Medical slot?\n${selectedSlot.time}\n\nYou can change this later.`,
                      "confirm",
                      () => handleSelectSlot(selectedSlot.time)
                    );
                  }
                }}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="calendar-navigation">
        <div className="nav-right">
          <button
            className={`next-btn ${!selectedDate || !selectedSlot ? "disabled" : ""}`}
            disabled={!selectedDate || !selectedSlot}
            onClick={() => {
              const msg = formData?.fromReview
                ? `Update Medical appointment?\n\n${selectedDate} | ${selectedSlot?.time}\n\nReturn to review?`
                : `Proceed to Review?\n\n${selectedDate} | ${selectedSlot?.time}`;

              openModal(msg, "confirm", () => {
                const data = {
                  ...formData,
                  medicalDate: selectedDate,
                  medicalSlotId: selectedSlot!.slotID,
                  medicalSlotTime: selectedSlot!.time,
                  medicalReservationId: reservationId || "",
                };
                onNavigate?.("review", data);
              });
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Reusable Confirm Modal */}
      {showConfirmModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
          </audio>
          <div className="modal-overlay-servicess" onClick={closeConfirmModal}>
            <div className="modal-content-servicess" onClick={e => e.stopPropagation()}>
              <div className="modal-header-servicess">
                <img src="/logo.png" alt="Logo" className="modal-logo" />
                <h5>{modalType === "success" ? "SUCCESS" : modalType === "error" ? "ERROR" : "CONFIRM ACTION"}</h5>
              </div>
              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center", fontWeight: "600" }}>
                  {modalMessage}
                </p>
              </div>
              <div className="modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="modal-btn cancel" onClick={closeConfirmModal}>Cancel</button>
                    <button className="modal-btn confirm" onClick={() => { closeConfirmModal(); onConfirmAction(); }}>
                      Confirm
                    </button>
                  </>
                )}
                {(modalType === "error" || modalType === "success") && (
                  <button className="modal-btn ok" onClick={closeConfirmModal}>OK</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarMedical;