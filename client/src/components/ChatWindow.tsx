import { useChat } from '@/hooks/useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatWindow() {
  const { activeUserId, users, typingUsers, selectUser } = useChat();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!activeUserId) {
    return <div style={{ padding: 16, color: '#888' }}>Selecione um contato</div>;
  }

  const contact = users.find(u => u.id === activeUserId);
  const isTyping = typingUsers.has(activeUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <ChatHeader
        username={contact?.username || 'Unknown'}
        peerId={activeUserId}
        showBack={isMobile}
        onBack={() => selectUser(null)}
      />
      <MessageList />
      {isTyping && (
        <div style={{ padding: '4px 16px 8px', fontSize: 13, color: '#666', fontStyle: 'italic' }}>
          {contact?.username || 'Usuário'} está digitando...
        </div>
      )}
      <MessageInput />
    </div>
  );
}
