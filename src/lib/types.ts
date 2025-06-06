
export interface User {
  id: string; // Firebase Auth UID
  fullName: string;
  email: string;
  profilePictureUrl?: string;
  education?: string;
  profession?: string;
  professionalDetails?: string; // Or experience details
  yearsOfExperience?: number;
  linkedinProfileUrl?: string;
  phoneNumber?: string; // Store if needed, but control visibility
  location?: {
    lat: number;
    lng: number;
    address?: string; // For display, e.g. "San Francisco, CA"
  };
  isOnline?: boolean;
  profilePrivacySettings?: { // Kept for potential future use
    showContact?: 'all' | 'connections' | 'none'; // if 'all', email might be shown
    showLocation?: 'all' | 'connections' | 'none';
  };
  showContact?: boolean; // Simpler boolean for current implementation for email
  bio?: string;
  interests?: string[];
  createdAt?: any; // Firestore serverTimestamp
  updatedAt?: any; // Firestore serverTimestamp
}

export interface Message {
  id: string;
  chatId: string; // Keep if messages are in a top-level collection, optional if subcollection
  senderId: string;
  receiverId: string; // Can be useful for notifications or specific logic
  text: string;
  timestamp: any; // Firestore serverTimestamp or Date
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatParticipantData {
  id: string;
  fullName: string;
  profilePictureUrl?: string;
}

export interface Chat {
  id:string;
  participantIds: string[];
  participantsData?: ChatParticipantData[]; // Denormalized data for quick display
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp?: any; // Firestore serverTimestamp or Date
  createdAt: any; // Firestore serverTimestamp or Date
  updatedAt: any; // Firestore serverTimestamp or Date
  // For querying: A map where keys are user IDs involved in the chat
  userConversations?: { [key: string]: boolean };
}

// Placeholder for profile data, useful for forms
// This might not be directly used if ProfileFormValues is derived from Zod schema based on User type
export type ProfileFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'profilePrivacySettings'>;
