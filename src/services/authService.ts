import { apiFetch } from '@/lib/api';

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.detail || fallback;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch('/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not change password.'));
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await apiFetch('/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not send reset email.'));
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string
): Promise<void> {
  const res = await apiFetch('/auth/password-reset-confirm/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not reset password.'));
}
