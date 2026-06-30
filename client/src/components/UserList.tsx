import { useChat } from '@/hooks/useChat';

export function UserList() {
  const { users, activeUserId, selectUser } = useChat();

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {users.map(u => (
        <li
          key={u.id}
          onClick={() => selectUser(u.id)}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            background: activeUserId === u.id ? '#e0e0e0' : 'transparent',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {u.username}
        </li>
      ))}
    </ul>
  );
}
