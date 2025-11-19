import React, { useState, useEffect } from "react";
import "../../assets/AppointmentCalendar.css";
import { X, CheckCircle } from "lucide-react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  collection,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import ShortUniqueId from "short-unique-id";

interface CalendarClinicalLabProps {
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
    targetView: "allservices" | "calendar" | "labservices" | "radioservices" | "dental" | "review",
    data?: any
  ) => void;
  onConfirm?: (date: string, slotId: string) => void;
}

interface Slot {
  slotID: string;
  time: string;
  remaining: number;
}

const predefinedSlots: { time: string; capacity: number }[] = [
  { time: "8:00 AM - 9:00 AM", capacity: 3 },
  { time: "9:00 AM - 10:00 AM", capacity: 3 },
  { time: "10:00 AM - 11:00 AM", capacity: 3 },
  { time: "11:00 AM - 12:00 PM", capacity: 2 },
  { time: "13:00 PM - 14:00 PM", capacity: 2 },
  { time: "14:00 PM - 15:00 PM", capacity: 2 },
];

const CalendarClinicalLab: React.FC<CalendarClinicalLabProps> = ({
  formData,
  onConfirm,
  onNavigate,
}) => {
  const today = new Date();
  const uidGenerator = new ShortUniqueId({ length: 8 });
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [daysInfo, setDaysInfo] = useState<{ day: number; weekday: string }[]>([]);
  const [slots, setSlots] = useState<{ [key: number]: number }>({});
  const [isClosed, setIsClosed] = useState<{ [key: number]: boolean }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ slotID: string; time: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);
  const [error, setError] = useState<string | null>(null);

  // MODAL STATES
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});

  const department = "Clinical Laboratory";

  // REUSABLE MODAL OPENER
  const openModal = (
    msg: string,
    type: "confirm" | "error" | "success",
    callback?: () => void
  ) => {
    setModalMessage(msg);
    setModalType(type);
    if (callback) setOnConfirmAction(() => callback);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setOnConfirmAction(() => {});
  };

  useEffect(() => {
    if (!formData?.patientId || !formData?.appointmentId) {
      setError("Invalid appointment data. Please try again.");
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setShowModal(false);
    setReservationId(null);
    setError(null);
  }, [formData]);

  useEffect(() => {
    const totalDays = new Date(year, month, 0).getDate();
    const dayArray = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
      return { day: i + 1, weekday };
    });

    const unsubscribeFns: (() => void)[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const slotRef = doc(db, "Departments", department, "Slots", dateKey);

      const unsub = onSnapshot(
        slotRef,
        (slotDoc) => {
          setSlots((prev) => ({
            ...prev,
            [d]: slotDoc.exists()
              ? slotDoc.data().closed
                ? 0
                : slotDoc.data().slots.reduce((sum: number, s: any) => sum + s.remaining, 0)
              : isWeekend || isPast
              ? 0
              : predefinedSlots.reduce((sum, s) => sum + s.capacity, 0),
          }));

          setIsClosed((prev) => ({
            ...prev,
            [d]: slotDoc.exists() && slotDoc.data().closed,
          }));
        },
        () => setError("Failed to load slot data.")
      );

      unsubscribeFns.push(unsub);
    }

    setDaysInfo(dayArray);
    return () => unsubscribeFns.forEach((fn) => fn());
  }, [month, year]);

  const handleSelectDate = async (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      openModal("Weekends are not available for appointments.", "error");
      return;
    }

    const selected = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slotRef = doc(db, "Departments", department, "Slots", selected);
    const slotDoc = await getDoc(slotRef);

    if (slotDoc.exists() && slotDoc.data().closed) {
      openModal("Selected date is closed.", "error");
      return;
    }

    setSelectedDate(selected);
    let slotsData: Slot[] = [];

    if (slotDoc.exists() && !slotDoc.data().closed) {
      slotsData = (slotDoc.data().slots as Slot[]).map((slot) => ({
        ...slot,
        slotID: slot.slotID.startsWith("SLOT-")
          ? slot.slotID
          : `SLOT-${uidGenerator.randomUUID()}`,
      }));

      if (slotsData.every((s) => s.remaining === 0)) {
        openModal("No slots available for the selected date.", "error");
        return;
      }
    } else {
      slotsData = predefinedSlots.map((s) => ({
        slotID: `SLOT-${uidGenerator.randomUUID()}`,
        time: s.time,
        remaining: s.capacity,
      }));

      await setDoc(
        slotRef,
        {
          date: selected,
          closed: false,
          slots: slotsData,
          totalSlots: slotsData.reduce((sum: number, s: Slot) => sum + s.remaining, 0),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    setTimeSlots(slotsData);
    setSelectedSlot(null);
    setShowModal(true);
  };

  const handleSelectSlot = async (slotTime: string) => {
  if (!selectedDate || !slotTime) return;

  const slotRef = doc(db, "Departments", department, "Slots", selectedDate);
  const slotDoc = await getDoc(slotRef);

  if (!slotDoc.exists() || slotDoc.data().closed) {
    openModal("Selected slot is unavailable.", "error");
    return;
  }

  const availableSlot = (slotDoc.data().slots as Slot[]).find(
    (s) => s.time === slotTime && s.remaining > 0
  );

  if (!availableSlot) {
    openModal("This time slot is no longer available.", "error");
    return;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const oldReservationRef = formData?.previousReservationId
        ? doc(db, "Departments", department, "Reservations", formData.previousReservationId)
        : null;

      const appointmentRef = doc(db, "Appointments", formData!.appointmentId);
      const appointmentDoc = await transaction.get(appointmentRef);
      if (!appointmentDoc.exists()) throw new Error("Appointment not found");

      if (appointmentDoc.data().department && appointmentDoc.data().department !== department) {
        throw new Error("Appointment already assigned to another department");
      }

      // Delete old draft reservation
      if (oldReservationRef) {
        transaction.delete(oldReservationRef);
      }

      // Create DRAFT reservation
      const reservationRef = doc(collection(db, "Departments", department, "Reservations"));
      transaction.set(reservationRef, {
        slotID: availableSlot.slotID,
        date: selectedDate,
        time: availableSlot.time,
        appointmentId: formData!.appointmentId,
        patientId: formData!.patientId,
        status: "draft", // ← DRAFT LANG
        createdAt: new Date().toISOString(),
      });

      // Update appointment (draft selection)
      transaction.update(appointmentRef, {
        department,
        date: selectedDate,
        slotID: availableSlot.slotID,
        slotTime: availableSlot.time,
        reservationId: reservationRef.id,
        patientId: formData!.patientId,
        status: "pending",
        updatedAt: new Date().toISOString(),
      });

      // AYAW NA I-MINUS ANG SLOT KANI!
      // Hulat sa ReviewPage → handleSubmit → finalizeBooking()

      setSelectedSlot({ slotID: availableSlot.slotID, time: availableSlot.time });
      setReservationId(reservationRef.id);
    });

    setShowModal(false);
    openModal("Time slot selected! You can change it later.", "success");
  } catch (err: any) {
    openModal("Failed to select slot: " + err.message, "error");
  }
};

  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setTimeSlots([]);
  };

  return (
    <div className="calendar-container pb-24">
      <h2>Select Appointment Date ({department})</h2>
      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      {/* Calendar Controls */}
      <div className="calendar-controls">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
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
          {Array.from({ length: maxYear - today.getFullYear() + 1 }, (_, i) => today.getFullYear() + i).map(
            (y) => (
              <option key={y} value={y}>{y}</option>
            )
          )}
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
            const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0;
            const isPast = new Date(year, month - 1, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isDayClosed = isClosed[day];
            const isSelected = selectedDate?.endsWith(`-${String(day).padStart(2, "0")}`);

            return (
              <div
                key={day}
                className={`calendar-day ${
                  slots[day] === 0 || isWeekend || isPast || isDayClosed ? "fully-booked" : ""
                } ${isWeekend ? "weekend" : ""} ${isDayClosed ? "closed" : ""} ${
                  isSelected ? "selected-date" : ""
                }`}
                onClick={() => !isWeekend && !isPast && !isDayClosed && handleSelectDate(day)}
              >
                <p className="day-number">{day}</p>
                <small className="weekday">{weekday}</small>
                <span className="slots-info">
                  {isWeekend ? "Closed" : isPast ? "Past" : isDayClosed ? "Closed" : `${slots[day] || 0} slots`}
                </span>
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
            <button className="close-buttons absolute top-3 right-3 text-gray-600 hover:text-red-500" onClick={closeModal}>
              <X size={24} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-center">
              Available Time Slots for {selectedDate}
            </h3>
            <div className="time-slots-grid">
              {timeSlots.map((slot) => (
                <button
                  key={slot.slotID}
                  className={`time-slot-btn ${
                    selectedSlot?.slotID === slot.slotID ? "selected" : ""
                  } ${slot.remaining === 0 ? "disabled" : ""}`}
                  disabled={slot.remaining === 0}
                  onClick={() => setSelectedSlot({ slotID: slot.slotID, time: slot.time })}
                >
                  {slot.time} ({slot.remaining} left)
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                style={{
                  padding: "10px 20px",
                  backgroundColor: selectedSlot ? "#2563eb" : "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: selectedSlot ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  fontSize: "16px",
                  boxShadow: "0px 2px 6px rgba(0,0,0,0.2)",
                }}
                disabled={!selectedSlot}
                onClick={() => {
                  if (selectedSlot) {
                    openModal(
                      `Book this slot?\n${selectedSlot.time}\n\nYou can change this later.`,
                      "confirm",
                      () => handleSelectSlot(selectedSlot.time)
                    );
                  }
                }}
              >
                OK
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
            onClick={() => {
              if (!selectedDate || !selectedSlot) {
                openModal("Please select a date and time slot first.", "error");
                return;
              }

              const message = formData?.fromReview
                ? `Update lab appointment?\n\n${selectedDate} | ${selectedSlot.time}\n\nReturn to review?`
                : `Proceed to next page?\n\n${selectedDate} | ${selectedSlot.time}`;

              openModal(message, "confirm", () => {
  const data = {
    ...formData,
    labDate: selectedDate,
    labSlotId: selectedSlot.slotID,
    labSlotTime: selectedSlot.time,
    labReservationId: reservationId || "",
  };
  onNavigate?.(formData?.fromReview ? "review" : "dental", data);
});
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Reusable Confirm/Error/Success Modal */}
      {showConfirmModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
          </audio>

          <div className="modal-overlay-servicess" onClick={closeConfirmModal}>
            <div className="modal-content-servicess" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-servicess">
                <img src="/logo.png" alt="DOH" className="modal-logo" />
                <h5>
                  {modalType === "success" && "SUCCESS"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM ACTION"}
                </h5>
              </div>

              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center", fontWeight: "600" }}>
                  {modalMessage}
                </p>
              </div>

              <div className="modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="modal-btn cancel" onClick={closeConfirmModal}>
                      Cancel
                    </button>
                    <button
                      className="modal-btn confirm"
                      onClick={() => {
                        closeConfirmModal();
                        onConfirmAction();
                      }}
                    >
                      Confirm
                    </button>
                  </>
                )}
                {(modalType === "error" || modalType === "success") && (
                  <button className="modal-btn ok" onClick={closeConfirmModal}>
                    OK
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

export default CalendarClinicalLab;