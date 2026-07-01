import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { socketService } from '@/api/socket';
import * as http from '@/api/http';
import { Message, User, MessageStatus, WsIncomingMessage, WsDeliveryAck, WsReadReceipt, WsStatus, WsStatusBatch, WsTypingStartNotification, WsTypingStopNotification } from '@/types';
import { useAuth } from './useAuth';
import { ensureSession } from '@/crypto/session-init';
import { encrypt, decrypt } from '@/crypto/encryption';
import { getSession, hasSession } from '@/crypto/session';
import { saveMessages, loadMessages, saveActivePeers, loadActivePeers } from '@/store/storage';
import { renewSession } from '@/crypto/session';
import { showInAppNotification } from './useNotifications';

interface ChatState {
  messages: Message[];
  messagesByPeer: Map<string, Message[]>;
  users: Map<string, User>;
  activeUserId: string | null;
  activePeers: string[];
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string) => void;
  selectUser: (userId: string | null) => void;
  addConversation: (peerId: string) => void;
  startConversation: (username: string) => Promise<{ success: boolean; error?: string }>;
  isOnline: (userId: string) => boolean;
  getUnreadCount: (peerId: string) => number;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}-${Date.now()}`;
}

function updateMessageStatus(
  messagesByPeer: Map<string, Message[]>,
  peerId: string,
  predicate: (m: Message) => boolean,
  newStatus: MessageStatus
): Map<string, Message[]> {
  const next = new Map(messagesByPeer);
  const conv = next.get(peerId);
  if (!conv) return next;
  next.set(peerId, conv.map(m => predicate(m) ? { ...m, status: newStatus } : m));
  return next;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messagesByPeer, setMessagesByPeer] = useState<Map<string, Message[]>>(new Map());
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const userRef = useRef(user);
  userRef.current = user;
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const activePeers = Array.from(messagesByPeer.keys());
  const messages = activeUserId ? messagesByPeer.get(activeUserId) || [] : [];

  useEffect(() => {
    if (!user) return;
    const unsub = socketService.onMessage(async (data) => {
      switch (data.type) {
        case 'message':
          await handleIncomingMessage(data as WsIncomingMessage, user);
          break;
        case 'delivery_ack':
          handleDeliveryAck(data as WsDeliveryAck);
          break;
        case 'read_receipt':
          handleReadReceipt(data as WsReadReceipt);
          break;
        case 'status':
          handleStatus(data as WsStatus);
          break;
        case 'status_batch':
          handleStatusBatch(data as WsStatusBatch);
          break;
        case 'typing_start':
          handleTypingStart(data as WsTypingStartNotification);
          break;
        case 'typing_stop':
          handleTypingStop(data as WsTypingStopNotification);
          break;
      }
    });
    return unsub;
  }, [user]);

  async function handleIncomingMessage(data: WsIncomingMessage, currentUser: User) {
    if (!hasSession(data.from)) {
      try {
        await ensureSession(currentUser.id, data.from);
      } catch (err) {
        console.error('[Chat] Cannot decrypt: no session with', data.from, err);
        return;
      }
    }

    setUsers(prev => {
      if (prev.has(data.from)) return prev;
      http.getUser(data.from).then(res => {
        setUsers(u => new Map(u).set(data.from, res.user));
      }).catch(() => {});
      return prev;
    });

    const sessionKey = getSession(data.from);
    if (!sessionKey) return;

    let plaintext: string;
    try {
      plaintext = await decrypt(sessionKey, data.iv, data.ciphertext);
    } catch (err) {
      console.warn('[Chat] Decrypt failed, attempting session renewal...');
      try {
        await renewSession(currentUser.id, data.from);
        const newSessionKey = getSession(data.from)!;
        plaintext = await decrypt(newSessionKey, data.iv, data.ciphertext);
      } catch (retryErr) {
        console.error('[Chat] Decryption failed after renewal:', retryErr);
        plaintext = '[Mensagem não pôde ser descriptografada]';
      }
    }

    const msg: Message = {
      id: data.messageId,
      from: data.from,
      to: currentUser.id,
      plaintext,
      timestamp: data.timestamp,
      direction: 'received',
      status: 'delivered',
    };

    setMessagesByPeer(prev => {
      const next = new Map(prev);
      const existing = next.get(data.from) || [];
      if (existing.some(m => m.id === data.messageId)) return prev;
      const updated = [...existing, msg];
      next.set(data.from, updated);
      return next;
    });

    if (activeUserIdRef.current === data.from) {
      socketService.send({ type: 'read_receipt', to: data.from, timestamp: Date.now() });
      setMessagesByPeer(prev => updateMessageStatus(prev, data.from, m => m.direction === 'received' && m.status !== 'read', 'read'));
    }

    showInAppNotification('New message', 'You have a new encrypted message');
  }

  function handleDeliveryAck(data: WsDeliveryAck) {
    setMessagesByPeer(prev => updateMessageStatus(prev, data.to, m => m.id === data.messageId, 'delivered'));
  }

  function handleReadReceipt(data: WsReadReceipt) {
    setMessagesByPeer(prev => updateMessageStatus(prev, data.from, m => m.direction === 'sent' && m.status !== 'read', 'read'));
  }

  function handleStatus(data: WsStatus) {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      if (data.online) next.add(data.userId);
      else next.delete(data.userId);
      return next;
    });
  }

  function handleStatusBatch(data: WsStatusBatch) {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      for (const s of data.statuses) {
        if (s.online) next.add(s.userId);
        else next.delete(s.userId);
      }
      return next;
    });
  }

  function handleTypingStart(data: WsTypingStartNotification) {
    const existing = typingTimeoutRef.current.get(data.from);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      setTypingUsers(prev => {
        if (!prev.has(data.from)) return prev;
        const next = new Set(prev);
        next.delete(data.from);
        return next;
      });
      typingTimeoutRef.current.delete(data.from);
    }, 15000);

    typingTimeoutRef.current.set(data.from, timeout);

    setTypingUsers(prev => {
      if (prev.has(data.from)) return prev;
      return new Set(prev).add(data.from);
    });
  }

  function handleTypingStop(data: WsTypingStopNotification) {
    const timeout = typingTimeoutRef.current.get(data.from);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(data.from);
    }

    setTypingUsers(prev => {
      if (!prev.has(data.from)) return prev;
      const next = new Set(prev);
      next.delete(data.from);
      return next;
    });
  }

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
    for (const peerId of peerIds) {
      http.getUser(peerId).then(res => {
        setUsers(prev => {
          if (prev.has(peerId)) return prev;
          return new Map(prev).set(peerId, res.user);
        });
      }).catch(() => {});
    }
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
    const msgId = nextMsgId();

    socketService.send({ type: 'message', to: activeUserId, iv, ciphertext, messageId: msgId });

    const msg: Message = {
      id: msgId,
      from: user.id,
      to: activeUserId,
      plaintext: text.trim(),
      timestamp: Date.now(),
      direction: 'sent',
      status: 'sent',
    };

    setMessagesByPeer(prev => {
      const next = new Map(prev);
      const existing = next.get(activeUserId) || [];
      next.set(activeUserId, [...existing, msg]);
      return next;
    });
  }, [activeUserId, user]);

  const sendTypingStart = useCallback(() => {
    if (!activeUserId) return;
    socketService.send({ type: 'typing_start', to: activeUserId });
  }, [activeUserId]);

  const sendTypingStop = useCallback(() => {
    if (!activeUserId) return;
    socketService.send({ type: 'typing_stop', to: activeUserId });
  }, [activeUserId]);

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

    if (user) {
      setMessagesByPeer(prev => {
        const conv = prev.get(userId);
        if (!conv) return prev;
        const hasUnread = conv.some(m => m.direction === 'received' && m.status !== 'read');
        if (!hasUnread) return prev;
        socketService.send({ type: 'read_receipt', to: userId, timestamp: Date.now() });
        return updateMessageStatus(prev, userId, m => m.direction === 'received' && m.status !== 'read', 'read');
      });
    }

    if (user && !users.has(userId)) {
      http.getUser(userId).then(res => {
        setUsers(prev => new Map(prev).set(userId, res.user));
      }).catch(() => {});
    }

    try {
      await ensureSession(user!.id, userId);
      console.log(`[Chat] Session established with ${userId}`);
    } catch (err) {
      console.error(`[Chat] Failed to establish session with ${userId}:`, err);
    }
  }, [user, messagesByPeer, users]);

  const startConversation = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Não autenticado' };
    if (username === user.username) return { success: false, error: 'Você não pode conversar consigo mesmo' };

    const existingUser = Array.from(users.values()).find(u => u.username === username);
    if (existingUser && messagesByPeer.has(existingUser.id)) {
      await selectUser(existingUser.id);
      return { success: true };
    }

    try {
      const res = await http.searchUser(username);
      const foundUser = res.user;
      setUsers(prev => new Map(prev).set(foundUser.id, foundUser));
      setMessagesByPeer(prev => {
        if (prev.has(foundUser.id)) return prev;
        const next = new Map(prev);
        next.set(foundUser.id, []);
        return next;
      });
      await selectUser(foundUser.id);
      return { success: true };
    } catch {
      return { success: false, error: 'Usuário não encontrado' };
    }
  }, [user, users, messagesByPeer, selectUser]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  const getUnreadCount = useCallback((peerId: string) => {
    const conv = messagesByPeer.get(peerId);
    if (!conv) return 0;
    return conv.filter(m => m.direction === 'received' && m.status !== 'read').length;
  }, [messagesByPeer]);

  return (
    <ChatContext.Provider value={{ messages, messagesByPeer, users, activeUserId, activePeers, onlineUsers, typingUsers, sendMessage, selectUser, addConversation, startConversation, isOnline, getUnreadCount, sendTypingStart, sendTypingStop }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
