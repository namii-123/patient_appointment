import React, { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import "../../assets/ConsentForm.css";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, addDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import ShortUniqueId from "short-unique-id";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  patientCode: string;
  checklist: {
    courtOrder: boolean;
    officialReceipt: boolean;
    requestForm: boolean;
    dataPrivacy: boolean;
    hasValidID: boolean;
    vitalSigns: boolean;
  };
  files: {
    courtOrder?: File | null;
    pao?: File | null;
    lawyersRequest?: File | null;
    employersRecommendation?: File | null;
    officialReceipt?: File | null;
    requestForm?: File | null;
    dataPrivacy?: File | null;
    hasValidID?: File | null;
    vitalSigns?: File | null;
  };
}

interface NavigateData extends FormData {
  patientId?: string;
  controlNo: string;
  patientCode: string;
  hasValidID?: boolean;
  department?: string;
  validIDData?: any;
  courtOrderData?: any;
  paoData?: any;
  empData?: any;
  lawyersRequestData?: any;
  receiptData?: any;
  appointmentData?: any;
  validIDFiles?: Array<{
    name: string;
    base64: string;
    type: string;
    size?: number;
    uploadedAt: string;
  }> | null;
  voluntaryAdmissionFiles?: Array<{
    name: string;
    base64: string;
    type: string;
    size?: number;
    uploadedAt: string;
  }> | null;
}

interface ServicesProps {
  onNavigate?: (
    view: "allservices" | "calendar" | "radioservices" | "transaction" | "review",
    data?: NavigateData
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: NavigateData;
}

const ConsentForm: React.FC<ServicesProps> = ({ onNavigate, patientId, controlNo, formData: initialFormData }) => {
  const [formData, setFormData] = useState<FormData>({
    requestDate: "",
    requestTime: "",
    controlNo: "",
    lastName: initialFormData?.lastName || "",
    firstName: initialFormData?.firstName || "",
    middleInitial: initialFormData?.middleInitial || "",
    age: initialFormData?.age || "",
    birthdate: initialFormData?.birthdate || "",
    gender: initialFormData?.gender || "",
    genderSpecify: initialFormData?.genderSpecify || "",
    citizenship: initialFormData?.citizenship || "",
    houseNo: initialFormData?.houseNo || "",
    street: initialFormData?.street || "",
    province: initialFormData?.province || "",
    provinceCode: initialFormData?.provinceCode || "",
    municipality: initialFormData?.municipality || "",
    municipalityCode: initialFormData?.municipalityCode || "",
    barangay: initialFormData?.barangay || "",
    barangayCode: initialFormData?.barangayCode || "",
    email: initialFormData?.email || "",
    contact: initialFormData?.contact || "",
    patientCode: initialFormData?.patientCode || "",
    checklist: {
      courtOrder: initialFormData?.checklist?.courtOrder || false,
      officialReceipt: initialFormData?.checklist?.officialReceipt || false,
      requestForm: initialFormData?.checklist?.requestForm || false,
      dataPrivacy: initialFormData?.checklist?.dataPrivacy || false,
      hasValidID: initialFormData?.checklist?.hasValidID || false,
      vitalSigns: initialFormData?.checklist?.vitalSigns || false,
    },
    files: {
      courtOrder: null,
      pao: null,
      lawyersRequest: null,
      employersRecommendation: null,
      officialReceipt: null,
      requestForm: null,
      dataPrivacy: null,
      hasValidID: null,
      vitalSigns: null,
    },
  });
  const [downloads, setDownloads] = useState({
    consentForm: false,
    assessmentForm: false,
  });

  const [showModal, setShowModal] = useState(false);
const [modalMessage, setModalMessage] = useState("");
const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
const [onModalConfirm, setOnModalConfirm] = useState<() => void>(() => {});

const openModal = (
  msg: string,
  type: "confirm" | "error" | "success",
  callback?: () => void
) => {
  setModalMessage(msg);
  setModalType(type);
  if (callback) setOnModalConfirm(() => callback);
  setShowModal(true);
};

const closeModal = () => {
  setShowModal(false);
  setOnModalConfirm(() => {});
};
 
{/*
const replaceInputsWithText = (container: HTMLElement) => {
  const inputs = container.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const value = (input as HTMLInputElement).value;
    if (value) {
      const span = document.createElement('span');
      span.textContent = value;
      span.style.cssText = window.getComputedStyle(input).cssText;
      span.style.fontFamily = window.getComputedStyle(input).fontFamily;
      span.style.fontSize = window.getComputedStyle(input).fontSize;
      span.style.color = window.getComputedStyle(input).color;
      span.style.backgroundColor = 'transparent';
      span.style.border = 'none';
      span.style.padding = '0';
      span.style.margin = '0';
      span.style.display = 'inline-block';
      span.style.minWidth = '1ch';

      // Replace input with span
      input.parentNode?.replaceChild(span, input);
    }
  });
};
*/}

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const effectivePatientId = patientId || initialFormData?.patientId;
        if (effectivePatientId) {
          const patientRef = doc(db, "Patients", effectivePatientId);
          const patientSnap = await getDoc(patientRef);

          if (patientSnap.exists()) {
            const patientData = patientSnap.data() as FormData;

            setFormData((prev) => ({
              ...prev,
              requestDate: patientData.requestDate || "",
              requestTime: patientData.requestTime || "",
              controlNo: patientData.controlNo || "",
              lastName: patientData.lastName || "",
              firstName: patientData.firstName || "",
              middleInitial: patientData.middleInitial || "",
              age: patientData.age || "",
              birthdate: patientData.birthdate || "",
              gender: patientData.gender || "",
              genderSpecify: patientData.genderSpecify || "",
              citizenship: patientData.citizenship || "",
              houseNo: patientData.houseNo || "",
              street: patientData.street || "",
              province: patientData.province || "",
              provinceCode: patientData.provinceCode || "",
              municipality: patientData.municipality || "",
              municipalityCode: patientData.municipalityCode || "",
              barangay: patientData.barangay || "",
              barangayCode: patientData.barangayCode || "",
              email: patientData.email || "",
              contact: patientData.contact || "",
              patientCode: patientData.patientCode || "",
              checklist: {
                courtOrder: patientData.checklist?.courtOrder || false,
                officialReceipt: patientData.checklist?.officialReceipt || false,
                requestForm: patientData.checklist?.requestForm || false,
                dataPrivacy: patientData.checklist?.dataPrivacy || false,
                hasValidID: patientData.checklist?.hasValidID || false,
                vitalSigns: patientData.checklist?.vitalSigns || false,
              },
              files: {
                courtOrder: null,
                pao: null,
                lawyersRequest: null,
                employersRecommendation: null,
                officialReceipt: null,
                requestForm: null,
                dataPrivacy: null,
                hasValidID: null,
                vitalSigns: null,
              },
            }));
            return;
          } else {
            console.warn("⚠️ No patient data found in Firestore for the given patientId");
          }
        }

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
        console.error("Error fetching profile:", err);
      }
    };

    fetchPatientData();
  }, [patientId, initialFormData]);

  useEffect(() => {
    if (initialFormData?.hasValidID) {
      setFormData((prev) => ({
        ...prev,
        checklist: {
          ...prev.checklist,
          hasValidID: true,
        },
      }));
    }
  }, [initialFormData]);

  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const formattedTime = now.toTimeString().split(":").slice(0, 2).join(":");

    setFormData((prev) => ({
      ...prev,
      requestDate: formattedDate,
      requestTime: formattedTime,
      controlNo: controlNo || initialFormData?.controlNo || generateControlNumber(),
    }));
  }, [controlNo, initialFormData]);

  const generateControlNumber = (): string => {
    const now = new Date();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `TRC-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${randomNum}`;
  };

  const handleNext = async (e: MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();

  
  if (!downloads.consentForm || !downloads.assessmentForm) {
    const missingForms = [];
    if (!downloads.consentForm) missingForms.push("Consent Form");
    if (!downloads.assessmentForm) missingForms.push("Assessment Request Form");
    openModal(
      `Please download the following form(s) before proceeding:\n${missingForms.join(" and ")}.`,
      "error"
    );
    return;
  }

  
  openModal(
    "Do you want to proceed and save this patient information?",
    "confirm",
    async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        openModal("No authenticated user found. Please login.", "error");
        return;
      }

      try {
        let effectivePatientId = patientId || initialFormData?.patientId;
        let effectiveControlNo = controlNo || formData.controlNo || initialFormData?.controlNo;
        if (!effectiveControlNo) {
          effectiveControlNo = generateControlNumber();
        }

        const uid = new ShortUniqueId({ length: 6 });
        const patientCode = formData.patientCode || initialFormData?.patientCode || `PAT-${uid.rnd()}`;

    
        const userSnap = await getDoc(doc(db, "Users", user.uid));
        let UserId = user.uid;
        if (userSnap.exists()) {
          UserId = userSnap.data()?.UserId || user.uid;
        }

        const updatedFormData = { ...formData, controlNo: effectiveControlNo, patientCode };
        setFormData(updatedFormData);

       
        if (effectivePatientId) {
          await updateDoc(doc(db, "Patients", effectivePatientId), {
            ...updatedFormData,
            uid: user.uid,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const patientRef = await addDoc(collection(db, "Patients"), {
            ...updatedFormData,
            uid: user.uid,
            createdAt: new Date().toISOString(),
          });
          effectivePatientId = patientRef.id;
        }

        // Create services
        const services = [];
        if (formData.checklist.courtOrder) services.push("Court Order Processing");
        if (formData.checklist.officialReceipt) services.push("Official Receipt");
        if (formData.checklist.requestForm) services.push("Request Form");
        if (formData.checklist.dataPrivacy) services.push("Data Privacy Consent");
        if (formData.checklist.hasValidID) services.push("ID Verification");
        if (formData.checklist.vitalSigns) services.push("Vital Signs Check");

        // Create transaction
        const transRef = doc(collection(db, "Transactions"));
        const transCode = `TRANS-${uid.rnd()}`;
        await setDoc(transRef, {
          uid: user.uid,
          UserId,
          patientId: effectivePatientId,
          transactionCode: transCode,
          controlNo: effectiveControlNo,
          patientCode,
          purpose: "DDE",
          services: services.length ? services : ["General Assessment"],
          date: formData.requestDate,
          slotTime: "",
          slotID: "",
          status: "Pending",
          createdAt: new Date().toISOString(),
          transactionId: transRef.id,
          checklist: formData.checklist,
          lastName: formData.lastName,
          firstName: formData.firstName,
          middleInitial: formData.middleInitial,
          validIDData: initialFormData?.validIDData || null,
          courtOrderData: initialFormData?.courtOrderData || null,
          paoData: initialFormData?.paoData || null,
          empData: initialFormData?.empData || null,
          lawyersRequestData: initialFormData?.lawyersRequestData || null,
          receiptData: initialFormData?.receiptData || null,
          validIDFiles: initialFormData?.validIDFiles || null,
          voluntaryAdmissionFiles: initialFormData?.voluntaryAdmissionFiles || null,
        });

       

        
const fullName = `${formData.lastName}, ${formData.firstName} ${formData.middleInitial || ""}`.trim();

await addDoc(collection(db, "admin_notifications"), {
  type: "new_appointment",
  message: "New DDE appointment request",
  patientName: fullName || "Unknown Patient",
  date: formData.requestDate,          
  slotTime: "",                        
  purpose: "DDE",                      
  timestamp: serverTimestamp(),
  read: false,
});
        openModal(
          `Patient info saved!\nPatient Code: ${patientCode}\nTransaction Code: ${transCode}`,
          "success"
        );

        setTimeout(() => {
          if (onNavigate) {
            const navigateData: NavigateData = {
              ...updatedFormData,
              patientId: effectivePatientId,
              controlNo: effectiveControlNo,
              patientCode,
              hasValidID: formData.checklist.hasValidID,
              department: "DDE",
              validIDData: initialFormData?.validIDData || null,
              courtOrderData: initialFormData?.courtOrderData || null,
              paoData: initialFormData?.paoData || null,
              empData: initialFormData?.empData || null,
              lawyersRequestData: initialFormData?.lawyersRequestData || null,
              receiptData: initialFormData?.receiptData || null,
              validIDFiles: initialFormData?.validIDFiles || null,
              voluntaryAdmissionFiles: initialFormData?.voluntaryAdmissionFiles || null,
            };
            onNavigate("transaction", navigateData);
          }
        }, 2000);

      } catch (error) {
        console.error("Save error:", error);
        openModal("Failed to save patient information or create transaction.", "error");
      }
    }
  );
};

  return (
    <div className="main-holders">
      <div className="all-services-containers">
        <div className="form-header">
          <div className="header-lefts">
            <img src="logo.png" alt="DOH Logo" className="doh-logo" />
            <img src="pilipinas.png" alt="Bagong Pilipinas Logo" className="bp-logo" />
          </div>
          <div className="header-centersss">
            <p className="republic-header" >Republic of the Philippines</p>
            
            <h1 className="health">Department of Health</h1>
          
            <h1>Treatment and Rehabilitation Center Argao</h1>
            <div className="header-contact-rows">
              <p><span className="icon">📍</span> Candabong, Binlod, Argao, Cebu</p>
              <p><span className="icon">📧</span> trcchief@trcargao.doh.gov.ph</p>
              <p><span className="icon">☎️</span> (032) 485-8155 | (032) 430-3916</p>
            </div>
          </div>
        </div>
        <div className="consent-form-section">
          <h3 className="consent-title">DATA PRIVACY CONSENT FORM</h3>
          <table className="consent-table">
            <tbody>
              <tr>
                <td className="label">Name of the Data Subject:</td>
                <td>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={`${formData.firstName} ${formData.middleInitial} ${formData.lastName}`.trim()}
                    readOnly
                  ></textarea>
                </td>
              </tr>
              <tr>
                <td className="label">Purpose:</td>
                <td><textarea className="input-field" rows={2}></textarea></td>
              </tr>
              <tr>
                <td className="label">Personal Information Controllers (PICs) / Personal Information Processors (PIPs):</td>
                <td><textarea className="input-field" rows={2}></textarea></td>
              </tr>
              <tr>
                <td className="label">Intended recipients or categories of recipients:</td>
                <td><textarea className="input-field" rows={2}></textarea></td>
              </tr>
            </tbody>
          </table>
          <div className="consent-terms">
            <div className="row">
              <div className="col">
                <p>
                  The undersigned hereby acknowledges and agrees to the following terms with respect to the collection,
                  processing, and protection of personal data by the Department of Health-Treatment and Rehabilitation
                  Center Argao ("DOH-TRC Argao"):
                </p>
              </div>
              <div className="col">
                <p>
                  Ang mipirma sa ubos niini miila ug miuyon sa mga mosunod nga termino kalabot sa pagkolekta,
                  pagproseso, ug pagpanalipod sa personal nga datos sa Department of Health-Treatment and Rehabilitation
                  Center Argao ("DOH-TRC Argao"):
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <p>
                  <h4>Commitment to Data Protection</h4>
                  DOH-TRC Argao is dedicated to implementing reasonable and appropriate organizational, physical,
                  and technical measures to safeguard the privacy, confidentiality and security of personal data in
                  compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and
                  Regulations.
                </p>
              </div>
              <div className="col">
                <p>
                  <h4>Pagpanalipod sa Datos</h4>
                  Ang DOH-TRC Argao gipahinungod sa pagpatuman sa makatarunganon ug tukma nga organisasyonal,
                  pisikal, ug teknikal nga mga lakang aron mapanalipdan ang pribasiya, kompidensiyal, ug seguridad
                  sa personal nga datos agig pagsunod sa Republic Act No. 10173 (Data Privacy Act of 2012) ug sa
                  Implementing Rules and Regulations niini.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <p>
                  <h4>Authorized Access and Confidentiality</h4>
                  Access to the collected personal data will be restricted to authorized personnel of DOH-TRC Argao and
                  specified recipients or categories of recipients, who are bound to maintain strict confidentiality.
                  In the event of a data breach, DOH-TRC Argao will notify both the undersigned and the National Privacy
                  Commission (NPC) in accordance with NPC Circular 16-03 concerning Personal Data Breach Management.
                </p>
              </div>
              <div className="col">
                <p>
                  <h4>Awtorisadong Pag-access ug Kompidensiyalidad</h4>
                  Ang pag-access sa nakolekta nga personal nga datos pagapugngan lamang sa mga otorisadong tawo sa
                  DOH-TRC Argao ug gipahayag nga madawat ang mga kategoriya sa mga makadawat, kinsa obligado sa
                  pagpadayon sa estrikto nga kompidensiyal. Sa dihang adunay data breach, ang DOH-TRC Argao mopahibalo
                  sa mipirma sa ubos ug sa National Privacy Commission (NPC) subay sa NPC Circular 16-03 mahitungod sa
                  Personal Data Breach Management.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <p>
                  <h4>Consent for Data Collection and Processing</h4>
                  By signing this document, I consent to the collection and processing of my personal and/or sensitive
                  personal data, including but not limited to my name, contact number, address, photograph, sex, civil
                  status, birthdate, birthplace, and educational attainment, for the specific and legitimate purposes
                  outlined above. This processing will be conducted with appropriate privacy and security measures, and
                  solely for the purposes stated.
                </p>
              </div>
              <div className="col">
                <p>
                  <h4>Pagtugot sa Pagkolekta ug Pagproseso</h4>
                  Pinaagi sa pagpirma niini nga dokumento, miuyon ko sa pagkolekta ug pagproseso sa akong personal ug/o
                  sensitibong personal nga datos, lakip apan dili limitado sa akong ngalan, kontak number, address,
                  litrato, seks, estado, petsa sa pagkatawo, lugar sa natawhan, nakuha nga edukasyon, alang sa espesipiko
                  ug lehitimong katuyoan nga gipahayag sa ibabaw. Kini nga pagproseso himuon uban ang angay nga mga lakang
                  pangpribado ug seguridad, ug alang lamang sa mga katuyoan nga giingon.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <p>
                  <h4>Rights as a Data Subject</h4>
                  I affirm my rights as a data subject under the Data Privacy Act of 2012,
                  including but not limited to the right to access and correct my data,
                  object to its processing, suspend or withdraw my personal information,
                  and seek indemnification for damages as provided by law.
                </p>
              </div>
              <div className="col">
                <p>
                  <h4>Katungod isip Data Subject</h4>
                  Gipahayag ko ang akong mga katungod isip usa ka data subject ubos sa Data Privacy Act of 2012,
                  lakip na apan dili limitado sa akong katungod sa pag-access sa akong datos, pagsupak sa pagproseso niini,
                  pagsuspenso o pag-withdraw sa akong personal na impormasyon, ug pagpangayo og bayad alang sa mga kadaot nga gihatag sa balaod.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <p>
                  <h4>Acknowledgment and Waiver</h4>
                  I confirm that I have read and understood this form, and that my consent
                  does not constitute a waiver of any of my rights under the Data Privacy Act of 2012,
                  its Implementing Rules and Regulations, or other applicable laws.
                  By signing below, I provide my informed consent to the terms outlined above.
                </p>
              </div>
              <div className="col">
                <p>
                  <h4>Panghimatuod ug Waiver</h4>
                  Akong gipamatud-an nga akong nabasa ug nasabtan kini nga dokumento,
                  ug nga ang akong pagtugot dili mahimong waiver sa bisan unsa sa akong mga katungod ubos sa Data Privacy Act of 2012,
                  ang Implementing Rules and Regulations niini, o uban pang balaod.
                  Pinaagi sa pagpirma sa ubos, akong gihatag ang akong nahibal-an nga pagtugot sa mga termino nga gilatid sa ibabaw.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="signature-section">
          <p
            style={{
              textTransform: "uppercase",
              textDecoration: "underline",
              fontWeight: "bold",
            }}
          >
            {`${formData.firstName} ${formData.middleInitial} ${formData.lastName}`.trim()}
          </p>
          <p>Signature over Printed Name</p>
          <p
            style={{
              textTransform: "uppercase",
              textDecoration: "underline",
              fontWeight: "bold",
            }}
          >
            {formData.requestDate || ""}
          </p>
          <p>Date</p>
        </div>
        <div className="footer-logos">
  <div className="footer-logo-item">
    <img src="philhealth.png" alt="PhilHealth Logo" className="footer-logo" />
    <p>PhilHealth<br /><small>Your Partner in Health</small></p>
  </div>

  <div className="footer-logo-item">
    <img src="redorchid.png" alt="Red Orchid Award" className="footer-logo" />
    <p>Red Orchid Award<br /><small>Hall of Fame</small></p>
  </div>

  <div className="footer-logo-item">
    <img src="tuv.png" alt="TUV ISO Logo" className="footer-logo" />
    <p>Quality Management System<br />ISO 9001:2015<br /><small>Cert. No.: TUV-100 05 4571</small></p>
  </div>
</div>

        <div className="button-container-consent">
          <button
  type="button"
  className="download-button-consent"
  onClick={async () => {
    try {
      const input = document.querySelector(".all-services-containers") as HTMLElement | null;
      if (!input) {
        alert("Consent form not found!");
        return;
      }

      const buttonContainer = document.querySelector(".button-container-consent") as HTMLElement | null;
      if (buttonContainer) buttonContainer.style.display = "none";

      // === SAVE ORIGINAL STATES ===
      const originalViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      const originalViewportContent = originalViewport?.content;

      const originalBodyStyles = {
        width: document.body.style.width,
        minWidth: document.body.style.minWidth,
      };

      const originalInputStyles = {
        cssText: input.style.cssText,
        className: input.className,
      };

      // === APPLY DESKTOP FORCING ===
      // Force viewport
      let tempViewport = originalViewport;
      if (!tempViewport) {
        tempViewport = document.createElement("meta");
        tempViewport.name = "viewport";
        document.head.appendChild(tempViewport);
      }
      tempViewport.content = "width=1024";

      // Force body and input width
      document.body.style.width = "1024px";
      document.body.style.minWidth = "1024px";
      input.style.width = "1024px";
      input.style.maxWidth = "1024px";
      input.style.minWidth = "1024px";

      // Add force class if needed
      input.classList.add("force-desktop");

      // Wait for layout reflow
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.scrollTo(0, 0);

      // Capture with html2canvas
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        windowWidth: 1024,
        width: 1024,
      });

      // === RESTORE EVERYTHING PERFECTLY ===
      // Restore viewport
      if (originalViewport && tempViewport) {
        originalViewport.content = originalViewportContent || "width=device-width, initial-scale=1";
      } else if (tempViewport && tempViewport.parentNode) {
        tempViewport.parentNode.removeChild(tempViewport);
      }

      // Restore body
      document.body.style.width = originalBodyStyles.width;
      document.body.style.minWidth = originalBodyStyles.minWidth;

      // Restore input element
      input.style.cssText = originalInputStyles.cssText;
      input.className = originalInputStyles.className; // This fully restores classes including removing 'force-desktop'

      // Show button again
      if (buttonContainer) buttonContainer.style.display = "";

      // Generate and save PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", [215.9, 330.2]);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      pdf.save("ConsentForm.pdf");

      setDownloads((prev) => ({ ...prev, consentForm: true }));
    } catch (error) {
      console.error("Error generating Consent Form PDF:", error);
      alert("❌ Failed to generate Consent Form PDF. Please try again.");

      // Even on error, try to restore styles
      try {
        document.body.style.width = "";
        document.body.style.minWidth = "";
        const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
        if (viewport) viewport.content = "width=device-width, initial-scale=1";
        const input = document.querySelector(".all-services-containers") as HTMLElement | null;
        if (input) {
          input.style.cssText = "";
          input.classList.remove("force-desktop");
        }
      } catch (restoreError) {
        console.error("Failed to restore styles after error", restoreError);
      }
    }
  }}
>
  ⬇ Download Consent Form PDF
</button>
        </div>
      </div>
      <div className="form-services-container">
        <div className="form-headerss">
          <div className="header-leftss">
            <img src="/logo.png" alt="DOH Logo" />
          </div>
          <div className="header-centerss">
            <p>Department of Health</p>
            <p>Treatment and Rehabilitation Center Argao</p>
            <h1>OUTPATIENT AND AFTERCARE DIVISION</h1>
            <h4>REQUEST FORM FOR ASSESSMENT</h4>
          </div>
          <div className="header-rightss">
            <p>Document No.: TRC-AOD-FM03</p>
            <p>Effective Date: 10 July 2023</p>
            <p>Revision No.: 1</p>
            <p>Page No.: Page 1 of 1</p>
          </div>
        </div>
        <table className="form-bodys">
          <tbody>
            <tr>
              <td><strong>Last Name:</strong></td>
              <td><input type="text" value={formData.lastName} readOnly /></td>
              <td><strong>First Name:</strong></td>
              <td><input type="text" value={formData.firstName} readOnly /></td>
              <td><strong>Middle Initial:</strong></td>
              <td><input type="text" maxLength={1} value={formData.middleInitial} readOnly /></td>
            </tr>
            <tr>
              <td><strong>Date of Request:</strong></td>
              <td><input type="date" value={formData.requestDate} readOnly /></td>
              <td><strong>Birthdate:</strong></td>
              <td><input type="date" value={formData.birthdate} readOnly /></td>
              <td><strong>Age:</strong></td>
              <td><input type="text" value={formData.age} readOnly /></td>
            </tr>
            <tr>
              <td><strong>Citizenship:</strong></td>
              <td><input type="text" value={formData.citizenship} readOnly /></td>
              <td><strong>House No.:</strong></td>
              <td><input type="text" value={formData.houseNo} readOnly /></td>
              <td><strong>Street:</strong></td>
              <td><input type="text" value={formData.street} readOnly /></td>
            </tr>
            <tr>
              <td><strong>Province:</strong></td>
              <td><input type="text" value={formData.province} readOnly /></td>
              <td><strong>Municipality:</strong></td>
              <td><input type="text" value={formData.municipality} readOnly /></td>
              <td><strong>Barangay:</strong></td>
              <td><input type="text" value={formData.barangay} readOnly /></td>
            </tr>
            <tr>
              <td><strong>Mobile Number:</strong></td>
              <td><input type="tel" value={formData.contact} readOnly /></td>
              <td><strong>Email:</strong></td>
              <td colSpan={2}><input type="email" value={formData.email} readOnly /></td>
            </tr>
          </tbody>
        </table>
        <div className="requirements-checklist">
          <h4>REQUIREMENTS CHECKLIST:</h4>
          <ul>
            <li>
              <input type="checkbox" checked={formData.checklist.courtOrder} readOnly /> Court Order/PAO/Lawyer’s
              Request/Employer’s Recommendation
            </li>
            <li>
              <input type="checkbox" checked={formData.checklist.officialReceipt} readOnly /> Official Receipt/Charge to
              MAIP
            </li>
            <li>
              <input type="checkbox" checked={formData.checklist.requestForm} readOnly /> Filled out Request Form
            </li>
            <li>
              <input type="checkbox" checked={formData.checklist.dataPrivacy} readOnly /> Signed Data Privacy Notice and
              Consent Form
            </li>
            <li>
              <input type="checkbox" checked={formData.checklist.hasValidID} readOnly /> Valid ID/Certificate of Discharge or
              Certificate of Detention with picture (For PDL)
            </li>
            <li>
              <input type="checkbox" checked={formData.checklist.vitalSigns} readOnly /> Vital Signs (Signed by
              Nurse-on-Duty/Nursing Attendant) (For PDL)
            </li>
          </ul>
        </div>
        <div className="signatories-section">
          <p className="signatory-header">
            To be filled out by Department of Health – Treatment and Rehabilitation Center (TRC) Argao staff
          </p>
          <div className="signatories-grid">
            <div className="sign-box">
              <h4>SIGNATORY I</h4>
              <p>DDE Coordinator’s</p>
              <p>Signature over Printed Name: ___________________________</p>
              <p>Date Accomplished: ___________________________</p>
            </div>
            <div className="sign-box">
              <h4>SIGNATORY II</h4>
              <p>Cashier’s or Billing’s</p>
              <p>Signature over Printed Name: ___________________________</p>
              <p>Date Accomplished: ___________________________</p>
            </div>
            <div className="sign-box">
              <h4>SIGNATORY III</h4>
              <p>Nursing Attendant’s</p>
              <p>Signature over Printed Name: ___________________________</p>
              <p>Date Accomplished: ___________________________</p>
            </div>
            <div className="sign-box">
              <h4>SIGNATORY IV</h4>
              <p>Physician’s</p>
              <p>Signature over Printed Name: ___________________________</p>
              <p>Date Accomplished: ___________________________</p>
            </div>
          </div>
        </div>
        <div className="button-container-consent2" style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            type="button"
            className="download-button-consent2"
            style={{
              backgroundColor: "#2a7d46",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
   onClick={async () => {
  try {
    const input = document.querySelector(".form-services-container") as HTMLElement | null;
    if (!input) {
      alert("Assessment form not found!");
      return;
    }

    const buttonContainer = document.querySelector(".button-container-consent2") as HTMLElement | null;
    if (buttonContainer) buttonContainer.style.display = "none";

    const clone = input.cloneNode(true) as HTMLElement;

    // === REPLACE INPUTS WITH TEXT ===
    clone.querySelectorAll('input:not([type="checkbox"]), textarea').forEach((el) => {
      const value = (el as HTMLInputElement).value.trim();
      if (value) {
        const span = document.createElement('span');
        span.textContent = value;
        const s = window.getComputedStyle(el);
        span.style.cssText = s.cssText;
        span.style.backgroundColor = 'transparent';
        span.style.border = 'none';
        el.parentNode?.replaceChild(span, el);
      } else {
        (el as HTMLElement).style.visibility = 'hidden';
      }
    });

    // === REPLACE CHECKBOXES WITH CHECK MARKS ===
    clone.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const checked = (cb as HTMLInputElement).checked;
      const symbol = document.createElement('span');
      symbol.textContent = checked ? '✓' : '☐';
      symbol.style.fontSize = '18px';
      symbol.style.fontWeight = 'bold';
      symbol.style.marginRight = '8px';
      symbol.style.color = checked ? '#2a7d46' : '#000';

      const li = cb.closest('li');
      if (li) {
        const text = li.textContent || '';
        const wrapper = document.createElement('span');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.appendChild(symbol);
        const textNode = document.createElement('span');
        textNode.textContent = text.replace(/^[✓☐]\s*/, '');
        wrapper.appendChild(textNode);
        li.innerHTML = '';
        li.appendChild(wrapper);
      }
    });

    // === CLEAN STYLES ===
    const style = document.createElement('style');
    style.innerHTML = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .form-services-container {
        width: 210mm;
        padding: 10mm;
        background: white;
        font-family: Arial, sans-serif;
      }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 5px; }
      .requirements-checklist ul {
        padding-left: 20px;
      }
      .signatories-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-top: 20px;
      }
      @media print {
        .signatories-grid { grid-template-columns: repeat(2, 1fr); }
      }
    `;
    clone.appendChild(style);

    clone.style.width = '210mm';
clone.style.minHeight = '297mm';
clone.style.padding = '10mm';
clone.style.background = 'white';
    document.body.appendChild(clone);

    await new Promise(r => setTimeout(r, 800));

    const canvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: clone.scrollWidth + 100,
      windowHeight: clone.scrollHeight + 100,
    });

    document.body.removeChild(clone);
    if (buttonContainer) buttonContainer.style.display = "";

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 310;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("Assessment_Request_Form.pdf");
    setDownloads(p => ({ ...p, assessmentForm: true }));
  } catch (err) {
    console.error("Assessment PDF Error:", err);
    alert("Failed to generate Assessment Form PDF.");
    const btn = document.querySelector(".button-container-consent2") as HTMLElement | null;
    if (btn) btn.style.display = "";
  }
}}
          >
            ⬇ Download Assessment Form PDF
          </button>
          <button
            type="button"
            className="next-button-consent2"
            style={{
              opacity: downloads.consentForm && downloads.assessmentForm ? 1 : 0.5,
              cursor: downloads.consentForm && downloads.assessmentForm ? "pointer" : "not-allowed",
            }}
            title={
              !downloads.consentForm || !downloads.assessmentForm
                ? "Please download both the Consent Form and Assessment Request Form before proceeding."
                : ""
            }
            onClick={handleNext}
          >
            Next ➡
          </button>
        </div>

      </div>

      {/* ====================== MODAL ====================== */}
{showModal && (
  <>
    <audio autoPlay>
      <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
    </audio>

    <div className="modal-overlay-service" onClick={closeModal}>
      <div className="modal-content-service" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-service">
          <img src="/logo.png" alt="DOH" className="modal-logo" />
          <h3>
            {modalType === "success" && "SUCCESS"}
            {modalType === "error" && "ERROR"}
            {modalType === "confirm" && "CONFIRM ACTION"}
          </h3>
        </div>

        <div className="modal-body">
          <p style={{ whiteSpace: "pre-line" }}>{modalMessage}</p>
        </div>

        <div className="modal-footer">
          {modalType === "confirm" && (
            <>
              <button className="modal-btn cancel" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={() => {
                  closeModal();
                  onModalConfirm();
                }}
              >
                Confirm
              </button>
            </>
          )}
          {(modalType === "error" || modalType === "success") && (
            <button
              className="modal-btn ok"
              onClick={closeModal}
            >
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

export default ConsentForm;