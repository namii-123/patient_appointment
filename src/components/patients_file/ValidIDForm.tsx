import React, { useState, useEffect, useRef } from "react";
import "../../assets/CourtOrderForm.css";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

interface NavigateData {
  patientId?: string;
  controlNo?: string;
  appointmentId?: string;
  displayId?: string;
  lastName?: string;
  firstName?: string;
  middleInitial?: string;
  age?: number | "";
  birthdate?: string;
  gender?: string;
  genderSpecify?: string;
  citizenship?: string;
  houseNo?: string;
  street?: string;
  province?: string;
  provinceCode?: string;
  municipality?: string;
  municipalityCode?: string;
  barangay?: string;
  barangayCode?: string;
  email?: string;
  contact?: string;
  patientCode?: string;
  checklist?: {
    courtOrder?: boolean;
    officialReceipt?: boolean;
    requestForm?: boolean;
    dataPrivacy?: boolean;
    hasValidID?: boolean;
    vitalSigns?: boolean;
  };
  files?: {
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
  validIDData?: any;
  hasValidID?: boolean;
  department?: string;
  [key: string]: any; // Allow additional fields from Appointments
}

interface ValidIDFormProps {
  onNavigate?: (
    targetView: "calendar" | "confirm" | "allservices" | "labservices" | "pao" | "employee-recommendation" | "consentform" | "validid" | "transaction",
    data?: NavigateData
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: NavigateData;
}

interface FileData {
  file: File;
  base64: string | null;
}

const ValidIDForm: React.FC<ValidIDFormProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData: initialFormData,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [patientData, setPatientData] = useState<NavigateData>({});

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const effectivePatientId = patientId || initialFormData?.patientId;
        if (effectivePatientId) {
          const docRef = doc(db, "Patients", effectivePatientId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const fetchedData = snap.data() as NavigateData;
            setPatientData((prev) => ({
              ...prev,
              ...fetchedData,
              patientId: effectivePatientId,
              controlNo: controlNo || initialFormData?.controlNo || fetchedData.controlNo,
              checklist: {
                courtOrder: fetchedData.checklist?.courtOrder || false,
                officialReceipt: fetchedData.checklist?.officialReceipt || false,
                requestForm: fetchedData.checklist?.requestForm || false,
                dataPrivacy: fetchedData.checklist?.dataPrivacy || false,
                hasValidID: fetchedData.checklist?.hasValidID || false,
                vitalSigns: fetchedData.checklist?.vitalSigns || false,
              },
            }));
            if (fetchedData.validIDFiles && fetchedData.validIDFiles.length > 0) {
              setUploadedFiles(
                fetchedData.validIDFiles.map((file: any) => ({
                  file: new File([], file.name, { type: file.type }),
                  base64: file.base64,
                }))
              );
            }
          } else {
            console.warn("No patient found with ID:", effectivePatientId);
          }
        }

        const auth = getAuth();
        const user = auth.currentUser;
        if (user && !effectivePatientId) {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setPatientData((prev) => ({
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
        console.error("Error fetching patient:", err);
        setError("Failed to fetch patient data.");
      }
    };

    fetchPatient();
  }, [patientId, initialFormData, controlNo]);

  useEffect(() => {
    if (initialFormData) {
      console.log("📌 FormData from Previous Step:", initialFormData);
      setPatientData((prev) => ({
        ...prev,
        ...initialFormData,
        checklist: {
          ...prev.checklist,
          ...initialFormData.checklist,
          hasValidID: initialFormData.hasValidID || prev.checklist?.hasValidID || false,
        },
      }));
    }
  }, [initialFormData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

      const newFiles: FileData[] = [];
      let hasError = false;

      files.forEach((file) => {
        if (file.size > 700 * 1024) {
          setError(`File "${file.name}" exceeds 700KB limit to fit Firestore constraints.`);
          hasError = true;
          return;
        }
        if (!allowedTypes.includes(file.type)) {
          setError(`File "${file.name}" is an unsupported type. Please upload a JPG, PNG, or PDF.`);
          hasError = true;
          return;
        }
        if (uploadedFiles.some((existing) => existing.file.name === file.name)) {
          setError(`File "${file.name}" is already uploaded. Please choose a different file.`);
          hasError = true;
          return;
        }
        newFiles.push({ file, base64: null });
      });

      if (hasError) {
        return;
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setError(null);

      newFiles.forEach((fileData) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string | null;
          if (result) {
            setUploadedFiles((prev) =>
              prev.map((item) =>
                item.file.name === fileData.file.name ? { ...item, base64: result } : item
              )
            );
            console.log(`Base64 generated for ${fileData.file.name}:`, result.substring(0, 50) + "...");
          } else {
            setError(`Failed to generate Base64 for "${fileData.file.name}".`);
          }
        };
        reader.onerror = () => {
          setError(`Failed to read file "${fileData.file.name}".`);
        };
        reader.readAsDataURL(fileData.file);
      });
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((item) => item.file.name !== fileName));
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    console.log(`File ${fileName} removed.`);
  };

  const handleNext = async () => {
    try {
      if (uploadedFiles.some((fileData) => !fileData.base64)) {
        setError("Please ensure all uploaded ID documents are processed.");
        return;
      }

      const proceedWithUpload = window.confirm(
        uploadedFiles.length > 0
          ? "Are you sure you want to proceed with the uploaded Valid ID documents?\n\n⚠️ Note: Once you continue, you cannot change or remove these documents."
          : "No Valid ID uploaded. Proceed anyway?\n\n⚠️ Note: Once you continue, you cannot go back to add an ID."
      );

      if (!proceedWithUpload) return;

      const auth = getAuth();
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || "";
      if (!uid) {
        setError("User not authenticated. Please sign in.");
        return;
      }

      const effectivePatientId = patientId || initialFormData?.patientId;
      const effectiveControlNo = controlNo || initialFormData?.controlNo || patientData.controlNo;
      const appointmentId = initialFormData?.appointmentId;

      if (!effectivePatientId) {
        setError("No patient ID provided. Please complete the previous steps first.");
        return;
      }

      if (!appointmentId) {
        setError("No appointment ID provided. Please complete the previous steps first.");
        return;
      }

      const appointmentRef = doc(db, "Appointments", appointmentId);
      const snap = await getDoc(appointmentRef);
      if (!snap.exists()) {
        setError("Appointment not found.");
        return;
      }

      const existingData = snap.data() as NavigateData;
      const existingDisplayId = existingData?.displayId || "";

      const validIDData = {
        patientId: effectivePatientId,
        controlNo: effectiveControlNo,
        validIDFiles:
          uploadedFiles.length > 0
            ? uploadedFiles.map((fileData) => ({
                name: fileData.file.name,
                base64: fileData.base64,
                type: fileData.file.type,
                uploadedAt: new Date().toISOString(),
              }))
            : [],
        displayId: existingDisplayId,
        department: "DDE",
      };

      await updateDoc(appointmentRef, validIDData);

      console.log("✅ Valid ID updated in Appointments:", {
        appointmentId,
        displayId: existingDisplayId,
      });

      if (onNavigate) {
        const navigateData: NavigateData = {
          ...patientData,
          ...initialFormData,
          patientId: effectivePatientId,
          controlNo: effectiveControlNo,
          appointmentId,
          validIDData,
          hasValidID: uploadedFiles.length > 0,
          department: "DDE",
          checklist: {
            ...patientData.checklist,
            ...initialFormData?.checklist,
            hasValidID: uploadedFiles.length > 0,
          },
          ...existingData, // Include all existing Appointments data
        };
        console.log("📌 ValidIDForm: Navigating to consentform with data:", navigateData);
        onNavigate("consentform", navigateData);
      }

      setError(null);
    } catch (err: unknown) {
      console.error("Error updating Valid ID:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to update Valid ID: ${errorMessage}`);
    }
  };

  return (
    <div className="courtorder p-6">
      <h2 className="text-2xl font-bold mb-4">Valid ID Upload</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Upload Valid ID</h3>
          <p className="note-message mb-2">
            Valid ID/ Certificate of Discharge or Certificate of Detention with picture (For PDL). You may proceed without uploading.
          </p>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            multiple
            onChange={handleFileChange}
            className="border p-2 rounded w-full"
            ref={fileInputRef}
          />
          {uploadedFiles.length > 0 && (
            <div className="mt-2">
              {uploadedFiles.map((fileData, index) => (
                <p key={index} className="flex items-center gap-2">
                  Selected file:{" "}
                  <span className={fileData.base64 ? "file-link" : "file-name"}>
                    {fileData.file.name}
                  </span>
                  <div className="x-button">
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(fileData.file.name)}
                      className="cancel-buttonsss"
                      title={`Remove ${fileData.file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </p>
              ))}
            </div>
          )}
        </div>
      </form>

      {uploadedFiles.length > 0 && (
        <div className="file-preview mt-6">
          <h3 className="font-semibold text-lg mb-3">File Preview</h3>
          {uploadedFiles.map((fileData, index) => (
            <div key={index} className="mb-4">
              {fileData.file.type === "application/pdf" ? (
                <iframe
                  src={fileData.base64 || ""}
                  className="preview-iframe"
                  title={`File Preview ${fileData.file.name}`}
                />
              ) : (
                <img
                  src={fileData.base64 || ""}
                  alt={`File Preview ${fileData.file.name}`}
                  className="preview-image"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="button-container-dde">
        <button type="button" className="next-button-dde" onClick={handleNext}>
          Next ➡
        </button>
      </div>
    </div>
  );
};

export default ValidIDForm;