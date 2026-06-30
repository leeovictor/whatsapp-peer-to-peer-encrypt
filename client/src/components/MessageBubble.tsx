import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isSent = message.direction === 'sent';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isSent ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '8px 12px',
        borderRadius: 12,
        background: isSent ? '#dcf8c6' : '#fff',
        border: '1px solid #ddd',
      }}>
        <p style={{ margin: 0, wordBreak: 'break-word' }}>{message.text}</p>
        <small style={{ color: '#888', fontSize: 10 }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </small>
      </div>
    </div>
  );
}
