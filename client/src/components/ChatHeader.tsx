import { hasSession } from '@/crypto/session';

interface ChatHeaderProps {
  username: string;
  peerId: string;
}

export function ChatHeader({ username, peerId }: ChatHeaderProps) {
  const isSecure = hasSession(peerId);
  console.log(`[Chat] Session status with ${peerId}: ${isSecure ? 'active' : 'inactive'}`);

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #ccc', fontWeight: 'bold', fontSize: 16 }}>
      {isSecure ? '\u{1F512} ' : '\u{1F513} '}
      {username}
    </div>
  );
}
