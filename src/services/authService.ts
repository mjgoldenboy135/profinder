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

export async function verifyEmail(
  uid: string,
  token: string
): Promise<{ access: string; refresh: string }> {
  const res = await apiFetch('/auth/verify-email/', {
    method: 'POST',
    body: JSON.stringify({ uid, token }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Verification failed.'));
  return res.json();
}

export async function resendVerification(email: string): Promise<void> {
  const res = await apiFetch('/auth/resend-verification/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not resend verification email.'));
}

// Send a verification email to the currently logged-in user.
export async function sendVerificationEmail(): Promise<string> {
  const res = await apiFetch('/auth/send-verification/', { method: 'POST' });
  if (!res.ok) throw new Error(await parseError(res, 'Could not send verification email.'));
  const data = await res.json().catch(() => ({}));
  return data.message || 'Verification email sent.';
}
