import { useLocalStore } from '../config/store';
import * as firestore from './keys.firestore-store';
import * as local from './keys.local-store';

const impl = useLocalStore() ? local : firestore;

export const addPublicKey = impl.addPublicKey;
export const getLatestPublicKey = impl.getLatestPublicKey;
export const getPublicKeyVersion = impl.getPublicKeyVersion;
export const getPublicKeyVersions = impl.getPublicKeyVersions;
export const removeAllKeys = impl.removeAllKeys;
