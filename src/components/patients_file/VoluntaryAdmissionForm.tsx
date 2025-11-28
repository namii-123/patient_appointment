import React, { useState, useEffect, useRef } from "react";
import "../../assets/CourtOrderForm.css";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

interface FileData {
  file: File;
  base64: string | null;
}

interface VoluntaryAdmissionFormProps {
  onNavigate?: (
    targetView:
      | "confirm"
      | "allservices"
      | "labservices"
      | "pao"
      | "employee-recommendation"
      | "voluntary-admission"
      | "voluntaryid",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

const VoluntaryAdmissionForm: React.FC<VoluntaryAdmissionFormProps> = ({
  onNavigate,
  patientId,
  controlNo,
  formData,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal System
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">("confirm");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  const openModal = (
    msg: string,
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

  // File Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

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
        setError(`"${file.name}" exceeds 700KB limit.`);
        hasError = true;
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`"${file.name}" is not allowed. Use PDF, image or Word doc.`);
        hasError = true;
        return;
      }
      if (uploadedFiles.some((f) => f.file.name === file.name)) {
        setError(`"${file.name}" is already uploaded.`);
        hasError = true;
        return;
      }
      newFiles.push({ file, base64: null });
    });

    if (hasError) return;

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setError(null);

    newFiles.forEach((fd) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedFiles((prev) =>
          prev.map((item) =>
            item.file.name === fd.file.name ? { ...item, base64 } : item
          )
        );
      };
      reader.readAsDataURL(fd.file);
    });
  };

  const handleRemoveFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file.name !== name));
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNext = async () => {
    if (uploadedFiles.length === 0) {
      openModal(
        "No Voluntary Admission document uploaded.\nYou may proceed without it.",
        "confirm",
        () => {
          setTimeout(() => {
            onNavigate?.("voluntaryid", {
              ...formData,
              hasVoluntaryAdmission: false,
              appointmentId: formData?.appointmentId,
            });
          }, 1000);
        }
      );
      return;
    }

    if (uploadedFiles.some((f) => !f.base64)) {
      openModal("Processing files… please wait.", "error");
      return;
    }

    openModal(
      `Submit ${uploadedFiles.length} Voluntary Admission document(s)?\nCannot edit after submission.`,
      "confirm",
      async () => {
        try {
          const appointmentId = formData?.appointmentId;
          if (!appointmentId) throw new Error("Missing appointment ID");

          const appointmentRef = doc(db, "Appointments", appointmentId);
          const snap = await getDoc(appointmentRef);
          if (!snap.exists()) throw new Error("Appointment not found");

          const displayId = snap.data()?.displayId || "";

          const voluntaryData = {
            hasVoluntaryAdmission: true,
            voluntaryAdmissionFiles: uploadedFiles.map((f) => ({
              name: f.file.name,
              base64: f.base64,
              type: f.file.type,
              size: f.file.size,
              uploadedAt: new Date().toISOString(),
            })),
            voluntaryAdmissionUploadedAt: new Date().toISOString(),
          };

          await updateDoc(appointmentRef, {
            ...voluntaryData,
            checklist: {
              ...(snap.data()?.checklist || {}),
              voluntaryAdmission: true,
            },
          });

          openModal(
            `Voluntary Admission document(s) uploaded successfully!\nAppointment ID: ${displayId}`,
            "success"
          );

          // Sa imong handleNext() → sa setTimeout nga part
setTimeout(() => {
  onNavigate?.("voluntaryid", {
    ...formData,
    hasVoluntaryAdmission: uploadedFiles.length > 0,
    voluntaryAdmissionFiles: uploadedFiles.map((f) => ({
      name: f.file.name,
      base64: f.base64!,
      type: f.file.type,
      size: f.file.size,
      uploadedAt: new Date().toISOString(),
    })),
    appointmentId: formData?.appointmentId,
  });
}, 2000);
        } catch (err: any) {
          openModal(`Upload failed: ${err.message}`, "error");
        }
      }
    );
  };

  const isWordDocument = (type: string) =>
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="courtorder p-6">
      {/* FIXED: Changed all text */}
        <h2 className="text-2xl font-bold mb-4">Employee Recommendation Upload</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
           <h3 className="font-semibold text-lg mb-3">Upload Employee Recommendation Document(OPTIONAL)</h3>
          <p className="note-message mb-2">
            This document is OPTIONAL. You may proceed without uploading.
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
              {uploadedFiles.map((fd, i) => (
                <p key={i} className="flex items-center gap-2">
                  Selected file:{" "}
                  <span className={fd.base64 ? "file-link" : "file-name"}>
                    {fd.file.name}
                  </span>
                  <div className="x-button">
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(fd.file.name)}
                    className="cancel-buttonsss"
                    title={`Remove ${fd.file.name}`}
                  >
                    x
                  </button>
                  </div>
                </p>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Preview */}
      {uploadedFiles.length > 0 && (
        <div className="file-preview mt-8">
          <h3 className="font-semibold text-lg mb-4">File Preview</h3>
          {uploadedFiles.map((fd, i) => (
            <div key={i} className="mb-6">
              {isWordDocument(fd.file.type) ? (
                <div>
                  <p>Word document – cannot preview in browser.</p>
                  <a href={fd.base64!} download={fd.file.name} className="file-link">
                    Download {fd.file.name}
                  </a>
                </div>
              ) : fd.file.type === "application/pdf" ? (
                <iframe
                  src={fd.base64!}
                  className="preview-iframe"
                  title={fd.file.name}
                />
              ) : (
                <img
                  src={fd.base64!}
                  alt={fd.file.name}
                  className="preview-image max-w-full rounded"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next Button */}
      <div className="button-container-dde mt-8">
        <button type="button" className="next-button-dde" onClick={handleNext}>
          Next
        </button>
      </div>

      {/* Modal */}
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

export default VoluntaryAdmissionForm;