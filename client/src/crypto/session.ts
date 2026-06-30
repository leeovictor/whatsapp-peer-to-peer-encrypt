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
