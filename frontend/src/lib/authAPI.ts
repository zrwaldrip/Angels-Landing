import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwoFactorStatus';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

async function readApiError(response: Response, fallbackMessage: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return fallbackMessage;
  const data = await response.json();
  if (typeof data?.detail === 'string' && data.detail.length > 0) return data.detail;
  if (typeof data?.title === 'string' && data.title.length > 0) return data.title;
  if (data?.errors && typeof data.errors === 'object') {
    const firstError = Object.values(data.errors)
      .flat()
      .find((value): value is string => typeof value === 'string');
    if (firstError) return firstError;
  }
  if (typeof data?.message === 'string' && data.message.length > 0) return data.message;
  return fallbackMessage;
}

async function postTwoFactorRequest(payload: object): Promise<TwoFactorStatus> {
  const response = await fetch(`${apiBaseUrl}/api/auth/manage/2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to update MFA settings.'));
  return response.json();
}

export interface AdminUser {
  id: string;
  email: string | null;
  userName: string | null;
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
  lockoutEndUtc: string | null;
  twoFactorEnabled: boolean;
  roles: string[];
}

export async function getAuthSession(): Promise<AuthSession> {
  const cacheBust = Date.now();
  const response = await fetch(`${apiBaseUrl}/api/auth/me?cb=${cacheBust}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to load auth session.');
  return response.json();
}

export async function registerUser(email: string, password: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to register the account.'));
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean,
  twoFactorCode?: string,
  twoFactorRecoveryCode?: string
): Promise<void> {
  const searchParams = new URLSearchParams();
  if (rememberMe) searchParams.set('useCookies', 'true');
  else searchParams.set('useSessionCookies', 'true');

  const body: Record<string, string> = { email, password };
  if (twoFactorCode) body.twoFactorCode = twoFactorCode;
  if (twoFactorRecoveryCode) body.twoFactorRecoveryCode = twoFactorRecoveryCode;

  const response = await fetch(`${apiBaseUrl}/api/auth/login-detailed?${searchParams}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      await readApiError(response, 'Unable to log in. If MFA is enabled, include an authenticator code or recovery code.')
    );
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to log out.'));
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({});
}

export async function enableTwoFactor(twoFactorCode: string): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({ enable: true, twoFactorCode, resetRecoveryCodes: true });
}

export async function disableTwoFactor(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({ enable: false });
}

export async function resetRecoveryCodes(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({ resetRecoveryCodes: true });
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to load users.'));
  return response.json();
}

export async function updateAdminUser(
  userId: string,
  payload: { roles?: string[]; emailConfirmed?: boolean; lockoutEnabled?: boolean }
): Promise<AdminUser> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to update user.'));
  return response.json();
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Unable to delete user.'));
}
