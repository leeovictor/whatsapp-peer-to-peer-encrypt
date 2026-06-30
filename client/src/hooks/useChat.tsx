import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { socketService } from '@/api/socket';
import * as http from '@/api/http';
import { Message, User, WsIncomingMessage, WsError } from '@/types';
import { useAuth } from './useAuth';
import { ensureSession } from '@/crypto/session-init';

interface ChatState {
  messages: Message[];
  users: User[];
  activeUserId: string | null;
}

interface ChatContextType extends ChatState {
  sendMessage: (text: string) => void;
  selectUser: (userId: string) => void;
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

  useEffect(() => {
    if (!isAuthenticated) return;
    http.fetchUsers().then(res => {
      setState(prev => ({ ...prev, users: res.users }));
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const unsub = socketService.onMessage((data: WsIncomingMessage | WsError) => {
      if (data.type === 'message') {
        const msg: Message = {
          id: nextMsgId(),
          from: data.from,
          to: user?.id || '',
          text: data.text,
          timestamp: data.timestamp,
          direction: 'received',
        };
        setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      }
    });
    return unsub;
  }, [user?.id]);

  const sendMessage = useCallback((text: string) => {
    if (!state.activeUserId || !text.trim()) return;

    socketService.send({ type: 'message', to: state.activeUserId, text: text.trim() });

    const msg: Message = {
      id: nextMsgId(),
      from: user?.id || '',
      to: state.activeUserId,
      text: text.trim(),
      timestamp: Date.now(),
      direction: 'sent',
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  }, [state.activeUserId, user?.id]);

  const selectUser = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, activeUserId: userId }));

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
