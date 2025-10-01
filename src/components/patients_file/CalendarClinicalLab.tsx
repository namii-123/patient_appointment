
import React, { useState, useEffect } from "react";
import "../../assets/AppointmentCalendar.css";
import { X, CheckCircle } from "lucide-react"; 
import { db } from "./firebase";
import { doc, getDoc, onSnapshot, setDoc, collection, deleteDoc, runTransaction } from "firebase/firestore";
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

  const department = "Clinical Laboratory";

  useEffect(() => {
    console.log("📌 CalendarClinicalLab: Component mounted, formData:", formData);
    if (!formData?.patientId || !formData?.appointmentId) {
      console.error("📌 CalendarClinicalLab: Missing patientId or appointmentId in formData");
      setError("Invalid appointment data. Please try again.");
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setShowModal(false);
    setReservationId(null);
    setError(null);
  }, [formData]);

  useEffect(() => {
    console.log("📌 CalendarClinicalLab: Updating slots for year:", year, "month:", month);
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
          console.log(`📌 CalendarClinicalLab: Date ${dateKey}, Firestore data:`, slotDoc.data());
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
        (error) => {
          console.error(`📌 CalendarClinicalLab: onSnapshot error for ${dateKey}:`, error);
          setError("Failed to load slot data. Please try again.");
        }
      );

      unsubscribeFns.push(unsub);
    }

    setDaysInfo(dayArray);

    return () => {
      console.log("📌 CalendarClinicalLab: Cleaning up onSnapshot listeners");
      unsubscribeFns.forEach((fn) => fn());
    };
  }, [month, year, department]);

  const handleSelectDate = async (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("📌 CalendarClinicalLab: Selected date is a weekend");
      setError("Weekends are not available for appointments.");
      return;
    }
    const selected = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slotRef = doc(db, "Departments", department, "Slots", selected);
    const slotDoc = await getDoc(slotRef);

    if (slotDoc.exists() && slotDoc.data().closed) {
      console.log(`📌 CalendarClinicalLab: Date ${selected} is closed`);
      setError("Selected date is closed.");
      return;
    }

    setSelectedDate(selected);
    let slotsData: Slot[];

    if (slotDoc.exists() && !slotDoc.data().closed) {
      slotsData = slotDoc.data().slots as Slot[];
      console.log(`📌 CalendarClinicalLab: Loaded slots for ${selected}:`, slotsData);
      slotsData = slotsData.map((slot) => {
        if (!slot.slotID.startsWith("SLOT-")) {
          console.log(`📌 CalendarClinicalLab: Regenerating slotID for ${slot.time}, old slotID: ${slot.slotID}`);
          return {
            ...slot,
            slotID: `SLOT-${uidGenerator.randomUUID()}`,
          };
        }
        return slot;
      });
      if (slotsData.every((s) => s.remaining === 0)) {
        console.log(`📌 CalendarClinicalLab: No slots available for ${selected}`);
        setError("No slots available for the selected date.");
        return;
      }
      if (slotsData.some((s) => s.slotID !== slotDoc.data().slots.find((fs: Slot) => fs.time === s.time)?.slotID)) {
        const totalSlots = slotsData.reduce((sum, s) => sum + s.remaining, 0);
        await setDoc(
          slotRef,
          {
            date: selected,
            closed: false,
            slots: slotsData,
            totalSlots,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`📌 CalendarClinicalLab: Updated slots for ${selected} with new slotIDs:`, slotsData);
      }
    } else {
      slotsData = predefinedSlots.map((s) => ({
        slotID: `SLOT-${uidGenerator.randomUUID()}`,
        time: s.time,
        remaining: s.capacity,
      }));

      const totalSlots = slotsData.reduce((sum, s) => sum + s.remaining, 0);
      try {
        await setDoc(
          slotRef,
          {
            date: selected,
            closed: false,
            slots: slotsData,
            totalSlots,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`📌 CalendarClinicalLab: Initialized slots for ${selected} in Firestore:`, slotsData);
      } catch (error) {
        console.error(`📌 CalendarClinicalLab: Error initializing slots for ${selected}:`, error);
        setError("Failed to initialize slots. Please try again.");
        return;
      }
    }

    setTimeSlots(slotsData);
    setSelectedSlot(null);
    setShowModal(true);
  };

  const handleSelectSlot = async (slotTime: string) => {
    if (!selectedDate || !slotTime) {
      console.log("📌 CalendarClinicalLab: Missing selectedDate or slotTime");
      setError("Please select a date and time slot.");
      setShowModal(false);
      return;
    }

    console.log("📌 CalendarClinicalLab: formData in handleSelectSlot:", formData);
    if (!formData?.patientId || !formData?.appointmentId) {
      console.error("📌 CalendarClinicalLab: Missing formData fields", formData);
      setError("Invalid appointment data. Please try again.");
      setShowModal(false);
      return;
    }

    const slotRef = doc(db, "Departments", department, "Slots", selectedDate);
    const slotDoc = await getDoc(slotRef);

    if (!slotDoc.exists() || slotDoc.data().closed) {
      console.error(`📌 CalendarClinicalLab: Slot document for ${selectedDate} does not exist or is closed`);
      setError("Selected slot is unavailable.");
      setShowModal(false);
      return;
    }

    const currentSlots = slotDoc.data().slots as Slot[];
    const availableSlot = currentSlots.find((s) => s.time === slotTime && s.remaining > 0);

    if (!availableSlot) {
      console.error(`📌 CalendarClinicalLab: No available slot for ${slotTime}`);
      setError("No available slots for the selected time.");
      setShowModal(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // Perform all reads first
        const oldReservationRef =
          formData?.previousReservationId
            ? doc(db, "Departments", department, "Reservations", formData.previousReservationId)
            : null;

        const appointmentRef = doc(db, "Appointments", formData.appointmentId);
        const appointmentDoc = await transaction.get(appointmentRef);

        const newSlotRef = doc(db, "Departments", department, "Slots", selectedDate);
        const newSlotSnap = await transaction.get(newSlotRef);

        // Validate appointment document
        if (!appointmentDoc.exists()) {
          console.error(`📌 CalendarClinicalLab: Appointment ${formData.appointmentId} does not exist`);
          throw new Error("Appointment not found");
        }
        if (
          appointmentDoc.data().department !== department &&
          appointmentDoc.data().department !== undefined
        ) {
          console.error(
            `📌 CalendarClinicalLab: Appointment ${formData.appointmentId} already exists for department ${appointmentDoc.data().department}`
          );
          throw new Error("Appointment ID conflicts with another department");
        }

        // Validate new slot availability within transaction
        if (!newSlotSnap.exists() || newSlotSnap.data().closed) {
          console.error(`📌 CalendarClinicalLab: Slot for ${selectedDate} does not exist or is closed`);
          throw new Error("Selected slot is unavailable");
        }
        const newSlots = newSlotSnap.data().slots || [];
        const newSlotIndex = newSlots.findIndex((s: any) => s.slotID === availableSlot.slotID);
        if (newSlotIndex === -1 || newSlots[newSlotIndex].remaining <= 0) {
          console.error(`📌 CalendarClinicalLab: Slot ${availableSlot.slotID} is unavailable`);
          throw new Error("Selected slot is no longer available");
        }

        // Perform writes
        // Delete previous reservation if it exists
        if (oldReservationRef) {
          transaction.delete(oldReservationRef);
          console.log(`📌 CalendarClinicalLab: Deleted previous reservation ${formData.previousReservationId}`);
        }

        // Create new reservation
        const reservationRef = doc(collection(db, "Departments", department, "Reservations"));
        const reservationData = {
          slotID: availableSlot.slotID,
          date: selectedDate,
          time: availableSlot.time,
          appointmentId: formData.appointmentId,
          patientId: formData.patientId,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        transaction.set(reservationRef, reservationData);

        // Update appointment with new slot details
        transaction.update(appointmentRef, {
          department,
          date: selectedDate,
          slotID: availableSlot.slotID,
          slotTime: availableSlot.time,
          reservationId: reservationRef.id,
          patientId: formData.patientId,
          status: "pending",
          updatedAt: new Date().toISOString(),
        });

        // Update states
        setSelectedSlot({ slotID: availableSlot.slotID, time: availableSlot.time });
        setReservationId(reservationRef.id);
        console.log("📌 CalendarClinicalLab: After setting states - selectedSlot:", {
          slotID: availableSlot.slotID,
          time: availableSlot.time,
          selectedDate,
          reservationId: reservationRef.id,
          appointmentId: formData.appointmentId,
          patientId: formData.patientId,
        });

        if (onConfirm) {
          onConfirm(selectedDate, availableSlot.slotID);
        }
      });

      setShowModal(false);
    } catch (error: unknown) {
      console.error("📌 CalendarClinicalLab: Error creating reservation:", error);
      setError("Failed to select slot. Please try again.");
      setShowModal(false);
    }
  };

  const closeModal = () => {
    setSelectedSlot(null);
    setTimeSlots([]);
    setShowModal(false);
    setError(null);
  };

  return (
    <div className="calendar-container">
      <h2>Select Appointment Date ({department})</h2>
      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

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
            const selected = Number(e.target.value);
            setYear(selected);
            if (selected === maxYear) {
              setMaxYear(maxYear + 20);
            }
          }}
        >
          {Array.from(
            { length: maxYear - today.getFullYear() + 1 },
            (_, i) => today.getFullYear() + i
          ).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="calendar-grid-wrapper">
        <div className="weekday-headers">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}

          {daysInfo.map(({ day, weekday }) => {
            const date = new Date(year, month - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isDayClosed = isClosed[day] || false;
            const isSelected = selectedDate?.endsWith(`-${String(day).padStart(2, "0")}`);

            return (
              <div
                key={day}
                className={`calendar-day ${
                  slots[day] === 0 || isWeekend || isPast || isDayClosed ? "fully-booked" : ""
                } ${isWeekend ? "weekend" : ""} ${isDayClosed ? "closed" : ""} ${
                  isSelected ? "selected-date" : ""
                }`}
                onClick={() =>
                  !isWeekend && !isPast && !isDayClosed && handleSelectDate(day)
                }
              >
                <p className="day-number">{day}</p>
                <small className="weekday">{weekday}</small>
                <span className="slots-info">
                  {isWeekend ? "Closed" : isPast ? "Past" : isDayClosed ? "Closed" : `${slots[day] || 0} slots`}
                </span>
                {isSelected && (
                  <CheckCircle className="selected-checkmark" size={16} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal relative">
            <button
              className="close-buttons absolute top-3 right-3 text-gray-600 hover:text-red-500 transition"
              onClick={closeModal}
            >
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
                  onClick={() => {
                    console.log(`📌 CalendarClinicalLab: Selected slot: ${slot.slotID}, time: ${slot.time}, remaining: ${slot.remaining}`);
                    setSelectedSlot({ slotID: slot.slotID, time: slot.time });
                  }}
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
                  transition: "background-color 0.2s ease-in-out",
                }}
                disabled={!selectedSlot}
                onClick={() => {
                  if (selectedSlot) {
                    const confirmBooking = window.confirm(
                      `Are you sure you want to book this slot?\n${selectedSlot.time} - You can change this later if needed.`
                    );
                    if (confirmBooking) {
                      handleSelectSlot(selectedSlot.time);
                    }
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-navigation">
        <div className="nav-right">
          <button
            className="next-btn"
            disabled={!selectedDate || !selectedSlot}
            onClick={() => {
              if (!selectedDate || !selectedSlot) {
                console.log("📌 CalendarClinicalLab: Cannot navigate, missing required data", {
                  selectedDate,
                  selectedSlot,
                });
                alert("Please select and confirm a time slot before proceeding.");
                return;
              }

              const confirmNext = window.confirm(
                formData?.fromReview
                  ? "Are you sure you want to update the appointment slot and return to the review page?"
                  : "Are you sure you want to continue to the Dental appointment step?"
              );

              if (!confirmNext) {
                console.log("📌 CalendarClinicalLab: User cancelled navigation.");
                return;
              }

              const navigateData = {
                ...formData,
                labDate: selectedDate,
                labSlotId: selectedSlot.slotID,
                labSlotTime: selectedSlot.time,
                labReservationId: reservationId || "",
                previousDate: formData?.previousDate,
                previousSlotId: formData?.previousSlotId,
                previousSlotTime: formData?.previousSlotTime,
                previousReservationId: formData?.previousReservationId,
              };
              console.log(
                "📌 CalendarClinicalLab: Next button clicked, navigating to dental with data:",
                navigateData
              );

              if (formData?.fromReview) {
                onNavigate?.("review", navigateData);
              } else {
                onNavigate?.("dental", navigateData);
              }
            }}
          >
            Next ➡
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarClinicalLab;
