import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth.middleware';
import { usersStore } from './users.store';

export const usersRouter = Router();

usersRouter.get('/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const username = req.query.username as string;
  if (!username) {
    return res.status(400).json({ message: 'Parâmetro username é obrigatório' });
  }
  const user = await usersStore.findByUsername(username);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

usersRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = await usersStore.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});
