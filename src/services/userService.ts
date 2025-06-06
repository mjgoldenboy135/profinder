
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

// Explicitly check if db is initialized.
// If this error is thrown, it means there's a problem with Firebase initialization in src/lib/firebase.ts
// (e.g., due to incorrect environment variables for API keys, project ID, etc., or if Firebase app failed to initialize).
// If this error is NOT thrown, and you still get "client is offline",
// the issue is more likely network connectivity, Firestore service not being enabled in your Firebase project,
// or restrictive security rules.
if (!db) {
  console.error("Firestore database instance (db) is not initialized. This likely indicates a problem with your Firebase configuration (e.g., missing or incorrect environment variables in .env.local) or an issue during Firebase app initialization in src/lib/firebase.ts. Please verify your Firebase setup and .env.local file, then restart your development server.");
  throw new Error("Firestore is not initialized. Check your Firebase configuration and console logs for more details.");
}

const USERS_COLLECTION = 'users';

/**
 * Creates a user profile document in Firestore.
 * Typically called after a new user signs up with Firebase Auth.
 * @param userId The Firebase Auth user ID.
 * @param data Initial profile data (e.g., fullName, email).
 */
export async function createUserProfile(userId: string, data: Partial<Omit<User, 'id'>>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId); // Use db directly
  const profileData: Partial<User> & { createdAt: any; updatedAt: any } = {
    ...data,
    id: userId, // Ensure the id is part of the document
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(userRef, profileData);
}

/**
 * Fetches a user profile from Firestore.
 * @param userId The Firebase Auth user ID.
 * @returns The user's profile data or null if not found.
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, userId); // Use db directly
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  } else {
    return null;
  }
}

/**
 * Updates a user profile in Firestore.
 * @param userId The Firebase Auth user ID.
 * @param data The profile data to update.
 */
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId); // Use db directly
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
