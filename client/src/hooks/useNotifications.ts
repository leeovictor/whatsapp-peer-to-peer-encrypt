import * as http from '@/api/http';

let currentEndpoint: string | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function initPushNotifications(): Promise<void> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Notifications not supported in this browser');
    return;
  }

  if (Notification.permission === 'denied') {
    console.log('[Push] Permission previously denied by user');
    return;
  }

  if (!window.isSecureContext) {
    console.warn('[Push] Cannot subscribe: Web Push requires HTTPS (secure context). ' +
      'In-app notifications will still work while the tab is open.');
    return;
  }

  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      console.log('[Push] Permission not granted');
      return;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await http.fetchVapidPublicKey();
    const keyBuffer = urlBase64ToUint8Array(publicKey).buffer;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuffer as ArrayBuffer,
    });
    await http.subscribePush(subscription.toJSON());
    currentEndpoint = subscription.endpoint;
    console.log('[Push] Subscribed successfully');
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
  }
}

export async function unsubscribePushNotifications(): Promise<void> {
  if (currentEndpoint) {
    try {
      await http.unsubscribePush(currentEndpoint);
    } catch (err) {
      console.error('[Push] Failed to unsubscribe on server:', err);
    }
    currentEndpoint = null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed');
    }
  } catch (err) {
    console.error('[Push] Failed to unsubscribe from push manager:', err);
  }
}

export function showInAppNotification(title: string, body: string): void {
  if (Notification.permission === 'granted' && document.hidden) {
    new Notification(title, { body, tag: 'new-message', requireInteraction: true });
  }
}
