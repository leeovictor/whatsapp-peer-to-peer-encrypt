import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { socketService } from '@/api/socket';
import * as http from '@/api/http';
import { Message, User, WsIncomingMessage, WsError, WsQueuedNotification } from '@/types';
import { useAuth } from './useAuth';
import { ensureSession } from '@/crypto/session-init';
import { encrypt, decrypt } from '@/crypto/encryption';
import { getSession, hasSession } from '@/crypto/session';
import { saveMessages, loadMessages, saveActivePeers, loadActivePeers } from '@/store/storage';
import { renewSession } from '@/crypto/session';

interface ChatState {
  messages: Message[];
  messagesByPeer: Map<string, Message[]>;
  users: User[];
  activeUserId: string | null;
  activePeers: string[];
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string) => void;
  selectUser: (userId: string | null) => void;
  addConversation: (peerId: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [messagesByPeer, setMessagesByPeer] = useState<Map<string, Message[]>>(new Map());
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const activePeers = Array.from(messagesByPeer.keys());
  const messages = activeUserId ? messagesByPeer.get(activeUserId) || [] : [];

  useEffect(() => {
    if (!isAuthenticated) return;
    http.fetchUsers().then(res => {
      setUsers(res.users);
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user) return;
    const unsub = socketService.onMessage(async (data: WsIncomingMessage | WsError | WsQueuedNotification) => {
      if (data.type === 'message') {
        if (!hasSession(data.from)) {
          try {
            await ensureSession(user.id, data.from);
          } catch (err) {
            console.error('[Chat] Cannot decrypt: no session with', data.from, err);
            return;
          }
        }

        const sessionKey = getSession(data.from);
        if (!sessionKey) return;

        let plaintext: string;
        try {
          plaintext = await decrypt(sessionKey, data.iv, data.ciphertext);
        } catch (err) {
          console.warn('[Chat] Decrypt failed, attempting session renewal...');
          try {
            await renewSession(user.id, data.from);
            const newSessionKey = getSession(data.from)!;
            plaintext = await decrypt(newSessionKey, data.iv, data.ciphertext);
          } catch (retryErr) {
            console.error('[Chat] Decryption failed after renewal:', retryErr);
            plaintext = '[Mensagem não pôde ser descriptografada]';
          }
        }

        const msg: Message = {
          id: nextMsgId(),
          from: data.from,
          to: user.id,
          plaintext,
          timestamp: data.timestamp,
          direction: 'received',
        };

        setMessagesByPeer(prev => {
          const next = new Map(prev);
          const existing = next.get(data.from) || [];
          next.set(data.from, [...existing, msg]);
          return next;
        });
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (activeUserId && user) {
      const convMessages = messagesByPeer.get(activeUserId);
      if (convMessages) {
        saveMessages(user.id, activeUserId, convMessages);
      }
    }
  }, [messagesByPeer, activeUserId, user]);

  useEffect(() => {
    if (!user) return;
    const peerIds = loadActivePeers(user.id);
    if (peerIds.length === 0) return;
    setMessagesByPeer(prev => {
      const next = new Map(prev);
      for (const peerId of peerIds) {
        if (!next.has(peerId)) {
          next.set(peerId, loadMessages(user.id, peerId));
        }
      }
      return next;
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    saveActivePeers(user.id, activePeers);
  }, [activePeers, user]);

  const addConversation = useCallback((peerId: string) => {
    setMessagesByPeer(prev => {
      if (prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.set(peerId, []);
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeUserId || !user || !text.trim()) return;

    const sessionKey = getSession(activeUserId);
    if (!sessionKey) {
      console.error('[Chat] No session key for', activeUserId);
      return;
    }

    const { iv, ciphertext } = await encrypt(sessionKey, text.trim());

    socketService.send({ type: 'message', to: activeUserId, iv, ciphertext });

    const msg: Message = {
      id: nextMsgId(),
      from: user.id,
      to: activeUserId,
      plaintext: text.trim(),
      timestamp: Date.now(),
      direction: 'sent',
    };

    setMessagesByPeer(prev => {
      const next = new Map(prev);
      const existing = next.get(activeUserId) || [];
      next.set(activeUserId, [...existing, msg]);
      return next;
    });
  }, [activeUserId, user]);

  const selectUser = useCallback(async (userId: string | null) => {
    if (userId === null) {
      setActiveUserId(null);
      return;
    }

    setActiveUserId(userId);

    if (!messagesByPeer.has(userId) && user) {
      const saved = loadMessages(user.id, userId);
      setMessagesByPeer(prev => {
        const next = new Map(prev);
        next.set(userId, saved);
        return next;
      });
    }

    try {
      await ensureSession(user!.id, userId);
      console.log(`[Chat] Session established with ${userId}`);
    } catch (err) {
      console.error(`[Chat] Failed to establish session with ${userId}:`, err);
    }
  }, [user, messagesByPeer]);

  return (
    <ChatContext.Provider value={{ messages, messagesByPeer, users, activeUserId, activePeers, sendMessage, selectUser, addConversation }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
