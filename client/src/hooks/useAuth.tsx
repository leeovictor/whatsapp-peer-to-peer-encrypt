import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as http from '@/api/http';
import { socketService } from '@/api/socket';
import { User, AuthResponse } from '@/types';
import {
  generateKeyPair,
  storePrivateKey,
  loadPrivateKey,
  exportPublicKey,
  storePublicKeyBase64,
  loadPublicKeyBase64,
} from '@/crypto/keypair';
import { clearSessions } from '@/crypto/session';

interface AuthState {
  token: string | null;
  user: User | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitialState(): AuthState {
  const token = localStorage.getItem('token');
  let user: User | null = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) user = JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
  }
  return { token, user };
}

async function ensureKeyPair(userId: string): Promise<void> {
  const existing = await loadPrivateKey(userId);
  if (existing) {
    const pubBase64 = loadPublicKeyBase64(userId);
    if (pubBase64) {
      await http.publishPublicKey(pubBase64);
    }
    return;
  }
  const keyPair = await generateKeyPair();
  await storePrivateKey(userId, keyPair.privateKey);
  const pubBase64 = await exportPublicKey(keyPair.publicKey);
  await storePublicKeyBase64(userId, pubBase64);
  await http.publishPublicKey(pubBase64);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  const connectSocket = useCallback((token: string) => {
    socketService.connect(token);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res: AuthResponse = await http.login(username, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setState({ token: res.token, user: res.user });
    await ensureKeyPair(res.user.id);
    connectSocket(res.token);
  }, [connectSocket]);

  const register = useCallback(async (username: string, password: string) => {
    const res: AuthResponse = await http.register(username, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setState({ token: res.token, user: res.user });
    await ensureKeyPair(res.user.id);
    connectSocket(res.token);
  }, [connectSocket]);

  const logout = useCallback(() => {
    clearSessions();
    socketService.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ token: null, user: null });
  }, []);

  useEffect(() => {
    if (state.token) {
      connectSocket(state.token);
      http.fetchUsers().catch(() => logout());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
