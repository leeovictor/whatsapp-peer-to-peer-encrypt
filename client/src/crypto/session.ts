import { loadPrivateKey, importPublicKey } from './keypair';
import { fetchPublicKey } from '@/api/http';

const sessions = new Map<string, CryptoKey>();

export async function deriveSessionKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export function setSession(peerId: string, key: CryptoKey): void {
  sessions.set(peerId, key);
}

export function getSession(peerId: string): CryptoKey | undefined {
  return sessions.get(peerId);
}

export function hasSession(peerId: string): boolean {
  return sessions.has(peerId);
}

export function removeSession(peerId: string): void {
  sessions.delete(peerId);
}

export function clearSessions(): void {
  sessions.clear();
}

export function getActiveSessions(): string[] {
  return Array.from(sessions.keys());
}

export async function renewSession(
  currentUserId: string,
  peerId: string
): Promise<CryptoKey> {
  console.log(`[Crypto] Renewing session with ${peerId}...`);

  removeSession(peerId);

  const privateKey = await loadPrivateKey(currentUserId);
  if (!privateKey) throw new Error('No private key found');

  const { publicKey: peerPublicKeyBase64 } = await fetchPublicKey(peerId);
  const peerPublicKey = await importPublicKey(peerPublicKeyBase64);

  const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);
  setSession(peerId, sessionKey);

  console.log(`[Crypto] Session renewed with ${peerId}`);
  return sessionKey;
}

export async function renewAllSessions(currentUserId: string): Promise<void> {
  const activePeers = getActiveSessions();
  console.log(`[Crypto] Renewing ${activePeers.length} sessions...`);

  for (const peerId of activePeers) {
    try {
      await renewSession(currentUserId, peerId);
    } catch (err) {
      console.error(`[Crypto] Failed to renew session with ${peerId}:`, err);
    }
  }

  console.log('[Crypto] All sessions renewed');
}
