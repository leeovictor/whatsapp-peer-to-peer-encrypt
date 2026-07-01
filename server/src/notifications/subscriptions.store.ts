export interface PushSubscriptionEntry {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  createdAt: number;
}

const subscriptions = new Map<string, PushSubscriptionEntry[]>();

export function addSubscription(userId: string, entry: PushSubscriptionEntry): void {
  const list = subscriptions.get(userId) || [];

  const existing = list.findIndex(s => s.endpoint === entry.endpoint);
  if (existing !== -1) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }

  subscriptions.set(userId, list);
}

export function removeSubscription(userId: string, endpoint: string): void {
  const list = subscriptions.get(userId);
  if (!list) return;
  const filtered = list.filter(s => s.endpoint !== endpoint);
  if (filtered.length === 0) {
    subscriptions.delete(userId);
  } else {
    subscriptions.set(userId, filtered);
  }
}

export function removeSubscriptionByEndpoint(endpoint: string): void {
  for (const [userId, list] of subscriptions) {
    const filtered = list.filter(s => s.endpoint !== endpoint);
    if (filtered.length === 0) {
      subscriptions.delete(userId);
    } else if (filtered.length !== list.length) {
      subscriptions.set(userId, filtered);
    }
  }
}

export function getSubscriptions(userId: string): PushSubscriptionEntry[] {
  return subscriptions.get(userId) || [];
}
