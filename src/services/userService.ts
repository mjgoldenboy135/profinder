
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  console.log(`[userService.uploadProfilePicture] Attempting to upload to path: ${filePath} for file: ${file.name}, size: ${file.size}`);

  try {
    console.log(`[userService.uploadProfilePicture] Calling uploadBytes for ${file.name}...`);
    const uploadResult = await uploadBytes(fileRef, file);
    console.log(`[userService.uploadProfilePicture] uploadBytes successful for ${file.name}. Metadata:`, uploadResult.metadata);

    console.log(`[userService.uploadProfilePicture] Calling getDownloadURL for ${file.name}...`);
    const downloadURL = await getDownloadURL(fileRef);
    console.log(`[userService.uploadProfilePicture] Successfully got download URL: ${downloadURL}`);
    return downloadURL;
  } catch (error: any) {
    console.error(`[userService.uploadProfilePicture] Error during upload/getURL for ${filePath}:`, error);
    // Log specific properties if they exist, to help identify Firebase errors
    if (error.code) console.error(`[userService.uploadProfilePicture] Error Code: ${error.code}`);
    if (error.message) console.error(`[userService.uploadProfilePicture] Error Message: ${error.message}`);
    if (error.serverResponse) console.error(`[userService.uploadProfilePicture] Server Response: ${error.serverResponse}`);
    // It's useful to log the full error object as well for more details
    console.error("[userService.uploadProfilePicture] Full error object:", error);
    throw error; // Re-throw the error so it can be caught by the caller (ProfileForm)
  }
}

/**
 * Creates a user profile document in Firestore.
 * Typically called after a new user signs up with Firebase Auth.
 * @param userId The Firebase Auth user ID.
 * @param data Initial profile data (e.g., fullName, email).
 */
export async function createUserProfile(userId: string, data: Partial<Omit<User, 'id'>>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const profileData: Partial<User> & { id: string; createdAt: any; updatedAt: any; favoriteUserIds: string[] } = {
    ...data,
    id: userId,
    favoriteUserIds: [], // Initialize favoriteUserIds
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
 * Updates or creates a user profile in Firestore.
 * If the document doesn't exist, it will be created.
 * If it exists, it will be merged with the new data.
 * @param userId The Firebase Auth user ID.
 * @param data The profile data to update or create.
 */
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Fetches users who are online and have location data.
 * @returns A promise that resolves with an array of User objects.
 */
export async function getOnlineUsersWithLocation(): Promise<User[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(
    usersRef,
    where("isOnline", "==", true)
  );

  const querySnapshot = await getDocs(q);
  const onlineUsers: User[] = [];
  querySnapshot.forEach((doc) => {
    const userData = doc.data() as User;
    if (userData.location && userData.location.lat != null && userData.location.lng != null) {
      onlineUsers.push({ id: doc.id, ...userData });
    }
  });
  return onlineUsers;
}

/**
 * Adds a user to the current user's list of favorites.
 * @param currentUserId The ID of the user whose favorites list will be updated.
 * @param targetUserId The ID of the user to add to favorites.
 */
export async function addFavoriteUser(currentUserId: string, targetUserId: string): Promise<void> {
  if (!currentUserId || !targetUserId) throw new Error("Both currentUserId and targetUserId are required.");
  const userRef = doc(db, USERS_COLLECTION, currentUserId);
  await updateDoc(userRef, {
    favoriteUserIds: arrayUnion(targetUserId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Removes a user from the current user's list of favorites.
 * @param currentUserId The ID of the user whose favorites list will be updated.
 * @param targetUserId The ID of the user to remove from favorites.
 */
export async function removeFavoriteUser(currentUserId: string, targetUserId: string): Promise<void> {
  if (!currentUserId || !targetUserId) throw new Error("Both currentUserId and targetUserId are required.");
  const userRef = doc(db, USERS_COLLECTION, currentUserId);
  await updateDoc(userRef, {
    favoriteUserIds: arrayRemove(targetUserId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetches the full profile data for all users favorited by the current user.
 * @param userId The ID of the user whose favorites to fetch.
 * @returns A promise that resolves with an array of User objects (the favorited users).
 */
export async function getFavoriteUsers(userId: string): Promise<User[]> {
  if (!userId) return [];
  const currentUserProfile = await getUserProfile(userId);
  if (!currentUserProfile || !currentUserProfile.favoriteUserIds || currentUserProfile.favoriteUserIds.length === 0) {
    return [];
  }

  const favoriteUserPromises = currentUserProfile.favoriteUserIds.map(favId => getUserProfile(favId));
  const favoriteUsersRaw = await Promise.all(favoriteUserPromises);
  
  // Filter out any null results (e.g., if a favorited user's profile was deleted)
  return favoriteUsersRaw.filter(user => user !== null) as User[];
}

