import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestore: Firestore | null = null;

export function initFirebase(): void {
  if (getApps().length > 0) return;

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }

  firestore = getFirestore();
  console.log('[Firebase] Initialized');
}

export function getDb(): Firestore {
  if (!firestore) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return firestore;
}
