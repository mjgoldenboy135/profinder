import { apiFetch } from '@/lib/api';
import { UserProfile } from '@/lib/types';

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const res = await apiFetch(`/users/${userId}/`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await apiFetch('/users/me/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function uploadProfilePicture(userId: number, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('picture', file);
  const res = await apiFetch('/users/me/picture/', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload picture');
  const data = await res.json();
  return data.profile_picture_url;
}

export async function removeProfilePicture(): Promise<void> {
  const res = await apiFetch('/users/me/picture/', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove picture');
}

export async function getOnlineUsersWithLocation(): Promise<UserProfile[]> {
  const res = await apiFetch('/users/?online=true&has_location=true');
  if (!res.ok) return [];
  return res.json();
}

export async function getAllUsers(params?: {
  search?: string;
  profession?: string;
  online?: boolean;
  availability?: string;
}): Promise<UserProfile[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.profession) query.set('profession', params.profession);
  if (params?.online) query.set('online', 'true');
  if (params?.availability && params.availability !== 'none') query.set('availability', params.availability);
  const res = await apiFetch(`/users/?${query.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function blockUser(targetUserId: number): Promise<void> {
  const res = await apiFetch(`/users/${targetUserId}/block/`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to block user.');
}

export async function unblockUser(targetUserId: number): Promise<void> {
  const res = await apiFetch(`/users/${targetUserId}/block/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to unblock user.');
}

export async function getBlockedUsers(): Promise<UserProfile[]> {
  const res = await apiFetch('/users/me/blocked/');
  if (!res.ok) return [];
  return res.json();
}

export async function reportUser(
  targetUserId: number,
  reason: string,
  details: string
): Promise<void> {
  const res = await apiFetch(`/users/${targetUserId}/report/`, {
    method: 'POST',
    body: JSON.stringify({ reason, details }),
  });
  if (!res.ok) throw new Error('Failed to submit report.');
}

export async function getFavoriteUsers(): Promise<UserProfile[]> {
  const res = await apiFetch('/users/me/favorites/');
  if (!res.ok) return [];
  return res.json();
}

export async function addFavoriteUser(targetUserId: number): Promise<void> {
  await apiFetch(`/users/me/favorites/${targetUserId}/`, { method: 'POST' });
}

export async function removeFavoriteUser(targetUserId: number): Promise<void> {
  await apiFetch(`/users/me/favorites/${targetUserId}/`, { method: 'DELETE' });
}
