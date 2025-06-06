
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
// and store them in environment variables (e.g., .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log the config for debugging purposes ONLY.
// This will help you see if the environment variables are being loaded correctly.
// Check your browser console (for client-side errors) or server console.
console.log("Attempting to initialize Firebase with config:", {
  apiKey: firebaseConfig.apiKey ? '********' : undefined, // Mask API key in logs
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
});

if (!firebaseConfig.apiKey) {
  console.error(
    "Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined. " +
    "Please ensure it is set correctly in your .env.local file and that you have restarted your development server."
  );
}
if (!firebaseConfig.authDomain) {
  console.error("Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing.");
}
// Add more checks if necessary for other critical config values


// Initialize Firebase
let app: FirebaseApp | undefined;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // If initialization fails, 'app' will be undefined.
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized.");
}

let auth: Auth | undefined;
if (app) {
  try {
    auth = getAuth(app);
    console.log("Firebase Auth instance obtained successfully.");
  } catch (error) {
    // This is where the (auth/invalid-api-key) error typically surfaces if init was okay but auth fails
    console.error("Error getting Firebase Auth instance:", error);
  }
} else {
  console.error("Firebase app was not initialized. Auth cannot be configured. Review previous logs for initialization errors.");
}

// const db = getFirestore(app);
// const storage = getStorage(app);

export { app, auth /*, db, storage */ };
