function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

export async function storePrivateKey(userId: string, key: CryptoKey): Promise<void> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(`privateKey:${userId}`, JSON.stringify(jwk));
}

export async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(`privateKey:${userId}`);
  if (!stored) return null;
  const jwk = JSON.parse(stored);
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

export async function storePublicKeyBase64(userId: string, base64: string): Promise<void> {
  localStorage.setItem(`publicKey:${userId}`, base64);
}

export function loadPublicKeyBase64(userId: string): string | null {
  return localStorage.getItem(`publicKey:${userId}`);
}
