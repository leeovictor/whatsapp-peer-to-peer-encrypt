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
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleStart}
            disabled={loading || !username.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? '...' : 'Iniciar'}
          </button>
        </div>
        {error && (
          <div className="text-red-400 text-xs mt-1">{error}</div>
        )}
      </div>
      <ConversationList />
    </div>
  );
}