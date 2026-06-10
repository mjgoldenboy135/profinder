export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  profession?: string;
  education?: string;
  professional_details?: string;
  years_of_experience?: number | null;
  linkedin_profile_url?: string;
  phone_number?: string;
  bio?: string;
  interests?: string[];
  profile_picture_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  is_online?: boolean;
  location_visibility?: 'public' | 'favorites' | 'none';
  show_contact?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  status?: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface ChatParticipant {
  id: number;
  email: string;
  full_name: string;
  profile_picture_url?: string | null;
  profession?: string;
}

export interface Chat {
  id: number;
  participants_data: ChatParticipant[];
  other_participant?: ChatParticipant | null;
  last_message_text?: string;
  last_message_sender_id?: number | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: UserProfile;
}
