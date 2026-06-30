import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dequeueMessages } from './messages.store';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.sub;
  const messages = dequeueMessages(userId);
  res.json({ messages });
});

export { router as messagesRouter };
