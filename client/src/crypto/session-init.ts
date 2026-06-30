import { getSession, setSession, deriveSessionKey } from '@/crypto/session';
import { loadPrivateKey, importPublicKey } from '@/crypto/keypair';
import { fetchPublicKey } from '@/api/http';

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

  const { publicKey: peerPublicKeyBase64 } = await fetchPublicKey(peerId);

  const peerPublicKey = await importPublicKey(peerPublicKeyBase64);

  const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);

  setSession(peerId, sessionKey);

  console.log(`[Crypto] Session key derived successfully for ${peerId}`);
  return sessionKey;
}
