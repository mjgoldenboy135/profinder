
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  setDoc,
  type Timestamp,
  type DocumentData,
  type QuerySnapshot,
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

    // Fetch user-specific chat settings and filter out hidden chats
    const settingsSnapshot = await getDocs(
      collection(db, 'users', userId, 'chatSettings')
    );
    const settingsMap = new Map<string, { hidden?: boolean; clearedAt?: Timestamp }>();
    settingsSnapshot.forEach((settingDoc) => {
      settingsMap.set(settingDoc.id, settingDoc.data() as { hidden?: boolean; clearedAt?: Timestamp });
    });

    const visibleChats = chats.filter((chat) => {
      const setting = settingsMap.get(chat.id);
      if (setting?.hidden) {
        const cleared = setting.clearedAt;
        const clearedMillis = cleared && typeof (cleared as any).toMillis === 'function' ? (cleared as Timestamp).toMillis() : (typeof cleared === 'number' ? cleared : 0);
        const last = chat.lastMessageTimestamp as any;
        const lastMillis = last && typeof last.toMillis === 'function' ? last.toMillis() : (typeof last === 'number' ? last : 0);
        return lastMillis > clearedMillis;
      }
      return true;
    });

    console.log(`[chatService] Found ${visibleChats.length} visible chats for userId: ${userId}`);
    return visibleChats;
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
 * Subscribes to chats for a given user in real time.
 * @param userId The ID of the user whose chats to subscribe to.
 * @param callback Function to execute with the updated array of chats.
 * @returns A function that unsubscribes from the listener.
 */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void
): () => void {
  if (!userId) {
    console.error('subscribeToUserChats called with no userId');
    return () => {};
  }

  const chatsRef = collection(db, CHATS_COLLECTION);
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  const settingsRef = collection(db, 'users', userId, 'chatSettings');

  let settingsMap = new Map<string, { hidden?: boolean; clearedAt?: Timestamp }>();
  let latestChatSnapshot: QuerySnapshot<DocumentData> | null = null;

  const computeAndEmit = () => {
    if (!latestChatSnapshot) return;
    const chats: Chat[] = [];
    latestChatSnapshot.forEach((docSnap) => {
      const chat = { id: docSnap.id, ...docSnap.data() } as Chat;
      const setting = settingsMap.get(chat.id);
      if (setting?.hidden) {
        const cleared = setting.clearedAt;
        const clearedMillis = cleared && typeof (cleared as any).toMillis === 'function' ? (cleared as Timestamp).toMillis() : (typeof cleared === 'number' ? cleared : 0);
        const last = chat.lastMessageTimestamp as any;
        const lastMillis = last && typeof last.toMillis === 'function' ? last.toMillis() : (typeof last === 'number' ? last : 0);
        if (lastMillis > clearedMillis) {
          chats.push(chat);
        }
      } else {
        chats.push(chat);
      }
    });
    callback(chats);
  };

  const unsubscribeChats = onSnapshot(q, (snapshot) => {
    latestChatSnapshot = snapshot;
    computeAndEmit();
  });

  const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
    settingsMap.clear();
    snapshot.forEach((docSnap) => {
      settingsMap.set(docSnap.id, docSnap.data() as { hidden?: boolean; clearedAt?: Timestamp });
    });
    computeAndEmit();
  });

  return () => {
    unsubscribeChats();
    unsubscribeSettings();
  };
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
 * Fetches messages for a specific chat, ordered by timestamp, with optional filtering
 * based on the user's clearedAt setting.
 * @param chatId The ID of the chat whose messages to fetch.
 * @param userId Optional user ID to filter messages after clearedAt.
 * @returns A promise that resolves with the messages and the user's clearedAt timestamp.
 */
export async function getChatMessages(
  chatId: string,
  userId?: string
): Promise<{ messages: Message[]; clearedAt?: Timestamp }> {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  let messages: Message[] = [];
  querySnapshot.forEach((doc) => {
    messages.push({ id: doc.id, chatId, ...doc.data() } as Message);
  });

  let clearedAt: Timestamp | undefined;
  if (userId) {
    const settingsRef = doc(db, 'users', userId, 'chatSettings', chatId);
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as { clearedAt?: Timestamp };
      if (data.clearedAt) {
        clearedAt = data.clearedAt;
        const clearedMillis = typeof (clearedAt as any).toMillis === 'function' ? (clearedAt as Timestamp).toMillis() : (clearedAt as unknown as number);
        messages = messages.filter((msg) => {
          const ts = msg.timestamp as any;
          const msgMillis = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (typeof ts === 'number' ? ts : 0);
          return msgMillis > clearedMillis;
        });
      }
    }
  }

  return { messages, clearedAt };
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
 * Hides a chat for a specific user by updating their chat settings.
 * @param chatId The ID of the chat to hide.
 * @param userId The ID of the user performing the action.
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  if (!chatId || !userId) {
    console.error("deleteChat called with missing parameters", { chatId, userId });
    throw new Error("Chat ID and user ID are required to delete a chat.");
  }

  const settingsRef = doc(db, 'users', userId, 'chatSettings', chatId);
  await setDoc(
    settingsRef,
    { hidden: true, clearedAt: serverTimestamp() },
    { merge: true }
  );
}
