import React, { useState, useEffect, useRef } from "react";
import "../../assets/CourtOrderForm.css";
import { doc, updateDoc, collection, addDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

interface CourtOrderFormProps {
  onNavigate?: (
    targetView: "calendar" | "confirm" | "formdde" | "labservices" | "pao",
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

const CourtOrderForm: React.FC<CourtOrderFormProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData: propFormData,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(propFormData || {});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState(false);
const [modalMessage, setModalMessage] = useState("");
const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
const [onConfirm, setOnConfirm] = useState<() => void>(() => {});


const openModal = (msg: string, type: "confirm" | "error" | "success", callback?: () => void) => {
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
    const fetchPatientData = async () => {
      try {
        setFormData(propFormData || {});
        console.log("📌 FormData from propFormData:", propFormData);

        if (patientId) {
          const docRef = doc(db, "Patients", patientId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const patientData = snap.data();
            setFormData((prev: any) => ({
              ...prev,
              ...patientData,
              patientId,
              controlNo: controlNo || patientData.controlNo || prev.controlNo,
              patientCode: patientData.patientCode || prev.patientCode || "",
            }));
            console.log("📌 Patient data from Firestore:", patientData);
          } else {
            console.warn("No patient found with ID:", patientId);
            setError("No patient data found. Please ensure patient details are saved.");
          }
        }
      } catch (err) {
        console.error("Error fetching patient data:", err);
        setError("Failed to fetch patient data.");
      }
    };

    fetchPatientData();
  }, [propFormData, patientId, controlNo]);

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
          setError(`File "${file.name}" exceeds 700KB limit to fit Firestore constraints.`);
          hasError = true;
          return;
        }
        if (!allowedTypes.includes(file.type)) {
          setError(`File "${file.name}" is an unsupported type. Please upload a PDF, image, or Word document.`);
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
      console.log(`Using Base64 for preview of ${fileName}:`, fileData.base64.substring(0, 50) + "...");
    } else {
      console.warn(`No file available to view for ${fileName}.`);
      setError(`No file available for ${fileName}. Please select a file first.`);
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
    if (uploadedFiles.length === 0 || uploadedFiles.some((fileData) => !fileData.base64)) {
      openModal("Please upload at least one court order file and ensure all files are processed.", "error");
      return;
    }

    // REPLACE window.confirm with openModal
    openModal(
      "You are about to submit the court order files.\n\nNote: Once uploaded, the files cannot be changed. Please make sure all details are correct before proceeding.",
      "confirm",
      async () => {
        try {
          // Generate date and prefix
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const prefix = "APT";

          const snapshot = await getDoc(doc(db, "Counters", dateStr));
          let count = 1;
          if (snapshot.exists()) {
            count = snapshot.data().count + 1;
            await updateDoc(doc(db, "Counters", dateStr), { count });
          } else {
            await setDoc(doc(db, "Counters", dateStr), { count: 1 });
          }

          const padded = String(count).padStart(3, "0");
          const displayId = `${prefix}-${dateStr}-${padded}`;

          const auth = getAuth();
          const currentUser = auth.currentUser;
          const uid = currentUser?.uid || "";
          if (!uid) {
            openModal("User not authenticated. Please sign in.", "error");
            return;
          }

          const courtOrderData = {
            patientId: patientId || formData?.patientId || "",
            controlNo: controlNo || formData?.controlNo || "",
            patientCode: formData.patientCode || "",
            courtFiles: uploadedFiles.map((fileData) => ({
              name: fileData.file.name,
              base64: fileData.base64,
              type: fileData.file.type,
              uploadedAt: new Date().toISOString(),
            })),
            displayId,
            dateStr,
            uid,
            department: "DDE",
          };

          const docRef = await addDoc(collection(db, "Appointments"), courtOrderData);
          await updateDoc(docRef, { appointmentId: docRef.id });

          console.log("Court order saved to Appointments:", { appointmentId: docRef.id, displayId });

          // SUCCESS MODAL
          openModal(`Court order uploaded successfully!\nAppointment ID: ${displayId}`, "success");

          // Navigate after 2 seconds
          setTimeout(() => {
            onNavigate?.("pao", { ...formData, courtOrderData, appointmentId: docRef.id, displayId });
          }, 2000);

        } catch (err: unknown) {
          console.error("Error saving court order:", err);
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          openModal(`Failed to save court order: ${errorMessage}`, "error");
        }
      }
    );
  } catch (err: unknown) {
    console.error("Error in handleNext:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    openModal(`Unexpected error: ${errorMessage}`, "error");
  }
};

  const isWordDocument = (fileType: string) =>
    fileType === "application/msword" ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="courtorder p-6">
      <h2 className="text-2xl font-bold mb-4">Court Order Upload</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Upload Court Order</h3>
          <p className="note-message mb-2">At least one court order file is required before proceeding.</p>
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
                  <div className="selected">
                  Selected file:{" "}
                 
                  <span
                    onClick={() => handleViewFile(fileData.file.name)}
                    className={fileData.base64 ? "file-link" : "file-name"}
                  >
                    {fileData.file.name}
                  </span>
                   </div>
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
                    <button className="modal-btn cancel" onClick={closeModal}>Cancel</button>
                    <button
                      className="modal-btn confirm"
                      onClick={() => {
                        closeModal();
                        onConfirm();
                      }}
                    >
                      Confirm
                    </button>
                  </>
                )}
                {(modalType === "error" || modalType === "success") && (
                  <button className="modal-btn ok" onClick={closeModal}>
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
  

export default CourtOrderForm;
