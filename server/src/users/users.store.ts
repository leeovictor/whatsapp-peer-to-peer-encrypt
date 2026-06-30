import { User } from '../types';

const users = new Map<string, User>();

export const usersStore = {
  create(user: User): void {
    users.set(user.id, user);
  },

  findByUsername(username: string): User | undefined {
    return Array.from(users.values()).find(u => u.username === username);
  },

  findById(id: string): User | undefined {
    return users.get(id);
  },

  findAll(): Omit<User, 'passwordHash'>[] {
    return Array.from(users.values()).map(({ passwordHash, ...user }) => user);
  },
};
