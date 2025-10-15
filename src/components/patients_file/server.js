const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCMuRzFuOHYmbNNYxQ2Pi7MKebVamarVng",
  authDomain: "login-auth-90733.firebaseapp.com",
  projectId: "login-auth-90733",
  storageBucket: "login-auth-90733.appspot.com", 
  messagingSenderId: "869977584945",
  appId: "1:869977584945:web:b4b03ad9757473f13aac10",
  measurementId: "G-RQ2BS7ZCHP"
};

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Initialize Express app
const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// File upload endpoint
app.post('/upload', upload.fields([
  { name: 'courtOrder', maxCount: 1 },
  { name: 'pao', maxCount: 1 },
  { name: 'employersRecommendation', maxCount: 1 },
  { name: 'officialReceipt', maxCount: 1 },
  { name: 'requestForm', maxCount: 1 },
  { name: 'dataPrivacy', maxCount: 1 },
  { name: 'validID', maxCount: 1 },
  { name: 'vitalSigns', maxCount: 1 },
  { name: 'lawyersRequest', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files;
    const filePaths = {};
    for (const key in files) {
      filePaths[key] = `/uploads/${files[key][0].filename}`;
    }

    const patientData = req.body;
    patientData.fileURLs = filePaths;
    patientData.controlNo = patientData.controlNo || `TRC-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`;
    patientData.createdAt = new Date().toISOString();

    // Save to Firestore
    const patientRef = doc(db, "Patients", patientData.controlNo);
    await setDoc(patientRef, patientData);

    res.status(200).json({ message: 'Files uploaded and data saved', fileURLs: filePaths, patientId: patientData.controlNo });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
