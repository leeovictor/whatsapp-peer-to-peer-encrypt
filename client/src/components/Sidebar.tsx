import { UserList } from './UserList';

export function Sidebar() {
  return (
    <div>
      <h3 style={{ padding: '8px 12px 0', margin: 0 }}>Usuários</h3>
      <UserList />
    </div>
  );
}
