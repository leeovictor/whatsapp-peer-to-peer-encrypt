import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

function StatusIndicator({ status }: { status: Message['status'] }) {
  let content: string;
  let color = '#888';

  switch (status) {
    case 'sending':
      content = '\u23F3';
      break;
    case 'sent':
      content = '\u2713';
      break;
    case 'delivered':
      content = '\u2713\u2713';
      break;
    case 'read':
      content = '\u2713\u2713';
      color = '#53bdeb';
      break;
  }

  return <span style={{ color, fontSize: 10, marginLeft: 4 }}>{content}</span>;
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
        <p style={{ margin: 0, wordBreak: 'break-word' }}>{message.plaintext}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 }}>
          <small style={{ color: '#888', fontSize: 10 }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </small>
          {isSent && <StatusIndicator status={message.status} />}
        </div>
      </div>
    </div>
  );
}
