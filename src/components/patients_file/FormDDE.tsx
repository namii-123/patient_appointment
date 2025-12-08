import React, { useState, useEffect } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import axios from "axios";
import "../../assets/AllServices.css";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import ShortUniqueId from "short-unique-id";
import type { ReactNode } from "react";


interface FormData {
  requestDate: string;
  requestTime: string;
  controlNo: string;
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
  provinceCode?: string;
  municipality: string;
  municipalityCode?: string;
  barangay: string;
  barangayCode?: string;
  email: string;
  contact: string;
}

interface NavigateData extends FormData {
  patientId: string;
  controlNo: string;
  patientCode: string;
}

interface Province {
  code: string;
  name: string;
}

interface Municipality {
  code: string;
  name: string;
  provinceCode: string;
}

interface Barangay {
  code: string;
  name: string;
  cityCode: string;
}

interface ServicesProps {
  onNavigate?: (
    view: "allservices" | "calendar" | "courtorder" | "voluntaryform",
    data?: NavigateData
  ) => void;
}

const FormDDE: React.FC<ServicesProps> = ({ onNavigate }) => {
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            setFormData((prev) => ({
              ...prev,
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              middleInitial: userData.middleInitial || "",
              email: userData.email || "",
              contact: userData.contactNumber || "",
              age: userData.age || "",
              birthdate: userData.birthdate || "",
              gender: userData.gender || "",
              citizenship: userData.citizenship || "",
              houseNo: userData.houseNo || "",
              street: userData.street || "",
              province: userData.province || "",
              municipality: userData.municipality || "",
              barangay: userData.barangay || "",
            }));
          } else {
            console.warn("⚠️ No user profile found in Firestore");
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchUserData();
  }, []);

  const [formData, setFormData] = useState<FormData>({
    requestDate: "",
    requestTime: "",
    controlNo: "",
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
  });

  const isFormComplete = () => {
    const requiredFields = [
      "requestDate",
      "requestTime",
      "controlNo",
      "lastName",
      "firstName",
      "age",
      "birthdate",
      "gender",
      "citizenship",
      "houseNo",
      "street",
      "province",
      "municipality",
      "barangay",
      "email",
      "contact",
    ];

    const basicComplete = requiredFields.every(
      (field) => formData[field as keyof FormData] !== "" && formData[field as keyof FormData] !== null
    );

    if (formData.gender === "LGBTQ+" && formData.genderSpecify.trim() === "") {
      return false;
    }

    return basicComplete;
  };

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ADD THIS BEFORE return() - MODAL SYSTEM
const [showModal, setShowModal] = useState(false);
const [, setModalType] = useState<"confirm" | "error" | "success">("confirm");
const [, setOnConfirm] = useState<() => void>(() => {});

const [modalMessage, setModalMessage] = useState<ReactNode>(null);


const openModal = (
  msg: ReactNode,
  type: "confirm" | "error" | "success",
  callback?: () => void
) => {
  setModalMessage(msg);
  setModalType(type);
  if (callback) setOnConfirm(() => callback);
  setShowModal(true);
};


const closeModal = () => {
  setShowModal(false);
  setOnConfirm(() => {});
};

  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("https://psgc.gitlab.io/api/provinces/");
        if (Array.isArray(response.data)) {
          setProvinces(
            response.data.map((item: any) => ({
              code: item.code,
              name: item.name,
            }))
          );
        } else {
          throw new Error("Unexpected provinces data format");
        }
      } catch (error) {
        console.error("Error fetching provinces:", error);
        setError("Failed to load provinces. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (formData.province) {
      const fetchMunicipalities = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await axios.get(
            `https://psgc.gitlab.io/api/provinces/${formData.province}/cities-municipalities/`
          );
          if (Array.isArray(response.data)) {
            setMunicipalities(
              response.data.map((item: any) => ({
                code: item.code,
                name: item.name,
                provinceCode: formData.province,
              }))
            );
            setFormData((prev) => ({ ...prev, municipality: "", barangay: "" }));
            setBarangays([]);
          } else {
            throw new Error("Unexpected municipalities data format");
          }
        } catch (error) {
          console.error("Error fetching municipalities:", error);
          setError("Failed to load municipalities. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchMunicipalities();
    } else {
      setMunicipalities([]);
      setBarangays([]);
      setFormData((prev) => ({ ...prev, municipality: "", barangay: "" }));
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.provinceCode) {
      const fetchMunicipalities = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await axios.get(
            `https://psgc.gitlab.io/api/provinces/${formData.provinceCode}/cities-municipalities/`
          );
          if (Array.isArray(response.data)) {
            setMunicipalities(
              response.data.map((item: any) => ({
                code: item.code,
                name: item.name,
                provinceCode: formData.provinceCode!,
              }))
            );
            setFormData((prev) => ({
              ...prev,
              municipality: "",
              municipalityCode: "",
              barangay: "",
              barangayCode: "",
            }));
            setBarangays([]);
          }
        } catch (error) {
          console.error("Error fetching municipalities:", error);
          setError("Failed to load municipalities. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchMunicipalities();
    }
  }, [formData.provinceCode]);

  useEffect(() => {
    if (formData.municipalityCode) {
      const fetchBarangays = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await axios.get(
            `https://psgc.gitlab.io/api/cities-municipalities/${formData.municipalityCode}/barangays/`
          );
          if (Array.isArray(response.data)) {
            setBarangays(
              response.data.map((item: any) => ({
                code: item.code,
                name: item.name,
                cityCode: formData.municipalityCode!,
              }))
            );
            setFormData((prev) => ({ ...prev, barangay: "", barangayCode: "" }));
          }
        } catch (error) {
          console.error("Error fetching barangays:", error);
          setError("Failed to load barangays. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchBarangays();
    }
  }, [formData.municipalityCode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "contact") {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length <= 11) {
        setFormData((prev) => ({
          ...prev,
          contact: numericValue,
        }));
      }
      return;
    }

    if (name === "province") {
      const selected = provinces.find((p) => p.code === value);
      setFormData((prev) => ({
        ...prev,
        province: selected ? selected.name : "",
        provinceCode: value,
        municipality: "",
        barangay: "",
      }));
    } else if (name === "municipality") {
      const selected = municipalities.find((m) => m.code === value);
      setFormData((prev) => ({
        ...prev,
        municipality: selected ? selected.name : "",
        municipalityCode: value,
        barangay: "",
      }));
    } else if (name === "barangay") {
      const selected = barangays.find((b) => b.code === value);
      setFormData((prev) => ({
        ...prev,
        barangay: selected ? selected.name : "",
        barangayCode: value,
      }));
    } else if (name === "birthdate") {
      setFormData((prev) => ({
        ...prev,
        birthdate: value,
        age: value ? calculateAge(value) : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "age" ? (value === "" ? "" : Number(value)) : value,
      }));
    }
  };

  const generateControlNumber = (): string => {
    const now = new Date();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `TRC-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${randomNum}`;
  };

  


const [appointmentType, setAppointmentType] = useState<"voluntary" | "pleabargain" | null>(null);


const handleNext = (e: MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();

  // Kung naa na siyay napili before (rare case), diretso dayon
  if (appointmentType !== null) {
    proceedToSaveAndNavigate(appointmentType);
    return;
  }

  // Kung wala pa, pugson siya og pili gamit ang modal
  openModal(
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <h3 style={{ marginBottom: "20px", color: "#2c3e50" }}>
        Please Select Type of Admission
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", margin: "20px 0" }}>
        <button
          className="modal-btn confirm"
          style={{ 
            padding: "16px", 
            fontSize: "18px", 
            backgroundColor: "#27ae60",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontWeight: "bold"
          }}
          onClick={() => {
            setAppointmentType("voluntary");
            closeModal();
            proceedToSaveAndNavigate("voluntary");
          }}
        >
          VOLUNTARY ADMISSION
          <br />
          <small style={{ fontWeight: "normal" }}>Self-referred / Walk-in</small>
        </button>

        <button
          className="modal-btn confirm"
          style={{ 
            padding: "16px", 
            fontSize: "18px", 
            backgroundColor: "#e74c3c",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontWeight: "bold"
          }}
          onClick={() => {
            setAppointmentType("pleabargain");
            closeModal();
            proceedToSaveAndNavigate("pleabargain");
          }}
        >
          PLEA BARGAIN
          <br />
          <small style={{ fontWeight: "normal" }}>Court-Ordered via PDEA</small>
        </button>
      </div>

      <p style={{ marginTop: "20px", color: "#e74c3c", fontWeight: "bold" }}>
        This is required. You cannot proceed without choosing.
      </p>
    </div>,
    "confirm"
  );
};

const proceedToSaveAndNavigate = async (type: "voluntary" | "pleabargain") => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    openModal("No authenticated user found. Please login again.", "error");
    return;
  }

  try {
    const newControlNo = generateControlNumber();
    const uid = new ShortUniqueId({ length: 6 });
    const patientCode = `PAT-${uid.rnd()}`;

    // 1. Save to Patients
    const patientDocRef = await addDoc(collection(db, "Patients"), {
      ...formData,
      controlNo: newControlNo,
      uid: user.uid,
      patientCode,
      appointmentType: type,
      admissionType: type,
      status: "pending-assessment",
      createdAt: new Date().toISOString(),
    });

    // 2. CREATE Appointments document RIGHT AWAY (IMPORTANT!)
    const appointmentRef = await addDoc(collection(db, "Appointments"), {
      patientId: patientDocRef.id,
      patientCode,
      controlNo: newControlNo,
      displayId: newControlNo, // or generate separate displayId if needed
      appointmentType: type,
      status: "pending-documents",
      createdAt: new Date().toISOString(),
      uid: user.uid,
    });

    // Success
    openModal(
      `Patient registered successfully!\nControl No: ${newControlNo}\nType: ${type.toUpperCase()}`,
      "success"
    );

    setTimeout(() => {
      const navigateData = {
        ...formData,
        patientId: patientDocRef.id,
        controlNo: newControlNo,
        patientCode,
        appointmentId: appointmentRef.id, // ← SUPER IMPORTANT!
        displayId: newControlNo,
      };

      if (type === "voluntary") {
       onNavigate?.("voluntaryform", navigateData);
      } else {
       onNavigate?.("courtorder", navigateData);
      }
    }, 2000);

  } catch (error) {
    console.error("Error:", error);
    openModal("Failed to register. Please try again.", "error");
  }
};

  const calculateAge = (birthdate: string): number => {
    const today = new Date();
    const birthDate = new Date(birthdate);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  useEffect(() => {
  const updateDateTimeAndControl = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}`;

    setFormData((prev) => ({
      ...prev,
      requestDate: formattedDate,
      requestTime: formattedTime,
   
      controlNo: prev.controlNo || generateControlNumber(),
    }));
  };

 
  updateDateTimeAndControl();

  
  const interval = setInterval(updateDateTimeAndControl, 30_000);

  return () => clearInterval(interval);
}, []);

  return (
    <div className="main-holder">
      <div className="all-services-container">
        <div className="form-header">
          <div className="header-left">
            <img src="/logo.png" alt="DOH Logo" />
          </div>
          <div className="header-center">
            <p>Department of Health</p>
            <p>Treatment and Rehabilitation Center Argao</p>
            <h5>OUTPATIENT AND AFTERCARE DIVISION</h5>
            <h5>REQUEST FORM FOR ASSESSMENT</h5>
          </div>
          <div className="header-right">
            <p>Document No.: TRC-AOD-FM03</p>
            <p>Effective Date: 10 July 2023</p>
            <p>Revision No.: 1</p>
            <p>Page No.: Page 1 of 1</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="all-services-form">
          <div className="field-group">
            <div>
              <label htmlFor="requestDate">Date of Request</label>
              <input
                type="date"
                id="requestDate"
                name="requestDate"
                value={formData.requestDate}
                onChange={handleChange}
                required
                readOnly
              />
            </div>
            <div>
              <label htmlFor="requestTime">Time of Request</label>
              <input
                type="time"
                id="requestTime"
                name="requestTime"
                value={formData.requestTime}
                onChange={handleChange}
                required
                readOnly
              />
            </div>
            <div>
              <label htmlFor="controlNo">Control No.</label>
              <input
                type="text"
                id="controlNo"
                name="controlNo"
                value={formData.controlNo}
                onChange={handleChange}
                required
                readOnly
              />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                placeholder="Last Name"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                placeholder="First Name"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="middleInitial">Middle Initial</label>
              <input
                type="text"
                id="middleInitial"
                name="middleInitial"
                value={formData.middleInitial}
                onChange={handleChange}
                placeholder="Optional"
                maxLength={1}
              />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label htmlFor="birthdate">Birthdate</label>
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                placeholder="Birthdate"
                required
              />
            </div>
            <div>
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Age"
                required
                min={0}
                readOnly
              />
            </div>
            <div>
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">--Select Gender--</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="LGBTQ+">LGBTQ+ (specify below)</option>
                <option value="Prefer not to answer">Prefer not to answer</option>
              </select>
            </div>
          </div>

          {formData.gender === "LGBTQ+" && (
            <div className="conditional-field">
              <label htmlFor="genderSpecify">If LGBTQ+, please specify</label>
              <input
                type="text"
                id="genderSpecify"
                name="genderSpecify"
                value={formData.genderSpecify}
                onChange={handleChange}
              />
            </div>
          )}

         

          <div className="house-street-group">
             <div>
            <label htmlFor="citizenship">Citizenship</label>
            <input
              type="text"
              id="citizenship"
              name="citizenship"
              value={formData.citizenship}
              placeholder="Citizenship"
              onChange={handleChange}
              required
            />
          </div>
            <div>
              <label htmlFor="houseNo">House No.</label>
              <input
                type="text"
                id="houseNo"
                name="houseNo"
                value={formData.houseNo}
                placeholder="House No."
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="street">Street</label>
              <input
                type="text"
                id="street"
                name="street"
                placeholder="Street"
                value={formData.street}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <div>
              <label htmlFor="province">Province</label>
              <select
                id="province"
                name="province"
                value={formData.provinceCode || ""}
              
                onChange={handleChange}
                required
              >
                <option value="">--Select Province--</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="municipality">Municipality/City</label>
              <select
                id="municipality"
                name="municipality"
                value={formData.municipalityCode || ""}
                onChange={handleChange}
                required
              >
                <option value="">--Select Municipality--</option>
                {municipalities.map((municipality) => (
                  <option key={municipality.code} value={municipality.code}>
                    {municipality.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="barangay">Barangay</label>
              <select
                id="barangay"
                name="barangay"
                value={formData.barangayCode || ""}
                onChange={handleChange}
                required
              >
                <option value="">--Select Barangay--</option>
                {barangays.map((barangay) => (
                  <option key={barangay.code} value={barangay.code}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-groups">
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              placeholder="Email"
              onChange={handleChange}
              required
              readOnly
            />
          </div>

           <div>
  <label htmlFor="contact">Mobile/Contact Number</label>
  <input
    type="tel"
    id="contact"
    name="contact"
    value={formData.contact}
    onChange={handleChange}
    placeholder="11-digit mobile number"
    required
    style={{
      borderColor: formData.contact && formData.contact.length !== 11 ? "red" : "",
    }}
  />
  {formData.contact && formData.contact.length !== 11 && (
    <small style={{ color: "red" }}>
      Contact number must be exactly 11 digits (e.g., 09123456789)
    </small>
  )}
</div>


          </div>
          <div className="button-containerss">
           <button
  type="button"
  className="next-buttons"
  onClick={handleNext}
  disabled={!isFormComplete() || formData.contact.length !== 11}
  style={{
    opacity: !isFormComplete() || formData.contact.length !== 11 ? 0.5 : 1,
    cursor: !isFormComplete() || formData.contact.length !== 11 ? "not-allowed" : "pointer"
  }}
>
  Next
</button>
          </div>
        </form>

{/* MODAL - SAME SA AllServices */}
       {showModal && (
  <>
    <audio autoPlay className="modal-sound">
      <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
    </audio>

    <div 
      className="modal-overlay-services" 
  
    >
      <div className="modal-content-services" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-services">
          <img src="/logo.png" alt="DOH" className="modal-logo" />
          <h5>REQUIRED ACTION</h5>
        
        </div>

        <div className="modal-message-content">
          {modalMessage}
        </div>

        
        <div className="modal-footer">
          
        </div>
      </div>
    </div>
  </>
)}
      </div>
    </div>
  );
};
        
     

  

export default FormDDE;


