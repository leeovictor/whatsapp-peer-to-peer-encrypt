import webPush from 'web-push';
import { getSubscriptions, removeSubscriptionByEndpoint } from './subscriptions.store';

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  const subs = getSubscriptions(userId);
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.keys.auth, p256dh: sub.keys.p256dh },
        },
        payload,
      ),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err instanceof webPush.WebPushError && err.statusCode === 410) {
        console.log(`[Push] Removing expired subscription for user ${userId}`);
        removeSubscriptionByEndpoint(subs[i].endpoint);
      } else {
        console.error(`[Push] Failed to send to user ${userId}:`, err);
      }
    }
  }
}
