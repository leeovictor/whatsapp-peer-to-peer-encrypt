import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useAuth } from '@/hooks/useAuth';

export function ChatPage() {
  const { logout, user } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 300, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{user?.username}</strong>
          <button onClick={logout}>Sair</button>
        </div>
        <Sidebar />
      </div>
      <div style={{ flex: 1 }}>
        <ChatWindow />
      </div>
    </div>
  );
}
