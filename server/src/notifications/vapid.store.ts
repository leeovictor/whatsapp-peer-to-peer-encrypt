import webPush from 'web-push';

const VAPID_SUBJECT = 'mailto:chat@e2ee.local';

let vapidKeys: { publicKey: string; privateKey: string } | null = null;

export async function initVapidKeys(): Promise<void> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  } else {
    vapidKeys = webPush.generateVAPIDKeys();
    console.log('[VAPID] Generated fresh VAPID keys');
  }

  webPush.setVapidDetails(
    VAPID_SUBJECT,
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );
}

export function getVapidPublicKey(): string {
  if (!vapidKeys) throw new Error('VAPID keys not initialized');
  return vapidKeys.publicKey;
}
