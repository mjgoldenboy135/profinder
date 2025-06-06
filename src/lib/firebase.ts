
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Added
import { getAnalytics, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAF37yBNVryFJ43CjiEb_IK6JD42J7wF84",
  authDomain: "profinder-90fe7.firebaseapp.com",
  projectId: "profinder-90fe7",
  storageBucket: "profinder-90fe7.appspot.com", // Ensure this is correct (usually ends with .appspot.com)
  messagingSenderId: "89536222969",
  appId: "1:89536222969:web:bd5cdd7cf2bd99f246f428",
  measurementId: "G-7KC71SP72F"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app); // Added
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics }; // Added storage
