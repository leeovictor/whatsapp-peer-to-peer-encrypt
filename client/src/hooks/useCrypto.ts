import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { rotateKeyPair } from '@/crypto/keypair';
import { renewSession as renewSessionCrypto, renewAllSessions as renewAllSessionsCrypto, hasSession, getActiveSessions } from '@/crypto/session';

export function useCrypto() {
  const { user } = useAuth();

  const rotateKeys = useCallback(async () => {
    if (!user) return;
    await rotateKeyPair(user.id);
    await renewAllSessionsCrypto(user.id);
  }, [user]);

  const renewSession = useCallback(async (peerId: string) => {
    if (!user) return;
    await renewSessionCrypto(user.id, peerId);
  }, [user]);

  const sessionStatus = useCallback((peerId: string): boolean => {
    return hasSession(peerId);
  }, []);

  const activeSessions = useCallback((): string[] => {
    return getActiveSessions();
  }, []);

  return { rotateKeys, renewSession, sessionStatus, activeSessions };
}
