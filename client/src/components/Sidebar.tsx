import { useState } from 'react';
import { ConversationList } from './ConversationList';
import { useChat } from '@/hooks/useChat';

export function Sidebar() {
  const { startConversation } = useChat();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    const result = await startConversation(username.trim());
    setLoading(false);
    if (result.success) {
      setUsername('');
    } else {
      setError(result.error || 'Erro');
    }
  };

  return (
    <div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            disabled={loading}
            style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
          />
          <button
            onClick={handleStart}
            disabled={loading || !username.trim()}
            style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {loading ? '...' : 'Iniciar'}
          </button>
        </div>
        {error && (
          <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>{error}</div>
        )}
      </div>
      <ConversationList />
    </div>
  );
}
