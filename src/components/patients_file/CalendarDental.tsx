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

interface CalendarDentalProps {
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
    targetView: "medical" | "dental" | "labservices" | "review",
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

const CalendarDental: React.FC<CalendarDentalProps> = ({
  formData,
  onConfirm,
  onNavigate,
}) => {
  const today = new Date();
  const uidGenerator = new ShortUniqueId({ length: 8 });

  // Calendar states
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [daysInfo, setDaysInfo] = useState<{ day: number; weekday: string }[]>([]);
  const [slots, setSlots] = useState<{ [key: number]: number }>({});
  const [isClosed, setIsClosed] = useState<{ [key: number]: boolean }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ slotID: string; time: string } | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);
  const [error, setError] = useState<string | null>(null);

  // MODAL STATES (same as AppointmentCalendar)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});

  const department = "Dental";

  // REUSABLE MODAL
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

  // Reset on formData change
  useEffect(() => {
    if (!formData?.patientId || !formData?.appointmentId) {
      setError("Invalid appointment data.");
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setShowTimeModal(false);
    setReservationId(null);
    setError(null);
  }, [formData]);

  // Load calendar days & slots
  useEffect(() => {
    const totalDays = new Date(year, month, 0).getDate();
    const dayArray = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return { day: i + 1, weekday: date.toLocaleDateString("en-US", { weekday: "short" }) };
    });
    setDaysInfo(dayArray);

    const unsubs: (() => void)[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const slotRef = doc(db, "Departments", department, "Slots", dateKey);

      const unsub = onSnapshot(
        slotRef,
        (snap) => {
          const data = snap.data();
          const isWeekend = new Date(year, month - 1, d).getDay() % 6 === 0;
          const isPast = new Date(year, month - 1, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          setSlots((prev) => ({
            ...prev,
            [d]: snap.exists()
              ? data?.closed
                ? 0
                : data?.slots?.reduce((s: number, slot: any) => s + slot.remaining, 0) ?? 0
              : isWeekend || isPast
              ? 0
              : predefinedSlots.reduce((s, slot) => s + slot.capacity, 0),
          }));
          setIsClosed((prev) => ({ ...prev, [d]: data?.closed }));
        },
        () => setError("Failed to load slots.")
      );
      unsubs.push(unsub);
    }
    return () => unsubs.forEach((u) => u());
  }, [year, month]);

  // SELECT DATE
  const handleSelectDate = async (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0 || date.getDay() === 6) {
      openModal("Weekends are not available.", "error");
      return;
    }

    const slotRef = doc(db, "Departments", department, "Slots", dateStr);
    const snap = await getDoc(slotRef);

    if (snap.exists() && snap.data()?.closed) {
      openModal("This date is closed.", "error");
      return;
    }

    let slotsData: Slot[] = [];

    if (snap.exists()) {
      slotsData = (snap.data()?.slots as Slot[]) || [];
      slotsData = slotsData.map((s) => ({
        ...s,
        slotID: s.slotID.startsWith("SLOT-") ? s.slotID : `SLOT-${uidGenerator.randomUUID()}`,
      }));
    } else {
      slotsData = predefinedSlots.map((s) => ({
        slotID: `SLOT-${uidGenerator.randomUUID()}`,
        time: s.time,
        remaining: s.capacity,
      }));
      await setDoc(slotRef, { date: dateStr, closed: false, slots: slotsData }, { merge: true });
    }

    if (slotsData.every((s) => s.remaining === 0)) {
      openModal("No slots available.", "error");
      return;
    }

    setSelectedDate(dateStr);
    setTimeSlots(slotsData);
    setSelectedSlot(null);
    setShowTimeModal(true);
  };

  // BOOK SLOT
  const handleSelectSlot = async (slotTime: string) => {
    if (!selectedDate || !selectedSlot) return;

    const slotRef = doc(db, "Departments", department, "Slots", selectedDate);
    const snap = await getDoc(slotRef);

    if (!snap.exists() || snap.data()?.closed) {
      openModal("Slot unavailable.", "error");
      return;
    }

    const availableSlot = (snap.data()?.slots as Slot[]).find(
      (s) => s.time === slotTime && s.remaining > 0
    );

    if (!availableSlot) {
      openModal("This time slot is no longer available.", "error");
      return;
    }

    try {
      await runTransaction(db, async (tx) => {
        const oldResRef = formData?.previousReservationId
          ? doc(db, "Departments", department, "Reservations", formData.previousReservationId)
          : null;

        const aptRef = doc(db, "Appointments", formData!.appointmentId);
        const aptSnap = await tx.get(aptRef);

        if (!aptSnap.exists()) throw new Error("Appointment not found");

        // Optional: prevent conflict with other department
        if (aptSnap.data().department && aptSnap.data().department !== department) {
          throw new Error("Already assigned to another department");
        }

        // Delete old draft reservation
        if (oldResRef) tx.delete(oldResRef);

        // Create DRAFT reservation
        const resRef = doc(collection(db, "Departments", department, "Reservations"));
        tx.set(resRef, {
          slotID: availableSlot.slotID,
          date: selectedDate,
          time: availableSlot.time,
          appointmentId: formData!.appointmentId,
          patientId: formData!.patientId,
          status: "draft", // DRAFT LANG, AYAW PA MINUS!
          createdAt: new Date().toISOString(),
        });

        // Update appointment (draft selection)
        tx.update(aptRef, {
          department,
          date: selectedDate,
          slotID: availableSlot.slotID,
          slotTime: availableSlot.time,
          reservationId: resRef.id,
          status: "pending",
          updatedAt: new Date().toISOString(),
        });

        // AYAW NA I-MINUS ANG SLOT KANI!
        // Hulat sa ReviewPage → finalizeBooking()

        setReservationId(resRef.id);
        setSelectedSlot({ slotID: availableSlot.slotID, time: availableSlot.time });
      });

      setShowTimeModal(false);
      openModal("Dental time slot selected!\nYou can still change it in Review.", "success");
    } catch (err: any) {
      openModal("Failed to select slot: " + err.message, "error");
    }
  };
  

  const closeTimeModal = () => {
    setShowTimeModal(false);
    setSelectedSlot(null);
    setTimeSlots([]);
  };

  return (
    <div className="calendar-container pb-24">
      <h2>Select Appointment Date ({department})</h2>
      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      {/* MONTH / YEAR SELECT */}
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

      {/* CALENDAR GRID */}
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
            const closed = isClosed[day];
            const selected = selectedDate?.endsWith(`-${String(day).padStart(2, "0")}`);

            return (
              <div
                key={day}
                className={`calendar-day ${
                  slots[day] === 0 || isWeekend || isPast || closed ? "fully-booked" : ""
                } ${isWeekend ? "weekend" : ""} ${closed ? "closed" : ""} ${selected ? "selected-date" : ""}`}
                onClick={() => !isWeekend && !isPast && !closed && handleSelectDate(day)}
              >
                <p className="day-number">{day}</p>
                <small className="weekday">{weekday}</small>
                <span className="slots-info">
                  {isWeekend || isPast || closed ? "Closed" : `${slots[day] || 0} slots`}
                </span>
                {selected && selectedSlot && <CheckCircle className="selected-checkmark" size={16} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* TIME SLOT MODAL */}
      {showTimeModal && (
        <div className="modal-overlay">
          <div className="modal relative">
            <button className="close-buttons absolute top-3 right-3" onClick={closeTimeModal}>
              <X size={24} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-center">
              Available Slots – {selectedDate}
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
                className="px-6 py-3 rounded font-bold text-white shadow-lg transition"
                style={{
                  backgroundColor: selectedSlot ? "#2563eb" : "#9ca3af",
                  cursor: selectedSlot ? "pointer" : "not-allowed",
                }}
                disabled={!selectedSlot}
                onClick={() => {
                  if (selectedSlot) {
                    openModal(
                       `Confirm your slot?\n${selectedSlot.time}\nYou can change this later.`,
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

      {/* NEXT BUTTON */}
      <div className="calendar-navigation">
        <div className="nav-right">
          <button
            className={`next-btn ${!selectedDate || !selectedSlot ? "disabled" : ""}`}
            onClick={() => {
              if (!selectedDate || !selectedSlot) {
                openModal("Please select a date & time first.", "error");
                return;
              }

              const msg = formData?.fromReview
                ? `Update Dental slot?\n\n${selectedDate} | ${selectedSlot.time}\n\nReturn to review?`
                : `Proceed to next page?\n\n${selectedDate} | ${selectedSlot.time}`;

              openModal(msg, "confirm", () => {
                const data = {
                  ...formData,
                  dentalDate: selectedDate,
                  dentalSlotId: selectedSlot.slotID,
                  dentalSlotTime: selectedSlot.time,
                  dentalReservationId: reservationId || "",
                };
                onNavigate?.(formData?.fromReview ? "review" : "medical", data);
              });
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* REUSABLE CONFIRM MODAL */}
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
                    {modalType === "success" ? "Continue" : "OK"}
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

export default CalendarDental;