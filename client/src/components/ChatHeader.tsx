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
    <div style={{ padding: 12, borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: 8 }}>
      {showBack && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}
        >
          ←
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          {isSecure ? '\u{1F512} ' : '\u{1F513} '}
          {username}
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: online ? '#4caf50' : '#bbb',
            display: 'inline-block',
          }} />
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {online ? 'online' : 'offline'}
        </div>
      </div>
      <button
        onClick={handleRenewSession}
        disabled={renewing}
        style={{ padding: '4px 8px', fontSize: 12, cursor: renewing ? 'wait' : 'pointer', background: 'none', border: '1px solid #ccc', borderRadius: 4 }}
        title="Renovar sessão"
      >
        {renewing ? '...' : '\u{1F504}'}
      </button>
    </div>
  );
}
