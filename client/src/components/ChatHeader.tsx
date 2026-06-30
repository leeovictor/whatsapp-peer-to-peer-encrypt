import { hasSession } from '@/crypto/session';

interface ChatHeaderProps {
  username: string;
  peerId: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function ChatHeader({ username, peerId, showBack, onBack }: ChatHeaderProps) {
  const isSecure = hasSession(peerId);
  console.log(`[Chat] Session status with ${peerId}: ${isSecure ? 'active' : 'inactive'}`);

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
      <span style={{ fontWeight: 'bold', fontSize: 16 }}>
        {isSecure ? '\u{1F512} ' : '\u{1F513} '}
        {username}
      </span>
    </div>
  );
}
