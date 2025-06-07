
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
  runTransaction, // Added for atomic operations
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
 * Helper function to generate a canonical chat ID for two users.
 * Ensures the ID is consistent regardless of which user is uid1 or uid2.
 * @param uid1 First user ID.
 * @param uid2 Second user ID.
 * @returns A canonical string ID for the chat.
 */
function generateCanonicalChatId(uid1: string, uid2: string): string {
  const ids = [uid1, uid2].sort();
  return `${ids[0]}_${ids[1]}`;
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
      
      console.error(
        "%c[chatService] === CRITICAL FIREBASE ERROR MESSAGE START ===",
        "color: red; font-weight: bold; font-size: 1.2em; border: 2px solid red; padding: 5px; display: block;"
      );
      console.error(
        "%c[chatService] Firebase error code: " + firebaseError.code,
        "color: red; font-weight: bold; font-size: 1.1em;"
      );
      console.error(
        "%c[chatService] Firebase error message (IMPORTANT - CHECK THIS FOR INDEX LINKS OR DETAILS):\n" + firebaseError.message,
        "color: red; font-weight: bold; font-size: 1.1em;"
      );
      console.error(
        "%c[chatService] === CRITICAL FIREBASE ERROR MESSAGE END ===",
        "color: red; font-weight: bold; font-size: 1.2em; border: 2px solid red; padding: 5px; display: block;"
      );
      
      if (firebaseError.message && (firebaseError.message.toLowerCase().includes('index') || firebaseError.message.toLowerCase().includes('create_index='))) {
        console.warn(
            "%c[chatService] POTENTIAL MISSING FIRESTORE INDEX DETECTED IN ERROR MESSAGE: " +
            "The Firebase error message above (in RED) likely contains a URL to create a required Firestore index. " +
            "Please copy that URL, paste it into your browser, and create the index. " +
            "The query was: participantIds array-contains " + userId + " and orderBy updatedAt desc.",
            "color: orange; font-weight: bold; font-size: 1.1em;"
        );
      } else if (firebaseError.code === 'permission-denied') {
         console.error(
            "%c[chatService] PERMISSION DENIED & NO CLEAR INDEX LINK IN MESSAGE: " +
            "This means your Firestore security rules are blocking the read operation. " +
            "1. Verify your deployed rules for the 'chats' collection in the 'profind' database. " +
            "   The rule 'allow read: if request.auth != null && request.auth.uid in resource.data.participantIds;' must be active. " +
            "2. Verify the data: For the user ID '" + userId + "', ensure this ID actually exists in the 'participantIds' array within the chat documents they should access. " +
            "3. Check for typos in rules or field names ('participantIds'). " +
            "4. Consider using the Firestore Rules Playground in the Firebase Console to simulate this exact read operation.",
            "color: red; font-weight: bold; font-size: 1.1em;"
        );
      }
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
    // Ensure participantIds are updated if somehow they weren't complete.
    // This is more of a safeguard; participantIds should be set on chat creation.
    participantIds: arrayUnion(messageData.senderId, messageData.receiverId) 
  });

  await batch.commit();
  return newMessageRef.id;
}

/**
 * Finds an existing chat between two users or creates a new one if none exists.
 * Uses a canonical chat ID and a transaction for atomicity.
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

  // Fetch profiles outside the transaction to avoid doing too much work inside it,
  // especially if the transaction needs to retry.
  const currentUserProfile = await getUserProfile(currentUserId);
  const otherUserProfile = await getUserProfile(otherUserId);

  if (!currentUserProfile || !otherUserProfile) {
    console.error(`[chatService] Could not find user profiles before starting transaction. currentUser: ${!!currentUserProfile}, otherUser: ${!!otherUserProfile}`);
    throw new Error("Could not find user profiles to create chat.");
  }

  const canonicalChatId = generateCanonicalChatId(currentUserId, otherUserId);
  const chatRef = doc(db, CHATS_COLLECTION, canonicalChatId);

  console.log(`[chatService] Attempting to find or create chat with canonical ID: ${canonicalChatId} for users: ${currentUserId}, ${otherUserId}`);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(chatRef);

      if (!docSnap.exists()) {
        console.log(`[chatService] Chat with canonical ID ${canonicalChatId} does not exist. Creating.`);
        
        const participantsData: ChatParticipantData[] = [
          { id: currentUserProfile.id, fullName: currentUserProfile.fullName, profilePictureUrl: currentUserProfile.profilePictureUrl },
          { id: otherUserProfile.id, fullName: otherUserProfile.fullName, profilePictureUrl: otherUserProfile.profilePictureUrl },
        ];
        // The participantIds array should also be sorted for consistency,
        // matching the canonicalChatId generation.
        const participantIds = [currentUserId, otherUserId].sort();

        const newChatData: Omit<Chat, 'id'> = {
          participantIds,
          participantsData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageText: "", // Initialize last message fields
          lastMessageSenderId: "",
          lastMessageTimestamp: null, // Or serverTimestamp() if preferred for new chats
        };
        transaction.set(chatRef, newChatData);
        console.log(`[chatService] New chat set in transaction for canonical ID: ${canonicalChatId}`);
      } else {
        console.log(`[chatService] Chat with canonical ID ${canonicalChatId} already exists.`);
      }
    });
    
    // If the transaction completes without error, the chat either existed or was created.
    // The ID is the canonicalChatId.
    console.log(`[chatService] Transaction completed for canonical ID: ${canonicalChatId}. Chat confirmed or created.`);
    return canonicalChatId;

  } catch (error: any) {
    console.error(`[chatService] Transaction failed for findOrCreateChat (canonical ID: ${canonicalChatId}): ${error.message}`, error);
    // This error could be a specific transactional error (e.g., contention if too many retries).
    // The "Document already exists" error from a `set` within a transaction like this 
    // (where existence is checked first) is highly unlikely unless there's an SDK bug.
    // It's more likely to be an error from `getUserProfile` if they were inside, or other limits.
    throw new Error(`Failed to find or create chat: ${error.message || 'Unknown error during transaction'}`);
  }
}
