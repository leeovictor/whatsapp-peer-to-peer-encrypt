import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { addPublicKey, getLatestPublicKey, getPublicKeyVersion, getPublicKeyVersions } from './keys.store';

export const keysRouter = Router();

keysRouter.put('/keys', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { publicKey } = req.body;
  if (!publicKey || typeof publicKey !== 'string') {
    res.status(400).json({ message: 'publicKey is required' });
    return;
  }
  try {
    const version = await addPublicKey(req.user!.sub, publicKey);
    res.json({ success: true, version: version.version });
  } catch (err) {
    console.error('[Keys] Error adding public key:', err);
    res.status(500).json({ message: 'Failed to store public key' });
  }
});

keysRouter.get('/users/:id/key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const version = req.query.version ? parseInt(req.query.version as string) : undefined;

  try {
    let publicKey: string | undefined;
    if (version) {
      publicKey = await getPublicKeyVersion(id, version);
    } else {
      publicKey = await getLatestPublicKey(id);
    }

    if (!publicKey) {
      res.status(404).json({ message: 'Public key not found' });
      return;
    }

    res.json({ publicKey, version: version || 'latest' });
  } catch (err) {
    console.error('[Keys] Error fetching public key:', err);
    res.status(500).json({ message: 'Failed to fetch public key' });
  }
});

keysRouter.get('/users/:id/key/versions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const versions = await getPublicKeyVersions(id);
    res.json({ versions });
  } catch (err) {
    console.error('[Keys] Error fetching key versions:', err);
    res.status(500).json({ message: 'Failed to fetch key versions' });
  }
});
