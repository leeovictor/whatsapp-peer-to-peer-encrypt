import { User } from '../types';

const users = new Map<string, User>();

export const usersLocalStore = {
  async create(user: User): Promise<void> {
    users.set(user.id, user);
  },

  async findByUsername(username: string): Promise<User | undefined> {
    for (const user of users.values()) {
      if (user.username === username) return user;
    }
    return undefined;
  },

  async findById(id: string): Promise<User | undefined> {
    return users.get(id);
  },

  async findAllByIds(ids: string[]): Promise<Omit<User, 'passwordHash'>[]> {
    return ids
      .map(id => users.get(id))
      .filter((u): u is User => u !== undefined)
      .map(({ passwordHash, ...safe }) => safe);
  },

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    return Array.from(users.values())
      .map(({ passwordHash, ...safe }) => safe);
  },
};
