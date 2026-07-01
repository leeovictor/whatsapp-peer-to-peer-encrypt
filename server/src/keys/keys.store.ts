import { PublicKeyVersion } from '../types';

const publicKeys = new Map<string, PublicKeyVersion[]>();

export function addPublicKey(userId: string, publicKey: string): PublicKeyVersion {
  const versions = publicKeys.get(userId) || [];
  const newVersion: PublicKeyVersion = {
    version: versions.length + 1,
    publicKey,
    createdAt: Date.now(),
  };
  versions.unshift(newVersion);
  publicKeys.set(userId, versions);
  console.log(`[Keys] User ${userId} public key updated to version ${newVersion.version}`);
  return newVersion;
}

export function getLatestPublicKey(userId: string): string | undefined {
  const versions = publicKeys.get(userId);
  return versions?.[0]?.publicKey;
}

export function getPublicKeyVersion(userId: string, version: number): string | undefined {
  const versions = publicKeys.get(userId);
  return versions?.find(v => v.version === version)?.publicKey;
}

export function getPublicKeyVersions(userId: string): Omit<PublicKeyVersion, 'publicKey'>[] {
  const versions = publicKeys.get(userId) || [];
  return versions.map(({ version, createdAt }) => ({ version, createdAt }));
}

export function removeAllKeys(userId: string): void {
  publicKeys.delete(userId);
}
