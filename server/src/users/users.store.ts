import { User } from '../types';
import { getDb } from '../config/firebase';

const USERS_COLLECTION = 'users';

export const usersStore = {
  async create(user: User): Promise<void> {
    await getDb().collection(USERS_COLLECTION).doc(user.id).set(user);
  },

  async findByUsername(username: string): Promise<User | undefined> {
    const snapshot = await getDb()
      .collection(USERS_COLLECTION)
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) return undefined;

    return snapshot.docs[0].data() as User;
  },

  async findById(id: string): Promise<User | undefined> {
    const doc = await getDb().collection(USERS_COLLECTION).doc(id).get();

    if (!doc.exists) return undefined;

    return doc.data() as User;
  },

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const snapshot = await getDb().collection(USERS_COLLECTION).get();

    return snapshot.docs.map(doc => {
      const { passwordHash, ...user } = doc.data() as User;
      return user;
    });
  },
};
