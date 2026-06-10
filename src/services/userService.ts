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

export async function getOnlineUsersWithLocation(): Promise<UserProfile[]> {
  const res = await apiFetch('/users/?online=true&has_location=true');
  if (!res.ok) return [];
  return res.json();
}

export async function getAllUsers(params?: {
  search?: string;
  profession?: string;
  online?: boolean;
}): Promise<UserProfile[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.profession) query.set('profession', params.profession);
  if (params?.online) query.set('online', 'true');
  const res = await apiFetch(`/users/?${query.toString()}`);
  if (!res.ok) return [];
  return res.json();
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
