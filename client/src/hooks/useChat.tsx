import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { socketService } from '@/api/socket';
import * as http from '@/api/http';
import { Message, User, WsIncomingMessage, WsError, WsQueuedNotification } from '@/types';
import { useAuth } from './useAuth';
import { ensureSession } from '@/crypto/session-init';
import { encrypt, decrypt } from '@/crypto/encryption';
import { getSession, hasSession } from '@/crypto/session';
import { saveMessages, loadMessages } from '@/store/storage';

interface ChatState {
  messages: Message[];
  users: User[];
  activeUserId: string | null;
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string) => void;
  selectUser: (userId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    users: [],
    activeUserId: null,
  });
  const activeUserRef = useRef(user);
  activeUserRef.current = user;

  useEffect(() => {
    if (!isAuthenticated) return;
    http.fetchUsers().then(res => {
      setState(prev => ({ ...prev, users: res.users }));
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
          console.error('[Chat] Decryption failed:', err);
          plaintext = '[Mensagem não pôde ser descriptografada]';
        }

        const msg: Message = {
          id: nextMsgId(),
          from: data.from,
          to: user.id,
          plaintext,
          timestamp: data.timestamp,
          direction: 'received',
        };
        setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const currentUser = activeUserRef.current;
    if (state.activeUserId && currentUser) {
      saveMessages(currentUser.id, state.activeUserId, state.messages);
    }
  }, [state.messages, state.activeUserId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!state.activeUserId || !user || !text.trim()) return;

    const sessionKey = getSession(state.activeUserId);
    if (!sessionKey) {
      console.error('[Chat] No session key for', state.activeUserId);
      return;
    }

    const { iv, ciphertext } = await encrypt(sessionKey, text.trim());

    socketService.send({ type: 'message', to: state.activeUserId, iv, ciphertext });

    const msg: Message = {
      id: nextMsgId(),
      from: user.id,
      to: state.activeUserId,
      plaintext: text.trim(),
      timestamp: Date.now(),
      direction: 'sent',
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  }, [state.activeUserId, user]);

  const selectUser = useCallback(async (userId: string | null) => {
    if (userId === null) {
      setState(prev => ({ ...prev, activeUserId: null, messages: [] }));
      return;
    }

    setState(prev => ({ ...prev, activeUserId: userId, messages: [] }));

    if (user) {
      const saved = loadMessages(user.id, userId);
      if (saved.length > 0) {
        setState(prev => ({ ...prev, messages: saved }));
      }
    }

    try {
      await ensureSession(user!.id, userId);
      console.log(`[Chat] Session established with ${userId}`);
    } catch (err) {
      console.error(`[Chat] Failed to establish session with ${userId}:`, err);
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{ ...state, sendMessage, selectUser }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
