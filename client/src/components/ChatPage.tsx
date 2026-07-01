import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { SecuritySettings } from './SecuritySettings';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function ChatPage() {
  const { logout, user } = useAuth();
  const { activeUserId } = useChat();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showSettings, setShowSettings] = useState(false);

  const userBar = (
    <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900">
      <span className="text-gray-200 font-semibold">{user?.username}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-gray-200 transition-colors bg-transparent border-none text-lg"
        >
          {'\u{2699}'}
        </button>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-400 transition-colors bg-transparent border-none text-sm"
        >
          Sair
        </button>
      </div>
    </div>
  );

  if (showSettings) {
    return (
      <div className="h-dvh overflow-y-auto bg-gray-950">
        <SecuritySettings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-gray-950">
        {userBar}
        {activeUserId ? (
          <div className="flex-1 min-h-0 flex flex-col bg-gray-850">
            <ChatWindow />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-gray-950">
      <div className="w-80 flex flex-col bg-gray-900 border-r border-gray-800">
        {userBar}
        <Sidebar />
      </div>
      <div className="flex-1 min-h-0 flex flex-col bg-gray-850">
        <ChatWindow />
      </div>
    </div>
  );
}