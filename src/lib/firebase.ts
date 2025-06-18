
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics";

// Log each environment variable individually
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
console.log("[firebase.ts] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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
