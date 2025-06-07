
'use server';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat, Message, ChatParticipantData, User } from '@/lib/types';
import { getUserProfile } from './userService'; // To fetch participant details

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

if (!db) {
  console.error(
    "Firestore database instance (db) is not initialized in chatService.ts."
  );
  throw new Error("Firestore is not initialized.");
}

/**
 * Fetches all chats for a given user.
 * @param userId The ID of the user whose chats to fetch.
 * @returns A promise that resolves with an array of Chat objects.
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  if (!userId) {
    console.error("getUserChats called with no userId");
    return [];
  }
  console.log("[chatService] getUserChats called for userId:", userId);
  const chatsRef = collection(db, CHATS_COLLECTION);
  // Query chats where the participantIds array contains the userId.
  // Temporarily removing orderBy to check for indexing issues.
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains', userId)
    // orderBy('updatedAt', 'desc') // Temporarily commented out
  );

  try {
    const querySnapshot = await getDocs(q);
    const chats: Chat[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat);
    });
    console.log(`[chatService] Found ${chats.length} chats for userId: ${userId}`);
    // Manually sort by updatedAt if orderBy is removed, for consistent (though client-side) ordering
    chats.sort((a, b) => {
        const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (typeof a.updatedAt === 'number' ? a.updatedAt : 0);
        const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (typeof b.updatedAt === 'number' ? b.updatedAt : 0);
        return timeB - timeA;
    });
    return chats;
  } catch (error) {
    console.error("[chatService] Error fetching user chats for userId:", userId, error);
    // Check if the error object has a more specific code or message
    if (error instanceof Error && 'code' in error) {
      const firebaseError = error as { code: string; message: string };
      console.error("[chatService] Firebase error code:", firebaseError.code);
      console.error("[chatService] Firebase error message:", firebaseError.message);
    }
    throw error; // Re-throw the error to be caught by the calling component
  }
}

/**
 * Fetches details for a specific chat.
 * @param chatId The ID of the chat to fetch.
 * @returns A promise that resolves with the Chat object or null if not found.
 */
export async function getChatDetails(chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const docSnap = await getDoc(chatRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Chat;
  } else {
    return null;
  }
}

/**
 * Fetches messages for a specific chat, ordered by timestamp.
 * @param chatId The ID of the chat whose messages to fetch.
 * @returns A promise that resolves with an array of Message objects.
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  const messages: Message[] = [];
  querySnapshot.forEach((doc) => {
    messages.push({ id: doc.id, chatId, ...doc.data() } as Message);
  });
  return messages;
}

/**
 * Sends a new message to a chat.
 * Updates the chat's last message details.
 * @param chatId The ID of the chat to send the message to.
 * @param messageData The message data (senderId, receiverId, text).
 * @returns A promise that resolves with the ID of the newly created message.
 */
export async function sendMessage(
  chatId: string,
  messageData: { senderId: string; receiverId: string; text: string }
): Promise<string> {
  const batch = writeBatch(db);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
  
  const newMessageRef = doc(messagesRef); // Auto-generate ID for the new message

  const messagePayload: Omit<Message, 'id' | 'chatId'> = {
    ...messageData,
    timestamp: serverTimestamp(),
    status: 'sent',
  };
  batch.set(newMessageRef, messagePayload);

  batch.update(chatRef, {
    lastMessageText: messageData.text,
    lastMessageSenderId: messageData.senderId,
    lastMessageTimestamp: serverTimestamp(),
    updatedAt: serverTimestamp(),
    participantIds: arrayUnion(messageData.senderId, messageData.receiverId) // Ensure participants are always up-to-date
  });

  await batch.commit();
  return newMessageRef.id;
}

/**
 * Creates a new chat between two users if one doesn't already exist.
 * @param currentUserId User ID for the current user.
 * @param otherUserId User ID for the other user.
 * @returns A promise that resolves with the ID of the existing or new chat.
 */
export async function findOrCreateChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  if (!currentUserId || !otherUserId) {
    throw new Error("Both currentUserId and otherUserId must be provided to findOrCreateChat.");
  }
  console.log(`[chatService] findOrCreateChat called for users: ${currentUserId}, ${otherUserId}`);
  const chatsRef = collection(db, CHATS_COLLECTION);
  
  // Query for chats where currentUserId is a participant
  const q = query(chatsRef, where('participantIds', 'array-contains', currentUserId));
  const querySnapshot = await getDocs(q);

  // Client-side filter to find a chat that also includes otherUserId
  const existingChatDoc = querySnapshot.docs.find(doc => {
    const data = doc.data() as Chat;
    return data.participantIds.includes(otherUserId);
  });
  
  if (existingChatDoc) {
    console.log(`[chatService] Found existing chat with ID: ${existingChatDoc.id}`);
    return existingChatDoc.id;
  }

  console.log(`[chatService] No existing chat found. Creating new chat for users: ${currentUserId}, ${otherUserId}`);
  // Create new chat
  const currentUserProfile = await getUserProfile(currentUserId);
  const otherUserProfile = await getUserProfile(otherUserId);

  if (!currentUserProfile || !otherUserProfile) {
    throw new Error("Could not find user profiles to create chat.");
  }

  const participantsData: ChatParticipantData[] = [
    { id: currentUserProfile.id, fullName: currentUserProfile.fullName, profilePictureUrl: currentUserProfile.profilePictureUrl },
    { id: otherUserProfile.id, fullName: otherUserProfile.fullName, profilePictureUrl: otherUserProfile.profilePictureUrl },
  ];
  
  // Sort IDs to ensure consistency for querying if needed, though array-contains doesn't strictly need it for this structure.
  const participantIds = [currentUserId, otherUserId].sort(); 

  const newChatData: Omit<Chat, 'id'> = {
    participantIds,
    participantsData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // userConversations field is removed as per previous discussions, participantIds is primary
  };

  const newChatRef = await addDoc(chatsRef, newChatData);
  console.log(`[chatService] Created new chat with ID: ${newChatRef.id}`);
  return newChatRef.id;
}

