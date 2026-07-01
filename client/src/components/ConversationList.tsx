import { useChat } from '@/hooks/useChat';
import { hasSession } from '@/crypto/session';

export function ConversationList() {
  const { activePeers, activeUserId, selectUser, users } = useChat();

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
          const contact = users.find(u => u.id === peerId);
          const isSecure = hasSession(peerId);
          return (
            <li
              key={peerId}
              onClick={() => selectUser(peerId)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: activeUserId === peerId ? '#e0e0e0' : 'transparent',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{isSecure ? '\u{1F512}' : '\u{1F513}'}</span>
              <span>{contact?.username || peerId.substring(0, 8)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
