import * as firebaseApp from "firebase/app";
// Firebase Imports
import * as firebaseAuth from "firebase/auth";
import * as firebaseDatabase from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDH5327QBuQ99G2-mqp-GKNy2CVbIFVuk8",
  authDomain: "hivespell-db.firebaseapp.com",
  projectId: "hivespell-db",
  storageBucket: "hivespell-db.firebasestorage.app",
  messagingSenderId: "684937158022",
  appId: "1:684937158022:web:dce1947f4f708b1d536007",
  measurementId: "G-1RZBL1BSV8",
  // Database Configuration
  databaseURL: "https://hivespell-db-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase App
const app = (firebaseApp as any).initializeApp(firebaseConfig);
// Initialize Auth
const { getAuth } = firebaseAuth as any;
export const auth = getAuth(app);

// Initialize Realtime Database
const { getDatabase } = firebaseDatabase as any;
export const db = getDatabase(app);