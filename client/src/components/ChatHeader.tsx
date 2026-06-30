interface ChatHeaderProps {
  username: string;
}

export function ChatHeader({ username }: ChatHeaderProps) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid #ccc', fontWeight: 'bold', fontSize: 16 }}>
      {username}
    </div>
  );
}
