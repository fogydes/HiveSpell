import * as firebaseApp from "firebase/app";
// Firebase Imports
import * as firebaseAuth from "firebase/auth";
import * as firebaseDatabase from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  // Database Configuration
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Initialize Firebase App
const app = (firebaseApp as any).initializeApp(firebaseConfig);
// Initialize Auth
const { getAuth } = firebaseAuth as any;
export const auth = getAuth(app);

// Initialize Realtime Database
const { getDatabase } = firebaseDatabase as any;
export const db = getDatabase(app);
