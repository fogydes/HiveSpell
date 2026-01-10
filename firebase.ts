import * as firebaseApp from "firebase/app";
// Fix: Use namespace import for Auth to resolve TS error about missing export
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
  // Update region to asia-southeast1 as requested
  databaseURL: "https://hivespell-db-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Access initializeApp via namespace and cast to any to resolve TS error about missing export
const app = (firebaseApp as any).initializeApp(firebaseConfig);
// Fix: Destructure getAuth from the namespace cast to any
const { getAuth } = firebaseAuth as any;
export const auth = getAuth(app);

// Cast firebaseDatabase to any to access getDatabase which TS thinks is missing
const { getDatabase } = firebaseDatabase as any;
export const db = getDatabase(app);