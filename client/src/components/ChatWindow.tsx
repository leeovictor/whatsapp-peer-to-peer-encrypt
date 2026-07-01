import { useChat } from '@/hooks/useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatWindow() {
  const { activeUserId, users, typingUsers, selectUser } = useChat();
  const contact = users.get(activeUserId ?? '');
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!activeUserId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Selecione um contato
      </div>
    );
  }

  const isTyping = typingUsers.has(activeUserId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-850">
      <ChatHeader
        username={contact?.username || 'Unknown'}
        peerId={activeUserId}
        showBack={isMobile}
        onBack={() => selectUser(null)}
      />
      <MessageList />
      {isTyping && (
        <div className="px-4 pb-2 text-xs text-gray-500 italic">
          {contact?.username || 'Usuário'} está digitando...
        </div>
      )}
      <MessageInput />
    </div>
  );
}