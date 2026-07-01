import { AuthResponse, User } from '@/types';

const BASE_URL = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

export const register = (username: string, password: string) =>
  request<AuthResponse>('POST', '/auth/register', { username, password });

export const login = (username: string, password: string) =>
  request<AuthResponse>('POST', '/auth/login', { username, password });

export const searchUser = (username: string) =>
  request<{ user: User }>('GET', `/users/search?username=${encodeURIComponent(username)}`);

export const getUser = (userId: string) =>
  request<{ user: User }>('GET', `/users/${userId}`);

export const publishPublicKey = (publicKey: string) =>
  request<{ success: boolean }>('PUT', '/keys', { publicKey });

export const fetchPublicKey = (userId: string) =>
  request<{ publicKey: string }>('GET', `/users/${userId}/key`);

export const fetchOfflineMessages = () =>
  request<{ messages: unknown[] }>('GET', '/messages');

export const fetchVapidPublicKey = () =>
  request<{ publicKey: string }>('GET', '/notifications/vapid-public-key');

export const subscribePush = (subscription: PushSubscriptionJSON) =>
  request<{ success: boolean }>('POST', '/notifications/subscribe', subscription);

export const unsubscribePush = (endpoint: string) =>
  request<{ success: boolean }>('POST', '/notifications/unsubscribe', { endpoint });

export const fetchPublicKeyVersions = (userId: string) =>
  request<{ versions: Array<{ version: number; createdAt: number }> }>('GET', `/users/${userId}/key/versions`);

export const fetchPublicKeyVersion = (userId: string, version: number) =>
  request<{ publicKey: string; version: number | string }>('GET', `/users/${userId}/key?version=${version}`);
