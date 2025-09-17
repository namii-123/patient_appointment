import React, { useState, useEffect } from "react";
import "../../assets/AppointmentCalendar.css";
import { X } from "lucide-react";
import { db } from "./firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import ShortUniqueId from "short-unique-id";

interface CalendarMedicalProps {
  formData?: any;
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

const CalendarMedical: React.FC<CalendarMedicalProps> = ({
  formData,
  onConfirm,
  onNavigate,
}) => {
  const today = new Date();
   const [year, setYear] = useState(today.getFullYear());
   const [month, setMonth] = useState(today.getMonth() + 1);
   const [daysInfo, setDaysInfo] = useState<{ day: number; weekday: string }[]>([]);
   const [slots, setSlots] = useState<{ [key: number]: number }>({});
   const [isClosed, setIsClosed] = useState<{ [key: number]: boolean }>({});
   const [selectedDate, setSelectedDate] = useState<string | null>(null);
   const [timeSlots, setTimeSlots] = useState<
     { slotID: string; time: string; remaining: number }[]
   >([]);
   const [selectedSlot, setSelectedSlot] = useState<{ slotID: string; time: string } | null>(null);
   const [showModal, setShowModal] = useState(false);
   const [confirmed, setConfirmed] = useState(false);
   const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);
 
  const department = "Medical";
   const uid = new ShortUniqueId({ length: 8 });

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
            console.log(`CalendarMedical: Date ${dateKey}, Firestore data:`, slotDoc.data());
            setSlots((prev) => ({
    ...prev,
    [d]: slotDoc.exists()
      ? slotDoc.data().closed
        ? 0
        : slotDoc.data().slots.reduce((sum: number, s: any) => sum + s.remaining, 0)
      : isWeekend || isPast
      ? 0
      : predefinedSlots.reduce((sum, s) => sum + s.capacity, 0), // <-- use predefined slots
  }));
  
            setIsClosed((prev) => ({
              ...prev,
              [d]: slotDoc.exists() && slotDoc.data().closed,
            }));
          },
          (error) => {
            console.error(`onSnapshot error for ${dateKey}:`, error);
          }
        );
  
        unsubscribeFns.push(unsub);
      }
  
      setDaysInfo(dayArray);
  
      return () => unsubscribeFns.forEach((fn) => fn());
    }, [month, year, department]);
  
    const aggregateSlotsByTime = (slots: Slot[]): { slotID: string; time: string; remaining: number }[] => {
      const aggregated: { [time: string]: { slotID: string; time: string; remaining: number } } = {};
  
      slots.forEach((slot) => {
        if (!aggregated[slot.time]) {
          aggregated[slot.time] = { slotID: slot.slotID, time: slot.time, remaining: 0 };
        }
        aggregated[slot.time].remaining += slot.remaining;
      });
  
      return Object.values(aggregated);
    };
  
   const handleSelectDate = async (day: number) => {
  if (confirmed) return;
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return;
  const selected = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const slotRef = doc(db, "Departments", department, "Slots", selected);
  const slotDoc = await getDoc(slotRef);
  if (slotDoc.exists() && slotDoc.data().closed) {
    console.log(`CalendarMedical: Date ${selected} is closed`);
    return;
  }
  setSelectedDate(selected);
  let slotsData: Slot[];
  if (slotDoc.exists() && !slotDoc.data().closed) {
    slotsData = slotDoc.data().slots as Slot[];
    console.log(`CalendarMedical: Loaded slots for ${selected}:`, slotsData);
    const aggregatedSlots = aggregateSlotsByTime(slotsData);
    if (aggregatedSlots.every((s) => s.remaining === 0)) {
      console.log(`CalendarMedical: No slots available for ${selected}`);
      return;
    }
    setTimeSlots(aggregatedSlots);
  } else {
    slotsData = predefinedSlots.flatMap((s) =>
      Array.from({ length: s.capacity }).map(() => ({
        slotID: `SLOT-${uid.randomUUID()}`,
        time: s.time,
        remaining: 1,
      }))
    );
    console.log(`CalendarMedical: Generated slots for ${selected}:`, slotsData);
    setTimeSlots(aggregateSlotsByTime(slotsData));
  }
  setSelectedSlot(null);
  setShowModal(true);
};
  
    const handleSelectSlot = async (slotTime: string) => {
      if (!selectedDate || !slotTime) return;
  
      const slotRef = doc(db, "Departments", department, "Slots", selectedDate);
  
      try {
        await runTransaction(db, async (transaction) => {
          const slotDoc = await transaction.get(slotRef);
          if (!slotDoc.exists() || slotDoc.data().closed) {
            console.log(`CalendarMedical: Slot document for ${selectedDate} does not exist or is closed`);
            setShowModal(false);
            return;
          }
  
          const currentSlots = slotDoc.data().slots as Slot[];
          const availableSlot = currentSlots.find((s) => s.time === slotTime && s.remaining > 0);
  
          if (!availableSlot) {
            console.log(`CalendarMedical: No available slot for ${slotTime}`);
            setShowModal(false);
            return;
          }
  
          const updatedSlots = currentSlots.map((s) =>
            s.slotID === availableSlot.slotID ? { ...s, remaining: 0 } : s
          );
  
          const newTotal = updatedSlots.reduce((sum: number, s: any) => sum + s.remaining, 0);
  
          transaction.update(slotRef, {
            slots: updatedSlots,
            totalSlots: newTotal,
          });
  
          setTimeSlots(aggregateSlotsByTime(updatedSlots));
          setSelectedSlot({ slotID: availableSlot.slotID, time: availableSlot.time });
          setConfirmed(true);
          setShowModal(false);
  
          const dayNum = Number(selectedDate.split("-")[2]);
          setSlots((prev) => ({
            ...prev,
            [dayNum]: newTotal,
          }));
  
          if (formData?.appointmentId) {
            transaction.update(doc(db, "Appointments", formData.appointmentId), {
              department,
              date: selectedDate,
             slotID: availableSlot.slotID, 
              slotTime: availableSlot.time,
              updatedAt: new Date().toISOString(),
            });
          }
        });
  
        console.log(`CalendarMedical: Slot booked for ${selectedDate}, slotID: ${selectedSlot?.slotID}`);
        if (onConfirm && selectedSlot) {
          onConfirm(selectedDate, selectedSlot.slotID);
        }
      } catch (error) {
        console.error("CalendarMedical: Error updating slot:", error);
        setShowModal(false);
        alert("Failed to book slot. Please try again.");
      }
    };
  
    const closeModal = () => {
      setSelectedSlot(null);
      setTimeSlots([]);
      setShowModal(false);
    };
  
      


  return (
    <div className="calendar-container">
         <h2>Select Appointment Date ({department})</h2>
   
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
             {Array.from({ length: maxYear - today.getFullYear() + 1 }, (_, i) => today.getFullYear() + i).map((y) => (
               <option key={y} value={y}>{y}</option>
             ))}
           </select>
         </div>
   
         <div className="calendar-grid-wrapper">
           <div className="weekday-headers">
             {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
               <div key={day} className="weekday-header">{day}</div>
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
   
               return (
                 <div
                   key={day}
                   className={`calendar-day ${slots[day] === 0 || isWeekend || isPast || isDayClosed ? "fully-booked" : ""} ${isWeekend ? "weekend" : ""} ${isDayClosed ? "closed" : ""} ${confirmed ? "disabled" : ""} ${selectedDate?.endsWith(`-${String(day).padStart(2, "0")}`) ? "selected" : ""}`}
                   onClick={() => !isWeekend && !isPast && !confirmed && !isDayClosed && handleSelectDate(day)}
                 >
                   <p className="day-number">{day}</p>
                   <small className="weekday">{weekday}</small>
                   <span className="slots-info">{isWeekend ? "Closed" : isPast ? "Past" : isDayClosed ? "Closed" : `${slots[day] || 0} slots`}</span>
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
                {timeSlots.map((slot, index) => (
  <button
    key={`${slot.time}-${index}`}
    className={`time-slot-btn ${selectedSlot?.slotID === slot.slotID ? "selected" : ""}`}
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
                     transition: "background-color 0.2s ease-in-out",
                   }}
                   disabled={!selectedSlot}
                   onClick={() => selectedSlot && handleSelectSlot(selectedSlot.time)}
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
               onClick={() => {
                 if (!confirmed) return alert("Please select a time slot before proceeding.");
                 if (selectedDate && selectedSlot) {
                   onNavigate?.("review", {
                     ...formData,
                     selectedDate,
                     selectedSlotId: selectedSlot.slotID,
                     selectedSlotTime: selectedSlot.time,
                   });
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

export default CalendarMedical;
