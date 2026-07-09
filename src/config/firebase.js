import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Menggunakan konfigurasi Firebase Applet
const firebaseConfig = {
  apiKey: "AIzaSyDT2xWVZu2TQ_xCHITGwlhvspWfKI_xgMg",
  authDomain: "laptophub-22.firebaseapp.com",
  projectId: "laptophub-22",
  storageBucket: "laptophub-22.firebasestorage.app",
  messagingSenderId: "1040844793607",
  appId: "1:1040844793607:web:002fd7a0f73d74eb9607a2",
  measurementId: "G-WWHKY6HJWR"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Inisialisasi Auth
export const auth = getAuth(app);

// Inisialisasi Firestore dengan Database ID khusus dari config
export const db = getFirestore(app);

// Inisialisasi Storage
export const storage = getStorage(app);
