
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
  type Timestamp,
  // runTransaction, // Removed as we are reverting the transactional findOrCreateChat
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

// Removed generateCanonicalChatId function

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
    orderBy('updatedAt', 'desc') // Restored orderBy
  );

  try {
    const querySnapshot = await getDocs(q);
    const chats: Chat[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat);
    });
    console.log(`[chatService] Found ${chats.length} chats for userId: ${userId}`);
    // Client-side sorting removed as orderBy is back in the query
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
            "The query needs a composite index. Firebase has provided a direct link to create it. " +
            "Please COPY AND PASTE the following URL into your browser and create the index: \n" +
            ` %c${indexCreationURL}`,
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
    participantIds: arrayUnion(messageData.senderId, messageData.receiverId) 
  });

  await batch.commit();
  return newMessageRef.id;
}

/**
 * Finds an existing chat between two users or creates a new one if none exists.
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
  if (currentUserId === otherUserId) {
    console.warn("[chatService] Attempted to create a chat with oneself.");
    throw new Error("Cannot create a chat with yourself.");
  }

  const chatsRef = collection(db, CHATS_COLLECTION);
  // Query for chats that contain *exactly* these two users.
  // Ensure participantIds are sorted before querying if you store them sorted,
  // or use a query that handles different orders if they are not stored sorted.
  // For this query, order doesn't strictly matter for array-contains-all but good practice.
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains-all', [currentUserId, otherUserId])
  );

  try {
    const querySnapshot = await getDocs(q);
    let existingChatId: string | null = null;

    querySnapshot.forEach((docSnap) => {
      const chatData = docSnap.data() as Chat;
      // Ensure it's a 2-person chat with exactly these participants
      if (chatData.participantIds.length === 2 &&
          chatData.participantIds.includes(currentUserId) &&
          chatData.participantIds.includes(otherUserId)) {
        existingChatId = docSnap.id;
      }
    });

    if (existingChatId) {
      console.log(`[chatService] Found existing chat ${existingChatId} for users: ${currentUserId}, ${otherUserId}`);
      return existingChatId;
    }

    console.log(`[chatService] No existing chat found. Creating new chat for users: ${currentUserId}, ${otherUserId}`);
    const currentUserProfile = await getUserProfile(currentUserId);
    const otherUserProfile = await getUserProfile(otherUserId);

    if (!currentUserProfile || !otherUserProfile) {
      console.error(`[chatService] Could not find user profiles to create chat. currentUser: ${!!currentUserProfile}, otherUser: ${!!otherUserProfile}`);
      throw new Error("Could not find user profiles to create chat.");
    }

    const participantsData: ChatParticipantData[] = [
      { id: currentUserProfile.id, fullName: currentUserProfile.fullName, profilePictureUrl: currentUserProfile.profilePictureUrl },
      { id: otherUserProfile.id, fullName: otherUserProfile.fullName, profilePictureUrl: otherUserProfile.profilePictureUrl },
    ];

    const newChatData: Omit<Chat, 'id'> = {
      participantIds: [currentUserId, otherUserId].sort(), // Store sorted for consistency
      participantsData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: "",
      lastMessageSenderId: "",
      lastMessageTimestamp: null,
    };

    const newChatDocRef = await addDoc(collection(db, CHATS_COLLECTION), newChatData);
    console.log(`[chatService] Created new chat with ID: ${newChatDocRef.id}`);
    return newChatDocRef.id;

  } catch (error: any) {
    console.error(`[chatService] Error in findOrCreateChat for users ${currentUserId}, ${otherUserId}: ${error.message}`, error);
    throw new Error(`Failed to find or create chat: ${error.message || 'Unknown error'}`);
  }
}
