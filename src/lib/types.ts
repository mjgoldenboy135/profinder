export interface User {
  id: string;
  fullName: string;
  email: string;
  profilePictureUrl?: string;
  education?: string; 
  profession?: string;
  professionalDetails?: string; 
  yearsOfExperience?: number;
  linkedinProfileUrl?: string;
  phoneNumber?: string; 
  location?: { 
    lat: number; 
    lng: number; 
    address?: string; // For display, e.g. "San Francisco, CA"
  };
  isOnline?: boolean;
  profilePrivacySettings?: {
    showContact?: 'all' | 'connections' | 'none';
    showLocation?: 'all' | 'connections' | 'none';
  };
  // For AI suggestions
  bio?: string; // Could be part of professionalDetails or separate
  interests?: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string; // Can be derived if participantIds are just two
  text: string;
  timestamp: number; // Use number for easier Firebase/JSON serialization
  status?: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id:string;
  // Store IDs of participants
  participantIds: string[]; 
  // For easier display, could store basic info of participants, or fetch separately
  participants?: Pick<User, 'id' | 'fullName' | 'profilePictureUrl'>[]; 
  lastMessage?: Message;
  // Timestamps for sorting chats
  createdAt: number;
  updatedAt: number; 
}

// Placeholder for profile data, useful for forms
export type ProfileFormData = Omit<User, 'id' | 'isOnline' | 'location' | 'profilePrivacySettings'>;
