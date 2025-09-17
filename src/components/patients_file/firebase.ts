// firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";






const firebaseConfig = {
  apiKey: "AIzaSyCMuRzFuOHYmbNNYxQ2Pi7MKebVamarVng",
  authDomain: "login-auth-90733.firebaseapp.com",
  projectId: "login-auth-90733",
  storageBucket: "login-auth-90733.appspot.com", 
  messagingSenderId: "869977584945",
  appId: "1:869977584945:web:b4b03ad9757473f13aac10",
  measurementId: "G-RQ2BS7ZCHP"
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);


export const googleProvider = new GoogleAuthProvider();


export const db = getFirestore(app);

export default app;
export const storage = getStorage(app);