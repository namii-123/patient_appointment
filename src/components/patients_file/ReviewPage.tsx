import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDocs, collection, updateDoc,  addDoc, setDoc, getDoc } from "firebase/firestore";
import "../../assets/ReviewPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getAuth } from "firebase/auth";
import { query, where } from "firebase/firestore";


interface ReviewPageProps {
  formData?: {
    patientId: string;
    controlNo: string;
    patientCode: string;
    requestDate: string;
    requestTime: string;
    lastName: string;
    firstName: string;
    middleInitial: string;
    age: number | "";
    birthdate: string;
    gender: string;
    genderSpecify: string;
    citizenship: string;
    houseNo: string;
    street: string;
    province: string;
    municipality: string;
    barangay: string;
    email: string;
    contact: string;
    selectedDate?: string;
    selectedSlot?: string;
    appointmentIds?: string[];
  };
  onNavigate?: (...args: any[]) => void;
}

const ReviewPage: React.FC<ReviewPageProps> = ({ formData, onNavigate }) => {
  const safeFormData = formData ?? {
    patientId: "",
    controlNo: "",
    patientCode: "",
    requestDate: "",
    requestTime: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    age: "",
    birthdate: "",
    gender: "",
    genderSpecify: "",
    citizenship: "",
    houseNo: "",
    street: "",
    province: "",
    municipality: "",
    barangay: "",
    email: "",
    contact: "",
    selectedDate: "",
    selectedSlot: "",
    appointmentIds: [],
  };

  const [appointments, setAppointments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch all appointments for the patient
  useEffect(() => {
  const fetchAppointments = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      // Null-safe patientId determination
      let patientIdToQuery: string;
      if (safeFormData.patientId) {
        patientIdToQuery = safeFormData.patientId;
      } else if (currentUser) {
        patientIdToQuery = currentUser.uid;
      } else {
        console.warn("No logged-in user and no formData patientId.");
        return;
      }

      const appointmentsQuery = query(
        collection(db, "Appointments"),
        where("patientId", "==", patientIdToQuery)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const fetchedAppointments = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setAppointments(fetchedAppointments);
      console.log("Fetched appointments:", fetchedAppointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointment details. Please try again.");
    }
  };

  fetchAppointments();
}, [safeFormData.patientId, safeFormData.controlNo]);

 

// ...





const handleDownloadPDF = async () => {
  const formElement = document.querySelector(".all-services-container");
  if (!formElement) return;

  try {
    // Hide buttons temporarily
    const buttons = document.querySelectorAll(".download-btn, .submit-btn") as NodeListOf<HTMLElement>;
    buttons.forEach((btn) => (btn.style.display = "none"));

    // Append certificate section temporarily
    const certDiv = document.createElement("div");
    certDiv.style.marginTop = "30px";
    certDiv.style.textAlign = "center";
    certDiv.innerHTML = `
      <p style="font-weight:bold; font-size:1rem;">
        I hereby certify that the above information is true and correct.
      </p>
      <div style="margin-top:50px;">
        <p>__________________________</p>
        <p>Signature over Printed Name</p>
      </div>
    `;
    formElement.appendChild(certDiv);

    // ✅ Capture full form
    const canvas = await html2canvas(formElement as HTMLElement, {
      scale: 2,
      useCORS: true,
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const marginX = 10; // left/right margin
    const marginY = 15; // top margin
    const imgWidth = pageWidth - marginX * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");

    let position = 0; // pixel offset in original canvas

    // Temporary canvas for slicing
    const pageCanvas = document.createElement("canvas");
    const pageCtx = pageCanvas.getContext("2d")!;

    // Convert PDF page height (mm) to pixels for slicing
    const pageHeightPx = (canvas.width * pageHeight) / pageWidth;

    while (position < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - position);

      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        position,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const imgData = pageCanvas.toDataURL("image/png");
      const sliceHeightMM = (sliceHeight * imgWidth) / canvas.width;

      if (position === 0) {
        pdf.addImage(imgData, "PNG", marginX, marginY, imgWidth, sliceHeightMM);
      } else {
        pdf.addPage();
        pdf.addImage(imgData, "PNG", marginX, marginY, imgWidth, sliceHeightMM);
      }

      position += sliceHeight;
    }

    // Clean up
    certDiv.remove();
    buttons.forEach((btn) => (btn.style.display = "inline-block"));

    pdf.save("appointment_review.pdf");
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};



  const handleSubmit = async () => {
  try {
    if (appointments.length === 0) {
      setError("No appointments found to submit.");
      return;
    }

    const confirmSubmit = window.confirm("Are you sure you want to submit?");
    if (!confirmSubmit) return;

    const auth = getAuth();
    const currentUser = auth.currentUser;
    let userId = "";

    // Fetch UserId from Users collection
    if (currentUser) {
      const userRef = doc(db, "Users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userId = userSnap.data().UserId || "";
      } else {
        console.warn("No user document found for uid:", currentUser.uid);
        setError("User data not found.");
        return;
      }
    } else {
      setError("No logged-in user found.");
      return;
    }

    for (const appointment of appointments) {
      // Update appointment status
      const appointmentRef = doc(db, "Appointments", appointment.id);
      await updateDoc(appointmentRef, {
        status: "submitted",
        updatedAt: new Date().toISOString(),
      });

      // Save to Transactions collection
      const transactionRef = doc(collection(db, "Transactions"));
      await setDoc(transactionRef, {
        uid: currentUser?.uid,
        UserId: userId, // Include UserId (USR-XXXXXXXX)
        patientId: appointment.patientId || safeFormData.patientId,
        transactionCode: `TRANS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        controlNo: safeFormData.controlNo,
        purpose: appointment.department,
        services: appointment.services || [],
        doctor: "TBA",
        date: appointment.date,
        slotTime: appointment.slotTime,
        slotID: appointment.slotID,
        status: "Pending",
        createdAt: new Date().toISOString(),
        transactionId: transactionRef.id,
      });
    }

    alert("✅ Appointments submitted and added to Transactions!");
    onNavigate?.("transaction", {});
  } catch (err) {
    console.error("Error submitting appointments:", err);
    setError("❌ Failed to submit appointments. Please try again.");
  }
};

  


  const servicesByCategory: { [key: string]: string[] } = {
    Abdomen: ["Abdomen Supine", "Abdomen Upright"],
    Chest: ["Chest PA", "Chest Lateral", "Chest Apicolordotic"],
    Spine: ["Cervical AP & L", "Thoracic AP & L", "Lumbosacral AP & L", "Thoracolumbar"],
    Extremities: [
      "Ankle AP & L",
      "Elbow AP & L",
      "Femur AP & L",
      "Forearm AP & L",
      "Foot AP & L",
      "Hand AP & L",
      "Hip AP & L",
      "Humerus AP & L",
      "Knee AP & L",
      "Leg AP & L",
      "Wrist AP & L",
      "Pelvis AP",
      "Shoulder (Int/Ext)",
    ],
    "Head & Sinuses": ["Skull AP & L", "Paranasal Sinuses (C.W.L.)", "Waters’ Vie"],
    Others: ["Others"],
  };

  const servicesByCategoryLab: { [key: string]: string[] } = {
    Screening: ["Drug Test"],
    Hematology: ["Complete Blood Count (CBC)", "Clotting Time and Bleeding Time"],
    "Microscopy-Parasitology": ["Urinalysis", "Fecalysis"],
    "Clinical Chemistry": [
      "RBS (Random Blood Sugar)",
      "FBS (Fasting Blood Sugar)",
      "Lipid Panel",
      "Cholesterol",
      "Triglycerides",
      "High-Density Lipoprotein (HDL)",
      "Low-Density Lipoprotein (LDL)",
      "Very Low-Density Lipoprotein (VLDL)",
      "Serum Sodium (Na+)",
      "Serum Potassium (K+)",
      "Serum Chloride (Cl-)",
      "Serum Creatinine",
      "SGOT / AST",
      "SGPT / ALT",
      "BUA (Blood Uric Acid)",
      "BUN (Blood Urea Nitrogen)",
    ],
    "Immunology and Serology": [
      "HBsAg Screening Test",
      "HCV Screening Test",
      "Syphilis Screening Test",
      "Dengue Duo NS1",
      "Pregnancy Test",
      "Blood Typing",
    ],
    "Blood Chemistry": ["HbA1c"],
  };

  const servicesDental: string[] = [
    "Check-up",
    "Oral Prophylaxis",
    "Simple Extraction",
    "Complex Extraction",
    "Temporary Filling",
    "Permanent Filling",
    "Gum Treatment",
    "Incision and Drainage",
    "Others",
  ];

  const servicesMedical: string[] = [
    "General Consultation",
    "Pediatric Consultation",
    "Prenatal Consultation",
    "Postnatal Consultation",
    "Family Planning Consultation",
    "Senior Citizen / Geriatric Consultation",
    "Nutrition Counseling",
    "Others",
  ];

  return (
    <div className="main-holder">
      <div className="all-services-container">
        <div className="form-header">
          <div className="header-left">
            <img src="/logo.png" alt="DOH Logo" />
          </div>
          <div className="header-center">
            <p>Republic of the Philippines</p>
            <p>Department of Health</p>
            <p>Treatment and Rehabilitation Center Argao</p>
            <h3>OUTPATIENT REQUEST FORM</h3>
          </div>
          <div className="header-right">
            <p>Document No.: TRC-AOD-FM07</p>
            <p>Effective Date: 14 October 2024</p>
            <p>Revision No.: 1</p>
            <p>Page No.: Page 1 of 1</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="all-services-form">
          <h3 className="text-lg font-bold mb-4">Patient Information</h3>
          <div className="field-group">
            <div>
              <label>Date of Request</label>
              <input type="date" value={safeFormData.requestDate} readOnly />
            </div>
            <div>
              <label>Time of Request</label>
              <input type="time" value={safeFormData.requestTime} readOnly />
            </div>
            <div>
              <label>Control No.</label>
              <input type="text" value={safeFormData.controlNo} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Last Name</label>
              <input type="text" value={safeFormData.lastName} readOnly />
            </div>
            <div>
              <label>First Name</label>
              <input type="text" value={safeFormData.firstName} readOnly />
            </div>
            <div>
              <label>Middle Initial</label>
              <input type="text" value={safeFormData.middleInitial} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Birthdate</label>
              <input type="date" value={safeFormData.birthdate} readOnly />
            </div>
            <div>
              <label>Age</label>
              <input type="number" value={safeFormData.age} readOnly />
            </div>
            <div>
              <label>Gender</label>
              <input type="text" value={safeFormData.gender} readOnly />
            </div>
          </div>

          {safeFormData.gender === "LGBTQ+" && (
            <div className="conditional-field">
              <label>LGBTQ+ Specification</label>
              <input type="text" value={safeFormData.genderSpecify} readOnly />
            </div>
          )}

          <div>
            <label>Citizenship</label>
            <input type="text" value={safeFormData.citizenship} readOnly />
          </div>

          <div className="house-street-group">
            <div>
              <label>House No.</label>
              <input type="text" value={safeFormData.houseNo} readOnly />
            </div>
            <div>
              <label>Street</label>
              <input type="text" value={safeFormData.street} readOnly />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label>Province</label>
              <input type="text" value={safeFormData.province} readOnly />
            </div>
            <div>
              <label>Municipality/City</label>
              <input type="text" value={safeFormData.municipality} readOnly />
            </div>
            <div>
              <label>Barangay</label>
              <input type="text" value={safeFormData.barangay} readOnly />
            </div>
          </div>

          <div>
            <label>Email Address</label>
            <input type="email" value={safeFormData.email} readOnly />
          </div>

          <div>
            <label>Mobile/Contact Number</label>
            <input type="tel" value={safeFormData.contact} readOnly />
          </div>



<div className="services-wrapper">
  <div className="services-container">
    {["Radiographic", "Clinical Laboratory", "Dental", "Medical"].map((dept) => {
      const appointment = appointments.find(a => a.department === dept);

      return (
        <div key={dept} className="service-box">
          <h4>{dept} Services</h4>
          
          {/* Radiographic */}
          {dept === "Radiographic" && (
            <table>
              <tbody>
                <tr>
                  <td>Requesting Physician:</td>
                  <td>{appointment?.physician || ""}</td>
                </tr>

                {Object.entries(servicesByCategory).map(([category, services]) => (
                  <React.Fragment key={category}>
                    <tr className="category-row">
                      <td colSpan={2}>{category}</td>
                    </tr>
                    {services.map((service) => {
                      const isChecked = appointment?.services?.includes(service);
                      if (service === "Others") {
                        const othersService = appointment?.services?.find((s: string) =>
                          s.startsWith("Others:")
                        );
                        return (
                          <tr key="Others">
                            <td>{othersService || "Others"}</td>
                            <td style={{ textAlign: "center" }}>
                              <input type="checkbox" checked={!!othersService} readOnly />
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={service}>
                          <td>{service}</td>
                          <td style={{ textAlign: "center" }}>
                            <input type="checkbox" checked={!!isChecked} readOnly />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                <tr>
                  <td>Complaint / History:</td>
                  <td>{appointment?.complaint || ""}</td>
                </tr>
                
                <tr>
                  <td colSpan={2}>
                    <span style={{ fontWeight: "bold" }}>
                      (For Female Patients only, ages 10 to 55)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Date of Last Menstrual Period:</td>
                  <td><strong>{appointment?.lastMenstrualPeriod || ""}</strong></td>
                </tr>
                <tr>
  <td>Are you Pregnant?</td>
  <td>
    <strong>{appointment?.isPregnant || ""}</strong>
    {appointment?.isPregnant === "Yes" && (
      <div className="ml-4 text-sm">
        <label>
          <input type="checkbox" checked={appointment?.clearance} readOnly /> With clearance of the attending doctor
        </label>
        <br />
        <label>
          <input type="checkbox" checked={appointment?.shield} readOnly /> With abdominal lead shield
        </label>
      </div>
    )}
  </td>
</tr>

                <tr>
                  <td>Pregnancy Test Result:</td>
                  <td>
                    <label>
                      <input type="checkbox" checked={appointment?.pregnancyTestResult === "Positive"} readOnly /> Positive
                    </label>
                    <br />
                    <label>
                      <input type="checkbox" checked={appointment?.pregnancyTestResult === "Negative"} readOnly /> Negative
                    </label>
                  </td>
                </tr>

                <tr>
                  <td colSpan={2}>
                    Date: <strong>{appointment?.date || "_______"}</strong> &nbsp;&nbsp; 
                    Time: <strong>{appointment?.slotTime || "_______"}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Clinical Laboratory */}
          {dept === "Clinical Laboratory" && (
            <table>
              <tbody>
                {Object.entries(servicesByCategoryLab).map(([category, services]) => (
                  <React.Fragment key={category}>
                    <tr className="category-row">
                      <td colSpan={2}>{category}</td>
                    </tr>
                    {services.map((service) => (
                      <tr key={service}>
                        <td>{service}</td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={appointment?.services?.includes(service) || false}
                            readOnly
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                <tr>
                  <td colSpan={2}>
                    Date: <strong>{appointment?.date || "_______"}</strong> &nbsp;&nbsp; 
                    Time: <strong>{appointment?.slotTime || "_______"}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <br></br>

          {/* Dental */}
          {dept === "Dental" && (
            <table>
              <tbody>
                {servicesDental.map((service) => {
                  const isChecked = appointment?.services?.includes(service);
                  if (service === "Others") {
                    const othersService = appointment?.services?.find((s: string) =>
                      s.startsWith("Others:")
                    );
                    return (
                      <tr key="Others">
                        <td>{othersService || "Others"}</td>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={!!othersService} readOnly />
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={service}>
                      <td>{service}</td>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={!!isChecked} readOnly />
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={2}>
                    Date: <strong>{appointment?.date || "_______"}</strong> &nbsp;&nbsp; 
                    Time: <strong>{appointment?.slotTime || "_______"}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Medical */}
          {dept === "Medical" && (
            <table>
              <tbody>
                 {servicesMedical.map((service) => {
                  const isChecked = appointment?.services?.includes(service);
                  if (service === "Others") {
                    const othersService = appointment?.services?.find((s: string) =>
                      s.startsWith("Others:")
                    );
                    return (
                      <tr key="Others">
                        <td>{othersService || "Others"}</td>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={!!othersService} readOnly />
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={service}>
                      <td>{service}</td>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={!!isChecked} readOnly />
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={2}>
                    Date: <strong>{appointment?.date || "_______"}</strong> &nbsp;&nbsp; 
                    Time: <strong>{appointment?.slotTime || "_______"}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      );
    })}
  </div>
</div>



          <div className="button-containers flex justify-between mt-6">
            <button
              type="button"
              className="nav-button download-btn"
              onClick={handleDownloadPDF}
            >
              📄 Download PDF
            </button>
            <button
              type="button"
              className="nav-button submit-btn"
              onClick={handleSubmit}
            >
              ✅ Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewPage;