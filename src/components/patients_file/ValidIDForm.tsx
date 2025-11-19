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
  [key: string]: any;
}

interface ValidIDFormProps {
  onNavigate?: (
    targetView:
      | "calendar"
      | "confirm"
      | "allservices"
      | "labservices"
      | "pao"
      | "employee-recommendation"
      | "consentform"
      | "validid"
      | "transaction",
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

/* --------------------------------------------------------------- */
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

  /* -------------------------- Modal state -------------------------- */
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "error" | "success">(
    "confirm"
  );
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
  /* ---------------------------------------------------------------- */

  /* ---------------------- Load patient / user ---------------------- */
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
              controlNo:
                controlNo ||
                initialFormData?.controlNo ||
                fetchedData.controlNo,
              checklist: {
                courtOrder: fetchedData.checklist?.courtOrder ?? false,
                officialReceipt:
                  fetchedData.checklist?.officialReceipt ?? false,
                requestForm: fetchedData.checklist?.requestForm ?? false,
                dataPrivacy: fetchedData.checklist?.dataPrivacy ?? false,
                hasValidID: fetchedData.checklist?.hasValidID ?? false,
                vitalSigns: fetchedData.checklist?.vitalSigns ?? false,
              },
            }));

            if (fetchedData.validIDFiles?.length) {
              setUploadedFiles(
                fetchedData.validIDFiles.map((file: any) => ({
                  file: new File([], file.name, { type: file.type }),
                  base64: file.base64,
                }))
              );
            }
          }
        }

        const auth = getAuth();
        const user = auth.currentUser;
        if (user && !effectivePatientId) {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const u = userSnap.data();
            setPatientData((prev) => ({
              ...prev,
              firstName: u.firstName ?? "",
              lastName: u.lastName ?? "",
              middleInitial: u.middleInitial ?? "",
              email: u.email ?? "",
              contact: u.contactNumber ?? "",
              age: u.age ?? "",
              birthdate: u.birthdate ?? "",
              gender: u.gender ?? "",
              citizenship: u.citizenship ?? "",
              houseNo: u.houseNo ?? "",
              street: u.street ?? "",
              province: u.province ?? "",
              municipality: u.municipality ?? "",
              barangay: u.barangay ?? "",
            }));
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load patient data.");
      }
    };
    fetchPatient();
  }, [patientId, initialFormData, controlNo]);

  useEffect(() => {
    if (initialFormData) {
      setPatientData((prev) => ({
        ...prev,
        ...initialFormData,
        checklist: {
          ...prev.checklist,
          ...initialFormData.checklist,
          hasValidID:
            initialFormData.hasValidID ?? prev.checklist?.hasValidID ?? false,
        },
      }));
    }
  }, [initialFormData]);
  /* ---------------------------------------------------------------- */

  /* --------------------------- File handling --------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    const newFiles: FileData[] = [];
    let hasErr = false;

    files.forEach((f) => {
      if (f.size > 700 * 1024) {
        setError(`"${f.name}" exceeds 700 KB`);
        hasErr = true;
        return;
      }
      if (!allowed.includes(f.type)) {
        setError(`"${f.name}" – only JPG, PNG, PDF allowed`);
        hasErr = true;
        return;
      }
      if (uploadedFiles.some((x) => x.file.name === f.name)) {
        setError(`"${f.name}" already added`);
        hasErr = true;
        return;
      }
      newFiles.push({ file: f, base64: null });
    });

    if (hasErr) return;

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setError(null);

    // Convert to base64 **asynchronously**
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
      reader.onerror = () => setError(`Failed to read "${fd.file.name}"`);
      reader.readAsDataURL(fd.file);
    });
  };

  const handleRemoveFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((x) => x.file.name !== name));
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  /* ---------------------------------------------------------------- */

  /* -------------------------- NEXT / UPLOAD -------------------------- */
  const handleNext = () => {
    // 1. Wait for all base64
    if (uploadedFiles.some((f) => !f.base64)) {
      openModal("Please wait while files are being processed.", "error");
      return;
    }

    // 2. Build confirm message
    const msg =
      uploadedFiles.length > 0
        ? `You are about to submit ${uploadedFiles.length} Valid ID file(s).\n\nOnce submitted you **cannot** edit them.`
        : `No Valid ID uploaded.\n\nYou may continue, but you **cannot** add one later.`;

    openModal(msg, "confirm", performUpload);
  };

  const performUpload = async () => {
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not signed in");

      const effectivePatientId = patientId || initialFormData?.patientId;
      const effectiveControlNo =
        controlNo || initialFormData?.controlNo || patientData.controlNo;
      const appointmentId = initialFormData?.appointmentId;

      if (!effectivePatientId) throw new Error("Missing patient ID");
      if (!appointmentId) throw new Error("Missing appointment ID");

      const apptRef = doc(db, "Appointments", appointmentId);
      const snap = await getDoc(apptRef);
      if (!snap.exists()) throw new Error("Appointment not found");

      const existing = snap.data() as NavigateData;
      const displayId = existing?.displayId ?? "";

      const validIDData = {
        patientId: effectivePatientId,
        controlNo: effectiveControlNo,
        validIDFiles:
          uploadedFiles.length > 0
            ? uploadedFiles.map((f) => ({
                name: f.file.name,
                base64: f.base64,
                type: f.file.type,
                uploadedAt: new Date().toISOString(),
              }))
            : [],
        displayId,
        department: "DDE",
      };

      await updateDoc(apptRef, validIDData);

      // ---- SUCCESS MODAL ----
      openModal(
        uploadedFiles.length > 0
          ? `Valid ID uploaded!\nAppointment ID: ${displayId}`
          : `Proceeded without ID.\nAppointment ID: ${displayId}`,
        "success"
      );

      // ---- NAVIGATE after short delay ----
      setTimeout(() => {
        if (onNavigate) {
          const nav: NavigateData = {
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
            ...existing,
          };
          onNavigate("consentform", nav);
        }
      }, 2000);
    } catch (err: any) {
      console.error(err);
      openModal(`Upload failed: ${err.message ?? err}`, "error");
    }
  };
  /* ---------------------------------------------------------------- */

  return (
    <div className="courtorder p-6">
      <h2 className="text-2xl font-bold mb-4">Valid ID Upload</h2>

      {error && <div className="error-message text-red-500 mb-4">{error}</div>}

      <form className="space-y-6">
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">
            Upload Valid ID (OPTIONAL)
          </h3>
          <p className="note-message mb-2">
            Valid ID / Certificate of Discharge or Detention with picture (for
            PDL). You may proceed without uploading.
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

      {/* ------------------- PREVIEW ------------------- */}
      {uploadedFiles.length > 0 && (
        <div className="file-preview mt-6">
          <h3 className="font-semibold text-lg mb-3">File Preview</h3>
          {uploadedFiles.map((fd, i) => (
            <div key={i} className="mb-4">
              {fd.file.type === "application/pdf" ? (
                <iframe
                  src={fd.base64!}
                  className="preview-iframe"
                  title={fd.file.name}
                />
              ) : (
                <img
                  src={fd.base64!}
                  alt={fd.file.name}
                  className="preview-image"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ------------------- NEXT BUTTON ------------------- */}
      <div className="button-container-dde">
        <button
          type="button"
          className="next-button-dde"
          onClick={handleNext}
        >
          Next
        </button>
      </div>

      {/* ------------------- MODAL ------------------- */}
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

export default ValidIDForm;