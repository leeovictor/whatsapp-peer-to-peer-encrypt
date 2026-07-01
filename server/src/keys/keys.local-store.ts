import { PublicKeyVersion } from '../types';

interface KeyEntry {
  userId: string;
  versions: PublicKeyVersion[];
}

const keys = new Map<string, KeyEntry>();

export async function addPublicKey(userId: string, publicKey: string): Promise<PublicKeyVersion> {
  const entry = keys.get(userId);
  const versions = entry?.versions || [];

  if (versions.length > 0 && versions[0].publicKey === publicKey) {
    return versions[0];
  }

  const version: PublicKeyVersion = {
    version: versions.length + 1,
    publicKey,
    createdAt: Date.now(),
  };

  versions.unshift(version);
  keys.set(userId, { userId, versions });

  return version;
}

export async function getLatestPublicKey(userId: string): Promise<string | undefined> {
  return keys.get(userId)?.versions?.[0]?.publicKey;
}

export async function getPublicKeyVersion(userId: string, version: number): Promise<string | undefined> {
  return keys.get(userId)?.versions?.find(v => v.version === version)?.publicKey;
}

export async function getPublicKeyVersions(userId: string): Promise<Omit<PublicKeyVersion, 'publicKey'>[]> {
  const versions = keys.get(userId)?.versions || [];
  return versions.map(({ version, createdAt }) => ({ version, createdAt }));
}

export async function removeAllKeys(userId: string): Promise<void> {
  keys.delete(userId);
}
