import { Router, Request, Response } from 'express';
import { authService } from './auth.service';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }
    const result = await authService.register(username, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    if (message === 'Username already exists') {
      res.status(409).json({ message });
    } else {
      res.status(500).json({ message });
    }
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    if (message === 'Invalid credentials') {
      res.status(401).json({ message });
    } else {
      res.status(500).json({ message });
    }
  }
});
