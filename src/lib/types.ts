export interface UserProfile {
  id: number;
  email: string;
  email_verified?: boolean;
  full_name: string;
  profession?: string;
  company?: string;
  education?: string;
  professional_details?: string;
  years_of_experience?: number | null;
  linkedin_profile_url?: string;
  website_url?: string;
  website_name?: string;
  phone_number?: string;
  bio?: string;
  interests?: string[];
  profile_picture_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  is_online?: boolean;
  availability?: Availability;
  location_visibility?: 'public' | 'favorites' | 'none';
  show_contact?: boolean;
  is_blocked?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Availability =
  | 'none'
  | 'open_to_work'
  | 'hiring'
  | 'networking'
  | 'mentoring'
  | 'collaborating';

export const AVAILABILITY_OPTIONS: { value: Availability; label: string; color: string }[] = [
  { value: 'none', label: 'Not specified', color: '' },
  { value: 'open_to_work', label: 'Open to work', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'hiring', label: 'Hiring', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  { value: 'networking', label: 'Networking', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300' },
  { value: 'mentoring', label: 'Open to mentoring', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
  { value: 'collaborating', label: 'Open to collaborate', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300' },
];

export function availabilityMeta(value?: Availability) {
  return AVAILABILITY_OPTIONS.find((o) => o.value === value) || AVAILABILITY_OPTIONS[0];
}

/** "Pharmacist at Nahdi Pharmacy" style label. Falls back gracefully when
 * either the profession or company is missing. */
export function professionLabel(profession?: string, company?: string): string {
  const p = (profession || '').trim();
  const c = (company || '').trim();
  if (p && c) return `${p} at ${c}`;
  if (p) return p;
  if (c) return `Works at ${c}`;
  return '';
}

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake profile or impersonation' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
];

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
  unread_count?: number;
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
