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

export const fetchUsers = () =>
  request<{ users: User[] }>('GET', '/users');
