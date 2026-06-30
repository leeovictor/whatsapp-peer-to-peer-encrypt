import { getSession, setSession, deriveSessionKey } from '@/crypto/session';
import { loadPrivateKey, importPublicKey } from '@/crypto/keypair';
import { fetchPublicKey } from '@/api/http';
import { cachePublicKey, getCachedPublicKey } from '@/store/storage';

export async function ensureSession(
  currentUserId: string,
  peerId: string
): Promise<CryptoKey> {
  const existing = getSession(peerId);
  if (existing) return existing;

  console.log(`[Crypto] Ensuring session with ${peerId}...`);

  const privateKey = await loadPrivateKey(currentUserId);
  if (!privateKey) {
    throw new Error('No private key found. Please log in again.');
  }

  let peerPublicKeyBase64 = getCachedPublicKey(peerId);

  if (!peerPublicKeyBase64) {
    const response = await fetchPublicKey(peerId);
    peerPublicKeyBase64 = response.publicKey;
    cachePublicKey(peerId, peerPublicKeyBase64);
  }

  const peerPublicKey = await importPublicKey(peerPublicKeyBase64);

  const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);

  setSession(peerId, sessionKey);

  console.log(`[Crypto] Session key derived successfully for ${peerId}`);
  return sessionKey;
}
