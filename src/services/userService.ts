
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { db, storage } from '@/lib/firebase'; 
import type { User } from '@/lib/types';

// Explicitly check if db is initialized.
if (!db) {
  console.error("Firestore database instance (db) is not initialized. This likely indicates a problem with your Firebase configuration (e.g., missing or incorrect environment variables in .env.local) or an issue during Firebase app initialization in src/lib/firebase.ts. Please verify your Firebase setup and .env.local file, then restart your development server.");
  throw new Error("Firestore is not initialized. Check your Firebase configuration and console logs for more details.");
}
if (!storage) {
  console.error("Firebase Storage instance (storage) is not initialized. This likely indicates a problem with your Firebase configuration or initialization in src/lib/firebase.ts.");
  throw new Error("Firebase Storage is not initialized. Check your Firebase configuration.");
}


const USERS_COLLECTION = 'users';

/**
 * Uploads a profile picture to Firebase Storage.
 * @param userId The user's ID, used to create a folder path.
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  const filePath = `profilePictures/${userId}/${file.name}`;
  const fileRef = storageRef(storage, filePath);
  
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
}

/**
 * Creates a user profile document in Firestore.
 * Typically called after a new user signs up with Firebase Auth.
 * @param userId The Firebase Auth user ID.
 * @param data Initial profile data (e.g., fullName, email).
 */
export async function createUserProfile(userId: string, data: Partial<Omit<User, 'id'>>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId); 
  const profileData: Partial<User> & { id: string; createdAt: any; updatedAt: any } = {
    ...data,
    id: userId, 
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
  const userRef = doc(db, USERS_COLLECTION, userId); 
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
  const userRef = doc(db, USERS_COLLECTION, userId); 
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetches users who are online and have location data.
 * @returns A promise that resolves with an array of User objects.
 */
export async function getOnlineUsersWithLocation(): Promise<User[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  // Query for users who are online.
  const q = query(usersRef, where("isOnline", "==", true));
  
  const querySnapshot = await getDocs(q);
  const onlineUsers: User[] = [];
  querySnapshot.forEach((doc) => {
    const userData = doc.data() as User;
    // Ensure the user has a location property before adding them
    // and that location is not null/undefined
    if (userData.location && userData.location.lat != null && userData.location.lng != null) {
      onlineUsers.push({ id: doc.id, ...userData });
    }
  });
  return onlineUsers;
}
