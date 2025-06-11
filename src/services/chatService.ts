
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
  deleteDoc, // Import deleteDoc
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat, Message, ChatParticipantData, User } from '@/lib/types';
import { getUserProfile } from './userService';

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

if (!db) {
  console.error(
    "Firestore database instance (db) is not initialized in chatService.ts."
  );
  throw new Error("Firestore is not initialized.");
}

/**
 * Fetches all chats for a given user, ordered by last update.
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
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  try {
    const querySnapshot = await getDocs(q);
    const chats: Chat[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat);
    });
    console.log(`[chatService] Found ${chats.length} chats for userId: ${userId}`);
    return chats;
  } catch (error) {
    console.error("[chatService] Error fetching user chats for userId:", userId, error);
    if (error instanceof Error && 'code' in error) {
      const firebaseError = error as { code: string; message: string };
      
      const criticalErrorStyle = "color: red; font-weight: bold; font-size: 1.2em; border: 2px solid red; padding: 5px; display: block;";
      const importantTextStyle = "color: red; font-weight: bold; font-size: 1.1em;";
      const indexLinkStyle = "color: blue; font-weight: bold; font-size: 1.1em; text-decoration: underline;";

      console.error(
        "%c[chatService] === CRITICAL FIREBASE ERROR MESSAGE START ===",
        criticalErrorStyle
      );
      console.error(
        "%c[chatService] Firebase error code: " + firebaseError.code,
        importantTextStyle
      );
      console.error(
        "%c[chatService] Firebase error message (IMPORTANT - CHECK THIS FOR INDEX LINKS OR DETAILS):\n" + firebaseError.message,
        importantTextStyle
      );
      
      const indexCreationURL = "https://console.firebase.google.com/v1/r/project/profinder-90fe7/firestore/databases/profind/indexes?create_composite=Cktwcm9qZWN0cy9wcm9maW5kZXItOTBmZTcvZGF0YWJhc2VzL3Byb2ZpbmQvY29sbGVjdGlvbkdyb3Vwcy9jaGF0cy9pbmRleGVzL18QARoSCg5wYXJ0aWNpcGFudElkcxgBGg0KCXVwZGF0ZWRBdBACGgwKCF9fbmFtZV9fEAI";

      if (firebaseError.code === 'failed-precondition' && firebaseError.message.includes('requires an index')) {
         console.warn(
            "%c[chatService] REQUIRED FIRESTORE INDEX MISSING: " +
            "The query needs a composite index. Firebase might provide a direct link to create it in the error message. " +
            "Please check the error message in your browser console for a link like: " +
            `%c${indexCreationURL}`, 
            "color: orange; font-weight: bold; font-size: 1.1em;", indexLinkStyle
        );
      } else if (firebaseError.code === 'permission-denied') {
         console.error(
            "%c[chatService] PERMISSION DENIED: " +
            "This means your Firestore security rules are blocking the read operation. " +
            "1. Verify your deployed rules for the 'chats' collection in the 'profind' database. " +
            "   The rule 'allow read: if request.auth != null && request.auth.uid in resource.data.participantIds;' must be active. " +
            "2. Verify the data: For the user ID '" + userId + "', ensure this ID actually exists in the 'participantIds' array within the chat documents they should access. " +
            "3. Check for typos in rules or field names ('participantIds').",
            importantTextStyle
        );
      }
      console.error(
        "%c[chatService] === CRITICAL FIREBASE ERROR MESSAGE END ===",
        criticalErrorStyle
      );
    }
    throw error;
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
    console.warn(`[chatService] Chat details not found for chatId: ${chatId}`);
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

  const newMessageRef = doc(messagesRef); // Automatically generates an ID

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
    // participantIds: arrayUnion(messageData.senderId, messageData.receiverId) // Removed this line
  });

  await batch.commit();
  return newMessageRef.id;
}

/**
 * Finds an existing chat between two users or creates a new one if none exists.
 * This version uses 'array-contains' and client-side filtering to avoid 'array-contains-all'.
 * @param currentUserId User ID for the current user.
 * @param otherUserId User ID for the other user.
 * @returns A promise that resolves with the ID of the existing or new chat.
 */
export async function findOrCreateChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  console.log(`[chatService] findOrCreateChat called for users: ${currentUserId}, ${otherUserId}`);
  if (!currentUserId || !otherUserId) {
    console.error("[chatService] findOrCreateChat: Both currentUserId and otherUserId must be provided.");
    throw new Error("Both currentUserId and otherUserId must be provided to findOrCreateChat.");
  }
  if (currentUserId === otherUserId) {
    console.warn("[chatService] Attempted to create a chat with oneself.");
    throw new Error("Cannot create a chat with yourself.");
  }

  const chatsRef = collection(db, CHATS_COLLECTION);
  console.log("[chatService] findOrCreateChat: Querying for existing chats...");
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains', currentUserId)
  );

  try {
    const querySnapshot = await getDocs(q);
    let existingChatId: string | null = null;

    console.log(`[chatService] findOrCreateChat: Found ${querySnapshot.docs.length} potential chats for current user.`);
    querySnapshot.forEach((docSnap) => {
      const chatData = docSnap.data() as Chat;
      if (chatData.participantIds.includes(otherUserId) && chatData.participantIds.length === 2) {
        existingChatId = docSnap.id;
        console.log(`[chatService] findOrCreateChat: Found existing chat ${existingChatId}`);
        return; 
      }
    });

    if (existingChatId) {
      return existingChatId;
    }

    console.log(`[chatService] findOrCreateChat: No existing chat found. Creating new chat.`);
    console.log("[chatService] findOrCreateChat: Fetching user profiles...");
    const currentUserProfile = await getUserProfile(currentUserId);
    const otherUserProfile = await getUserProfile(otherUserId);

    if (!currentUserProfile || !otherUserProfile) {
      const errorMsg = `[chatService] findOrCreateChat: Could not find user profiles. currentUser: ${!!currentUserProfile}, otherUser: ${!!otherUserProfile}`;
      console.error(errorMsg);
      throw new Error("Could not find user profiles to create chat.");
    }
    console.log("[chatService] findOrCreateChat: User profiles fetched.");

    const participantsData: ChatParticipantData[] = [
      { id: currentUserProfile.id, fullName: currentUserProfile.fullName, profilePictureUrl: currentUserProfile.profilePictureUrl },
      { id: otherUserProfile.id, fullName: otherUserProfile.fullName, profilePictureUrl: otherUserProfile.profilePictureUrl },
    ];

    const newChatData: Omit<Chat, 'id'> = {
      participantIds: [currentUserId, otherUserId].sort(),
      participantsData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: "",
      lastMessageSenderId: "",
      lastMessageTimestamp: null,
    };

    console.log("[chatService] findOrCreateChat: Adding new chat document to Firestore with data:", newChatData);
    const newChatDocRef = await addDoc(collection(db, CHATS_COLLECTION), newChatData);
    console.log(`[chatService] findOrCreateChat: Created new chat with ID: ${newChatDocRef.id}`);
    return newChatDocRef.id;

  } catch (error: any) {
    console.error(`[chatService] findOrCreateChat: Error for users ${currentUserId}, ${otherUserId}: ${error.message}`, error);
    if (error.message && error.message.includes("array-contains-all")) {
        console.error("[chatService] CRITICAL: 'array-contains-all' context error despite attempting to avoid it in findOrCreateChat. Current query uses 'array-contains'.");
    }
    throw new Error(`Failed to find or create chat: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Deletes a chat and all its associated messages.
 * @param chatId The ID of the chat to delete.
 */
export async function deleteChat(chatId: string): Promise<void> {
  if (!chatId) {
    console.error("deleteChat called with no chatId");
    throw new Error("Chat ID is required to delete a chat.");
  }
  console.log(`[chatService] Attempting to delete chat with ID: ${chatId}`);

  const batch = writeBatch(db);

  // 1. Delete all messages in the subcollection
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
  try {
    const messagesSnapshot = await getDocs(messagesRef);
    if (!messagesSnapshot.empty) {
      console.log(`[chatService] Found ${messagesSnapshot.docs.length} messages to delete for chat ${chatId}.`);
      messagesSnapshot.forEach(msgDoc => {
        batch.delete(msgDoc.ref);
      });
    } else {
      console.log(`[chatService] No messages found in subcollection for chat ${chatId}.`);
    }

    // 2. Delete the main chat document
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    batch.delete(chatRef);

    // 3. Commit the batch
    await batch.commit();
    console.log(`[chatService] Successfully deleted chat ${chatId} and its messages.`);
  } catch (error) {
    console.error(`[chatService] Error deleting chat ${chatId}:`, error);
    throw new Error(`Failed to delete chat: ${(error as Error).message || 'Unknown error'}`);
  }
}
