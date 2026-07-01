import { useChat } from '@/hooks/useChat';

export function UserList() {
  const { users, activeUserId, selectUser, isOnline } = useChat();

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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isOnline(u.id) ? '#4caf50' : '#bbb',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {u.username}
        </li>
      ))}
    </ul>
  );
}
