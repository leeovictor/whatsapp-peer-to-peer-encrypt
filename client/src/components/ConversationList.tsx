import { useChat } from '@/hooks/useChat';
import { hasSession } from '@/crypto/session';

export function ConversationList() {
  const { activePeers, activeUserId, selectUser, users, isOnline, getUnreadCount, typingUsers } = useChat();

  if (activePeers.length === 0) {
    return (
      <div style={{ padding: '8px 12px', color: '#888', fontSize: 13 }}>
        Nenhuma conversa ainda
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ padding: '8px 12px 4px', margin: 0, fontSize: 13, color: '#888', textTransform: 'uppercase' }}>
        Conversas
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {activePeers.map(peerId => {
          const contact = users.get(peerId);
          const isSecure = hasSession(peerId);
          const online = isOnline(peerId);
          const unread = getUnreadCount(peerId);
          const isActive = activeUserId === peerId;
          const isTyping = typingUsers.has(peerId);
          return (
            <li
              key={peerId}
              onClick={() => selectUser(peerId)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: isActive ? '#e0e0e0' : 'transparent',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: 18 }}>{isSecure ? '\u{1F512}' : '\u{1F513}'}</span>
                {online && (
                  <span style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#4caf50',
                    border: '2px solid #fff',
                  }} />
                )}
              </div>
              <span style={{ flex: 1 }}>
                {contact?.username || peerId.substring(0, 8)}
                {isTyping && (
                  <span style={{ fontSize: 12, color: '#25d366', fontStyle: 'italic', marginLeft: 8 }}>
                    digitando...
                  </span>
                )}
              </span>
              {!isActive && unread > 0 && (
                <span style={{
                  background: '#25d366',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 'bold',
                  minWidth: 20,
                  textAlign: 'center',
                }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
