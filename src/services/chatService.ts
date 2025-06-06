
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
  const chatsRef = collection(db, CHATS_COLLECTION);
  // Query chats where the participantIds array contains the userId
  // Firestore doesn't directly support array-contains-any for querying multiple user chats efficiently in one go like this.
  // A common workaround is to have a map field for easier querying.
  const q = query(
    chatsRef,
    where(`userConversations.${userId}`, '==', true),
    orderBy('updatedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const chats: Chat[] = [];
  querySnapshot.forEach((doc) => {
    chats.push({ id: doc.id, ...doc.data() } as Chat);
  });
  return chats;
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
  });

  await batch.commit();
  return newMessageRef.id;
}

/**
 * Creates a new chat between two users if one doesn't already exist.
 * @param currentUser User object for the current user.
 * @param otherUser User object for the other user.
 * @returns A promise that resolves with the ID of the existing or new chat.
 */
export async function findOrCreateChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  const chatsRef = collection(db, CHATS_COLLECTION);
  // To check for an existing chat, we need to query for chats where both users are participants.
  // This query can be complex. A common way is to ensure participantIds are stored sorted,
  // or by having a compound field like `participantsHash = uid1_uid2` (sorted).
  // For simplicity with `userConversations` map:
  const q = query(
    chatsRef,
    where(`userConversations.${currentUserId}`, '==', true),
    where(`userConversations.${otherUserId}`, '==', true)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // Chat already exists
    return querySnapshot.docs[0].id;
  }

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
  
  const participantIds = [currentUserId, otherUserId].sort(); // Sort for consistent querying if needed

  const newChatData: Omit<Chat, 'id'> = {
    participantIds,
    participantsData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userConversations: {
      [currentUserId]: true,
      [otherUserId]: true,
    },
    // lastMessage fields will be set when the first message is sent
  };

  const newChatRef = await addDoc(chatsRef, newChatData);
  return newChatRef.id;
}
