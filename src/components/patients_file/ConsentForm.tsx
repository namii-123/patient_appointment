import React, { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import "../../assets/ConsentForm.css";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, addDoc, updateDoc, setDoc } from "firebase/firestore";
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

  // 1. Check downloads
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

  // 2. Confirm save
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

        // Fetch UserId
        const userSnap = await getDoc(doc(db, "Users", user.uid));
        let UserId = user.uid;
        if (userSnap.exists()) {
          UserId = userSnap.data()?.UserId || user.uid;
        }

        const updatedFormData = { ...formData, controlNo: effectiveControlNo, patientCode };
        setFormData(updatedFormData);

        // Save patient
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

        // Success modal + navigate
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
                await new Promise((resolve) => setTimeout(resolve, 300));
                window.scrollTo(0, 0);
                const canvas = await html2canvas(input, {
                  scale: 2,
                  useCORS: true,
                  scrollY: -window.scrollY,
                });
                if (buttonContainer) buttonContainer.style.display = "";
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
    if (!input) return alert("Form not found!");

    const buttonContainer = document.querySelector(".button-container-consent2") as HTMLElement | null;
    if (buttonContainer) buttonContainer.style.display = "none";

    const clone = input.cloneNode(true) as HTMLElement;

    // === 1. INPUTS → TEXT ===
    const replaceInputs = (c: HTMLElement) => {
      c.querySelectorAll('input:not([type="checkbox"]), textarea, select').forEach((el) => {
        const value = (el as HTMLInputElement).value.trim();
        if (value) {
          const span = document.createElement('span');
          span.textContent = value;
          const s = window.getComputedStyle(el);
          span.style.cssText = s.cssText;
          span.style.backgroundColor = 'transparent';
          span.style.border = 'none';
          span.style.display = 'inline-block';
          el.parentNode?.replaceChild(span, el);
        } else {
          (el as HTMLElement).style.visibility = 'hidden';
        }
      });
    };

    // === 2. CHECKBOXES → REAL SYMBOLS (checked/unchecked) ===
    const replaceCheckboxesWithSymbols = (c: HTMLElement) => {
      c.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        const isChecked = (cb as HTMLInputElement).checked;

        const symbol = document.createElement('span');
        symbol.textContent = isChecked ? 'checked' : 'unchecked';
        symbol.style.cssText = `
          display: inline-block;
          width: 14px; height: 14px;
          border: 1.5px solid #000;
          border-radius: 2px;
          margin-right: 8px;
          font-size: 12px;
          line-height: 13px;
          text-align: center;
          background: ${isChecked ? '#2a7d46' : '#fff'};
          color: ${isChecked ? 'white' : 'transparent'};
        `;

        let labelText = '';
        const label = document.querySelector(`label[for="${cb.id}"]`) ||
                      cb.closest('label') ||
                      cb.nextElementSibling;

        if (label && label instanceof HTMLElement) {
          labelText = label.textContent?.trim() || '';
          label.style.visibility = 'hidden';
        }

        const line = document.createElement('div');
        line.style.display = 'flex';
        line.style.alignItems = 'center';
        line.style.fontSize = '14px';
        line.style.marginBottom = '3px';
        line.appendChild(symbol);
        if (labelText) {
          const text = document.createElement('span');
          text.textContent = labelText;
          line.appendChild(text);
        }

        cb.parentNode?.replaceChild(line, cb);
        if (label && label.parentNode) label.remove();
      });
    };

    // === APPLY FIXES ===
    replaceInputs(clone);
    replaceCheckboxesWithSymbols(clone);

    // === RENDER OFF-SCREEN ===
    clone.style.cssText = `
      position: absolute; left: -9999px; top: 0;
      width: ${input.offsetWidth}px; background: white; padding: 20px;
    `;
    document.body.appendChild(clone);

    await new Promise(r => setTimeout(r, 600));
    window.scrollTo(0, 0);

    // === CAPTURE ===
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: clone.scrollWidth + 100,
      windowHeight: clone.scrollHeight + 100,
    });

    document.body.removeChild(clone);
    if (buttonContainer) buttonContainer.style.display = "";

    // === HEADER ===
    let headerImg = "", headerH = 0;
    const headerEl = document.querySelector(".form-headerss") as HTMLElement | null;
    if (headerEl) {
      const hClone = headerEl.cloneNode(true) as HTMLElement;
      hClone.style.position = 'absolute'; hClone.style.left = '-9999px';
      document.body.appendChild(hClone);
      const hCanvas = await html2canvas(hClone, { scale: 2 });
      headerImg = hCanvas.toDataURL("image/png");
      headerH = (hCanvas.height * 210) / hCanvas.width;
      document.body.removeChild(hClone);
    }

    // === PDF ===
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const m = 10;
    const imgW = w - m * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    let left = imgH;
    let pos = 15;

    pdf.addImage(imgData, "PNG", m, pos, imgW, imgH);
    left -= h - 30;

    while (left > 0) {
      pdf.addPage();
      pos = 15 - (h - 30 - left);
      if (headerImg) pdf.addImage(headerImg, "PNG", m, 15, imgW, headerH);
      pdf.addImage(imgData, "PNG", m, pos + headerH, imgW, imgH);
      left -= h - 30 - headerH;
    }

    pdf.save("AssessmentRequestForm.pdf");
    setDownloads(p => ({ ...p, assessmentForm: true }));

  } catch (err) {
    console.error(err);
    alert("PDF generation failed.");
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