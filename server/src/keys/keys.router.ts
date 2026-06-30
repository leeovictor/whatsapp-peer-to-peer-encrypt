import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { keysStore } from './keys.store';

export const keysRouter = Router();

keysRouter.put('/keys', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { publicKey } = req.body;
  if (!publicKey || typeof publicKey !== 'string') {
    res.status(400).json({ message: 'publicKey is required' });
    return;
  }
  keysStore.setPublicKey(req.user!.sub, publicKey);
  res.json({ success: true });
});

keysRouter.get('/users/:id/key', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const publicKey = keysStore.getPublicKey(req.params.id);
  if (!publicKey) {
    res.status(404).json({ message: 'Public key not found' });
    return;
  }
  res.json({ publicKey });
});
