import React, { useState,  useRef } from "react";
import "../../assets/CourtOrderForm.css";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

interface FileData {
  file: File;
  base64: string | null;
}

interface VoluntaryValidIDFormProps {
  onNavigate?: (
    targetView:
      | "lawyersrequest"
      | "consentform"
      | "confirm"
      | "allservices"
      | "transaction"
      | "voluntaryform",
    data?: any
  ) => void;
  patientId?: string;
  controlNo?: string;
  formData?: any;
}

const VoluntaryValidIDForm: React.FC<VoluntaryValidIDFormProps> = ({
  onNavigate,

  formData: initialFormData,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal system (same sa tanan nimo nga upload forms)
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

  // File handling (exact same logic)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    const newFiles: FileData[] = [];
    let hasErr = false;

    files.forEach((f) => {
      if (f.size > 700 * 1024) {
        setError(`"${f.name}" exceeds 700 KB limit`);
        hasErr = true;
        return;
      }
      if (!allowed.includes(f.type)) {
        setError(`"${f.name}" – only JPG, PNG, or PDF allowed`);
        hasErr = true;
        return;
      }
      if (uploadedFiles.some((x) => x.file.name === f.name)) {
        setError(`"${f.name}" is already uploaded`);
        hasErr = true;
        return;
      }
      newFiles.push({ file: f, base64: null });
    });

    if (hasErr) return;

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setError(null);

    newFiles.forEach((fd) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setUploadedFiles((prev) =>
          prev.map((it) =>
            it.file.name === fd.file.name ? { ...it, base64: b64 } : it
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

  // Submit logic – tailored for Voluntary path
  const handleNext = () => {
    if (uploadedFiles.length === 0) {
      openModal("Please upload at least one Valid ID.", "error");
      return;
    }

    if (uploadedFiles.some((f) => !f.base64)) {
      openModal("Processing your files… please wait.", "error");
      return;
    }

    openModal(
      `Submit ${uploadedFiles.length} Valid ID file(s)?\nYou cannot edit them after submission.`,
      "confirm",
      performUpload
    );
  };

  const performUpload = async () => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) throw new Error("User not authenticated");

      const appointmentId = initialFormData?.appointmentId;
      if (!appointmentId) throw new Error("Missing appointment ID");

      const apptRef = doc(db, "Appointments", appointmentId);
      const snap = await getDoc(apptRef);
      if (!snap.exists()) throw new Error("Appointment record not found");

      const existing = snap.data();
      const displayId = existing?.displayId || "";

      const validIDData = {
        hasValidID: true,
        validIDFiles: uploadedFiles.map((f) => ({
          name: f.file.name,
          base64: f.base64,
          type: f.file.type,
          uploadedAt: new Date().toISOString(),
        })),
        validIDUploadedAt: new Date().toISOString(),
      };

      await updateDoc(apptRef, validIDData);

      openModal(
        `Valid ID uploaded successfully!\nAppointment ID: ${displayId}`,
        "success"
      );

      // Sa performUpload() → sa setTimeout
setTimeout(() => {
  onNavigate?.("consentform", {
    ...initialFormData, // ← KINI ANG IMPORTANT! Nagdala sa tanang previous data
    hasValidID: true,
    validIDFiles: uploadedFiles.map((f) => ({
      name: f.file.name,
      base64: f.base64!,
      type: f.file.type,
      uploadedAt: new Date().toISOString(),
    })),
    appointmentId: initialFormData?.appointmentId,
  });
}, 2000);
    } catch (err: any) {
      console.error("Upload error:", err);
      openModal(`Upload failed: ${err.message || err}`, "error");
    }
  };

  return (
    <div className="courtorder p-6">
      <h2 className="text-2xl font-bold mb-4">
        Valid ID Upload (Voluntary Admission)
      </h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">
            Upload Valid Government-Issued ID
          </h3>
          <p className="note-message mb-2" style={{ color: "#d32f2f", fontWeight: "bold" }}>
            REQUIRED: At least one (1) Valid ID must be uploaded.
          </p>
         

          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
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
          <h3 className="font-semibold text-lg mb-4">Preview</h3>
          {uploadedFiles.map((fd, i) => (
            <div key={i} className="mb-6 border rounded p-2">
              {fd.file.type === "application/pdf" ? (
                <iframe
                  src={fd.base64!}
                  className="preview-iframe w-full"
                  title={fd.file.name}
                  style={{ height: "500px" }}
                />
              ) : (
                <img
                  src={fd.base64!}
                  alt={fd.file.name}
                  className="preview-image max-w-full rounded mx-auto"
                />
              )}
              <p className="text-center mt-2 text-sm text-gray-600">
                {fd.file.name}
              </p>
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

      {/* Modal (same design) */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" />
          </audio>

          <div className="modal-overlay-service" onClick={closeModal}>
            <div
              className="modal-content-service"
              onClick={(e) => e.stopPropagation()}
            >
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

export default VoluntaryValidIDForm;