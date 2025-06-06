
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
  chatId: string;
  senderId: string;
  receiverId: string; 
  text: string;
  timestamp: number; 
  status?: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id:string;
  participantIds: string[]; 
  participants?: Pick<User, 'id' | 'fullName' | 'profilePictureUrl'>[]; 
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number; 
}

// Placeholder for profile data, useful for forms
// This might not be directly used if ProfileFormValues is derived from Zod schema based on User type
export type ProfileFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'profilePrivacySettings'>;
