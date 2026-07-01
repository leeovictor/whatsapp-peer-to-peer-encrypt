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
    <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 bg-gray-850">
      {filteredMessages.map(m => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}