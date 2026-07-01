import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { User } from '../types';
import { usersStore } from '../users/users.store';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '24h';

export const authService = {
  async register(username: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const existing = await usersStore.findByUsername(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user: User = { id: uuid(), username, passwordHash };
    await usersStore.create(user);

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  },

  async login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await usersStore.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  },

  verifyToken(token: string): { sub: string; username: string } {
    return jwt.verify(token, JWT_SECRET) as { sub: string; username: string };
  },
};
