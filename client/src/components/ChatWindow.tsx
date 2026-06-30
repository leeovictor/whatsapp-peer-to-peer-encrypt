import { useChat } from '@/hooks/useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatWindow() {
  const { activeUserId, users, selectUser } = useChat();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!activeUserId) {
    return <div style={{ padding: 16, color: '#888' }}>Selecione um contato</div>;
  }

  const contact = users.find(u => u.id === activeUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ChatHeader
        username={contact?.username || 'Unknown'}
        peerId={activeUserId}
        showBack={isMobile}
        onBack={() => selectUser(null)}
      />
      <MessageList />
      <MessageInput />
    </div>
  );
}
