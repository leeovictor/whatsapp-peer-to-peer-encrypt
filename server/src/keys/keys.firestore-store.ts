import { PublicKeyVersion } from '../types';
import { getDb } from '../config/firebase';

const PUBLIC_KEYS_COLLECTION = 'publicKeys';

export async function addPublicKey(userId: string, publicKey: string): Promise<PublicKeyVersion> {
  const db = getDb();
  const docRef = db.collection(PUBLIC_KEYS_COLLECTION).doc(userId);

  const newVersion = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    const versions: PublicKeyVersion[] = doc.exists
      ? (doc.data()?.versions || [])
      : [];

    if (versions.length > 0 && versions[0].publicKey === publicKey) {
      return versions[0];
    }

    const version: PublicKeyVersion = {
      version: versions.length + 1,
      publicKey,
      createdAt: Date.now(),
    };

    versions.unshift(version);
    transaction.set(docRef, { userId, versions });

    return version;
  });

  console.log(`[Keys] User ${userId} public key updated to version ${newVersion.version}`);
  return newVersion;
}

export async function getLatestPublicKey(userId: string): Promise<string | undefined> {
  const doc = await getDb().collection(PUBLIC_KEYS_COLLECTION).doc(userId).get();
  if (!doc.exists) return undefined;
  return (doc.data()?.versions as PublicKeyVersion[])?.[0]?.publicKey;
}

export async function getPublicKeyVersion(userId: string, version: number): Promise<string | undefined> {
  const doc = await getDb().collection(PUBLIC_KEYS_COLLECTION).doc(userId).get();
  if (!doc.exists) return undefined;
  const versions = doc.data()?.versions as PublicKeyVersion[] | undefined;
  return versions?.find(v => v.version === version)?.publicKey;
}

export async function getPublicKeyVersions(userId: string): Promise<Omit<PublicKeyVersion, 'publicKey'>[]> {
  const doc = await getDb().collection(PUBLIC_KEYS_COLLECTION).doc(userId).get();
  if (!doc.exists) return [];
  const versions = (doc.data()?.versions as PublicKeyVersion[]) || [];
  return versions.map(({ version, createdAt }) => ({ version, createdAt }));
}

export async function removeAllKeys(userId: string): Promise<void> {
  await getDb().collection(PUBLIC_KEYS_COLLECTION).doc(userId).delete();
}
