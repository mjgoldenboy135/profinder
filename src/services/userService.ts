
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

if (!db) {
  throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const USERS_COLLECTION = 'users';

/**
 * Creates a user profile document in Firestore.
 * Typically called after a new user signs up with Firebase Auth.
 * @param userId The Firebase Auth user ID.
 * @param data Initial profile data (e.g., fullName, email).
 */
export async function createUserProfile(userId: string, data: Partial<Omit<User, 'id'>>): Promise<void> {
  const userRef = doc(db!, USERS_COLLECTION, userId);
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
  const userRef = doc(db!, USERS_COLLECTION, userId);
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
  const userRef = doc(db!, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
