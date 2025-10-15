import React, { useState, useEffect, useRef } from "react";
import "../../assets/CourtOrderForm.css";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

interface LawyersRequestFormProps {
  onNavigate?: (
    targetView: "officialreceipt" | "confirm" | "allservices" | "labservices" | "pao" | "employee-recommendation" | "lawyersrequest",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

interface FileData {
  file: File;
  base64: string | null;
}

const LawyersRequestForm: React.FC<LawyersRequestFormProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (patientId) {
      const fetchPatient = async () => {
        try {
          const docRef = doc(db, "Patients", patientId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            console.log("📌 Patient from Firestore:", snap.data());
          } else {
            console.warn("No patient found with ID:", patientId);
          }
        } catch (err) {
          console.error("Error fetching patient:", err);
          setError("Failed to fetch patient data.");
        }
      };
      fetchPatient();
    }

    if (formData) {
      console.log("📌 FormData from EmployeeRecommendation:", formData);
    }
  }, [patientId, formData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const newFiles: FileData[] = [];
      let hasError = false;

      files.forEach((file) => {
        if (file.size > 700 * 1024) {
          setError(
            `File "${file.name}" exceeds 700KB limit to fit Firestore constraints.`
          );
          hasError = true;
          return;
        }
        if (!allowedTypes.includes(file.type)) {
          setError(
            `File "${file.name}" is an unsupported type. Please upload a PDF, image, or Word document.`
          );
          hasError = true;
          return;
        }
        if (uploadedFiles.some((existing) => existing.file.name === file.name)) {
          setError(
            `File "${file.name}" is already uploaded. Please choose a different file.`
          );
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
                item.file.name === fileData.file.name
                  ? { ...item, base64: result }
                  : item
              )
            );
            console.log(
              `Base64 generated for ${fileData.file.name}:`,
              result.substring(0, 50) + "..."
            );
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

  const handleViewFile = (fileName: string) => {
    const fileData = uploadedFiles.find((item) => item.file.name === fileName);
    if (fileData?.base64) {
      console.log(
        `Using Base64 for preview of ${fileName}:`,
        fileData.base64.substring(0, 50) + "..."
      );
    } else {
      console.warn(`No file available to view for ${fileName}.`);
      setError(`No file available for ${fileName}. Please select a file first.`);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles((prev) =>
      prev.filter((item) => item.file.name !== fileName)
    );
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    console.log(`File ${fileName} removed.`);
  };

  const handleCancel = () => {
    setUploadedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    console.log("All files canceled.");
  };

  const handleNext = async () => {
    try {
      if (uploadedFiles.some((fileData) => !fileData.base64)) {
        setError("Please ensure all uploaded lawyer's request documents are processed.");
        return;
      }

      const proceedWithUpload = window.confirm(
  uploadedFiles.length > 0
    ? "Are you sure you want to proceed with the uploaded lawyer's request documents?\n\n⚠️ Note: Once you continue, you cannot change or remove these documents."
    : "No lawyer's request documents uploaded. Proceed anyway?\n\n⚠️ Note: Once you continue, you cannot go back to add documents."
);

      if (!proceedWithUpload) return;

      const appointmentId = formData?.appointmentId;
      if (!appointmentId) {
        setError(
          "No appointment ID provided. Please complete the previous steps first."
        );
        return;
      }

      // Get existing appointment to reuse displayId
      const appointmentRef = doc(db, "Appointments", appointmentId);
      const snap = await getDoc(appointmentRef);
      if (!snap.exists()) {
        setError("Appointment not found.");
        return;
      }

      const existingData = snap.data();
      const existingDisplayId = existingData?.displayId || "";

      const auth = getAuth();
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || "";
      if (!uid) {
        setError("User not authenticated. Please sign in.");
        return;
      }

      const lawyersRequestData = {
        patientId: patientId || formData?.patientId || "",
        controlNo: controlNo || formData?.controlNo || "",
        lawyersRequestFiles: uploadedFiles.length > 0
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

      await updateDoc(appointmentRef, lawyersRequestData);

      console.log("✅ Lawyer's Request updated in Appointments:", {
        appointmentId,
        displayId: existingDisplayId,
      });

      setError(null);
      onNavigate?.("officialreceipt", { ...formData, lawyersRequestData, appointmentId });
    } catch (err: unknown) {
      console.error("Error updating Lawyer's Request:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to update Lawyer's Request: ${errorMessage}`);
    }
  };

  const isWordDocument = (fileType: string) =>
    fileType === "application/msword" ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="courtorder p-6">
      <h2 className="text-2xl font-bold mb-4">Lawyer's Request Upload</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Upload Lawyer's Request Document</h3>
          <p className="note-message mb-2">
            Uploading a lawyer's request document is optional. You may proceed without uploading.
          </p>
          <input
            type="file"
            accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                  <span
                    onClick={() => handleViewFile(fileData.file.name)}
                    className={fileData.base64 ? "file-link" : "file-name"}
                  >
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
              {isWordDocument(fileData.file.type) ? (
                <div>
                  <p>Word documents cannot be previewed in the browser.</p>
                  <a
                    href={fileData.base64 || "#"}
                    download={fileData.file.name}
                    className="file-link"
                  >
                    Download {fileData.file.name}
                  </a>
                </div>
              ) : fileData.file.type === "application/pdf" ? (
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

export default LawyersRequestForm;