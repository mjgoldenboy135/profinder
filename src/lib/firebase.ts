
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAF37yBNVryFJ43CjiEb_IK6JD42J7wF84",
  authDomain: "profinder-90fe7.firebaseapp.com",
  projectId: "profinder-90fe7",
  storageBucket: "profinder-90fe7.firebasestorage.app",
  messagingSenderId: "89536222969",
  appId: "1:89536222969:web:bd5cdd7cf2bd99f246f428",
  measurementId: "G-7KC71SP72F"
};

console.log("[firebase.ts] Firebase Config Object being used:", firebaseConfig);

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("[firebase.ts] Firebase app initialized successfully.");
  } catch (error) {
    console.error("[firebase.ts] CRITICAL: Firebase app initialization error:", error);
    // Depending on the app's needs, you might want to throw the error
    // or handle it in a way that degrades gracefully. For now, re-throw.
    throw error;
  }
} else {
  app = getApp();
  console.log("[firebase.ts] Firebase app already initialized, getting existing app.");
}

// Initialize Firebase Auth
let auth: Auth;
try {
  auth = getAuth(app);
  console.log("[firebase.ts] Firebase Auth initialized successfully.");
} catch (error) {
  console.error("[firebase.ts] CRITICAL: Firebase Auth initialization error:", error);
  throw error;
}

// Initialize Firestore
let db: Firestore;
try {
  // Get a reference to your 'profind' database
  db = getFirestore(app, 'profind');
  console.log("[firebase.ts] Firebase Firestore (profind database) initialized successfully.");
} catch (error) {
  console.error("[firebase.ts] CRITICAL: Firebase Firestore (profind database) initialization error:", error);
  throw error;
}

// Initialize Firebase Storage
let storage: FirebaseStorage;
try {
  storage = getStorage(app);
  console.log("[firebase.ts] Firebase Storage initialized successfully.");
} catch (error) {
  console.error("[firebase.ts] CRITICAL: Firebase Storage initialization error:", error);
  throw error;
}

// Initialize Firebase Analytics (conditionally)
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  if (firebaseConfig.measurementId && firebaseConfig.measurementId.trim() !== "") {
    try {
      analytics = getAnalytics(app);
      console.log("[firebase.ts] Firebase Analytics initialized successfully.");
    } catch (error) {
      console.warn("[firebase.ts] Firebase Analytics initialization error (non-critical):", error);
      // Analytics is often non-critical, so we just log a warning.
    }
  } else {
    console.log("[firebase.ts] Firebase Analytics not initialized (no measurementId provided in config).");
  }
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, analytics, googleProvider };
