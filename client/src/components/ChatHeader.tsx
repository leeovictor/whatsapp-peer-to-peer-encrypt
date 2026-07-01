import { useState } from 'react';
import { hasSession } from '@/crypto/session';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { renewSession } from '@/crypto/session';

interface ChatHeaderProps {
  username: string;
  peerId: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function ChatHeader({ username, peerId, showBack, onBack }: ChatHeaderProps) {
  const { user } = useAuth();
  const { isOnline } = useChat();
  const [renewing, setRenewing] = useState(false);
  const isSecure = hasSession(peerId);
  const online = isOnline(peerId);

  const handleRenewSession = async () => {
    if (!user) return;
    setRenewing(true);
    try {
      await renewSession(user.id, peerId);
    } catch (err) {
      console.error('[ChatHeader] Failed to renew session:', err);
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 bg-gray-900">
      {showBack && (
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-200 text-xl bg-transparent border-none p-0 leading-none"
        >
          ←
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-gray-200 font-semibold text-base flex items-center gap-2">
          {isSecure ? '\u{1F512} ' : '\u{1F513} '}
          <span className="truncate">{username}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-green-500' : 'bg-gray-600'}`} />
        </div>
        <div className="text-xs text-gray-500">
          {online ? 'online' : 'offline'}
        </div>
      </div>
      <button
        onClick={handleRenewSession}
        disabled={renewing}
        className="px-2 py-1.5 text-xs border border-gray-700 rounded-md text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors bg-transparent disabled:opacity-50"
        title="Renovar sessão"
      >
        {renewing ? '...' : '\u{1F504}'}
      </button>
    </div>
  );
}