import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { usersStore } from './users.store';

export const usersRouter = Router();

usersRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const allUsers = await usersStore.findAll();
  const users = allUsers.filter(u => u.id !== req.user?.sub);
  res.json({ users });
});
