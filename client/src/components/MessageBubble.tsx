import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

function StatusIndicator({ status }: { status: Message['status'] }) {
  let content: string;
  let colorClass = 'text-gray-400';

  switch (status) {
    case 'sending':
      content = '\u23F3';
      break;
    case 'sent':
      content = '\u2713';
      colorClass = 'text-gray-400';
      break;
    case 'delivered':
      content = '\u2713\u2713';
      colorClass = 'text-gray-400';
      break;
    case 'read':
      content = '\u2713\u2713';
      colorClass = 'text-blue-300';
      break;
  }

  return <span className={`${colorClass} text-[10px] ml-1`}>{content}</span>;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isSent = message.direction === 'sent';

  return (
    <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-md ${
          isSent
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-750 text-gray-200 rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.plaintext}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={`text-xs ${isSent ? 'text-blue-200' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isSent && <StatusIndicator status={message.status} />}
        </div>
      </div>
    </div>
  );
}