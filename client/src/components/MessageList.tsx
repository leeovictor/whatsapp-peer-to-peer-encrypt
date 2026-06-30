import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';

export function MessageList() {
  const { messages, activeUserId } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredMessages = messages.filter(
    m => m.from === activeUserId || m.to === activeUserId
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      {filteredMessages.map(m => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
