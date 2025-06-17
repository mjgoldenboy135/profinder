
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics";

// Log the API key and the entire config to help debug.
// This will show up in your server terminal and browser console.
console.log("[firebase.ts] Attempting to use Firebase API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

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

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
// Get a reference to your 'profind' database
const db: Firestore = getFirestore(app, 'profind');
const storage: FirebaseStorage = getStorage(app);
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  if (firebaseConfig.measurementId) { // Only initialize if measurementId is present
    analytics = getAnalytics(app);
  }
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, analytics, googleProvider };

