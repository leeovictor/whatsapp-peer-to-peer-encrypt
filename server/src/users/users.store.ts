import { useLocalStore } from '../config/store';
import { usersFirestoreStore } from './users.firestore-store';
import { usersLocalStore } from './users.local-store';

export const usersStore = useLocalStore() ? usersLocalStore : usersFirestoreStore;
