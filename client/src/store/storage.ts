import { Message } from '@/types';

const MESSAGES_PREFIX = 'messages:';
const ACTIVE_PEERS_KEY = 'active_peers';

export function saveMessages(
  currentUserId: string,
  peerId: string,
  messages: Message[]
): void {
  const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
  localStorage.setItem(key, JSON.stringify(messages));
}

export function loadMessages(
  currentUserId: string,
  peerId: string
): Message[] {
  const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export function clearMessages(currentUserId: string, peerId: string): void {
  const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
  localStorage.removeItem(key);
}

export function cachePublicKey(userId: string, publicKey: string): void {
  localStorage.setItem(`pubkey_cache:${userId}`, publicKey);
}

export function getCachedPublicKey(userId: string): string | null {
  return localStorage.getItem(`pubkey_cache:${userId}`);
}

export function saveActivePeers(currentUserId: string, peerIds: string[]): void {
  localStorage.setItem(`${ACTIVE_PEERS_KEY}:${currentUserId}`, JSON.stringify(peerIds));
}

export function loadActivePeers(currentUserId: string): string[] {
  const stored = localStorage.getItem(`${ACTIVE_PEERS_KEY}:${currentUserId}`);
  return stored ? JSON.parse(stored) : [];
}
