import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function ChatPage() {
  const { logout, user } = useAuth();
  const { activeUserId } = useChat();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const headerStyle = {
    padding: 12,
    borderBottom: '1px solid #ccc' as const,
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  };

  const userBar = (
    <div style={headerStyle}>
      <strong>{user?.username}</strong>
      <button onClick={logout}>Sair</button>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {userBar}
        {activeUserId ? (
          <div style={{ flex: 1 }}>
            <ChatWindow />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Sidebar />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 300, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        {userBar}
        <Sidebar />
      </div>
      <div style={{ flex: 1 }}>
        <ChatWindow />
      </div>
    </div>
  );
}
