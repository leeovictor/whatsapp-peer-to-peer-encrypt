import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';
import { addSubscription, removeSubscription } from './subscriptions.store';
import { getVapidPublicKey } from './vapid.store';
import { v4 as uuid } from 'uuid';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

notificationsRouter.get('/vapid-public-key', (_req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.json({ publicKey });
  } catch {
    res.status(500).json({ message: 'VAPID keys not initialized' });
  }
});

notificationsRouter.post('/subscribe', (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const { endpoint, keys } = req.body as { endpoint: string; keys: { auth: string; p256dh: string } };

  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    res.status(400).json({ message: 'Missing endpoint or keys' });
    return;
  }

  addSubscription(user.sub, {
    id: uuid(),
    userId: user.sub,
    endpoint,
    keys,
    createdAt: Date.now(),
  });

  console.log(`[Push] Subscription saved for user ${user.sub}`);
  res.json({ success: true });
});

notificationsRouter.post('/unsubscribe', (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const { endpoint } = req.body as { endpoint: string };

  if (!endpoint) {
    res.status(400).json({ message: 'Missing endpoint' });
    return;
  }

  removeSubscription(user.sub, endpoint);
  console.log(`[Push] Subscription removed for user ${user.sub}`);
  res.json({ success: true });
});
