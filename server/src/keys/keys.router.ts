import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { addPublicKey, getLatestPublicKey, getPublicKeyVersion, getPublicKeyVersions } from './keys.store';

export const keysRouter = Router();

keysRouter.put('/keys', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { publicKey } = req.body;
  if (!publicKey || typeof publicKey !== 'string') {
    res.status(400).json({ message: 'publicKey is required' });
    return;
  }
  const version = addPublicKey(req.user!.sub, publicKey);
  res.json({ success: true, version: version.version });
});

keysRouter.get('/users/:id/key', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const version = req.query.version ? parseInt(req.query.version as string) : undefined;

  let publicKey: string | undefined;
  if (version) {
    publicKey = getPublicKeyVersion(id, version);
  } else {
    publicKey = getLatestPublicKey(id);
  }

  if (!publicKey) {
    res.status(404).json({ message: 'Public key not found' });
    return;
  }

  res.json({ publicKey, version: version || 'latest' });
});

keysRouter.get('/users/:id/key/versions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const versions = getPublicKeyVersions(id);
  res.json({ versions });
});
