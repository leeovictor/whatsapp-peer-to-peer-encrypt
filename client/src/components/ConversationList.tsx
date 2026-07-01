import { useChat } from '@/hooks/useChat';
import { hasSession } from '@/crypto/session';

export function ConversationList() {
  const { activePeers, activeUserId, selectUser, users, isOnline, getUnreadCount, typingUsers, messagesByPeer, deleteConversation } = useChat();

  const sortedPeers = [...activePeers].sort((a, b) => {
    const msgsA = messagesByPeer.get(a) ?? [];
    const msgsB = messagesByPeer.get(b) ?? [];
    const lastA = msgsA.length > 0 ? msgsA[msgsA.length - 1].timestamp : 0;
    const lastB = msgsB.length > 0 ? msgsB[msgsB.length - 1].timestamp : 0;
    return lastB - lastA;
  });

  if (activePeers.length === 0) {
    return (
      <div className="px-4 py-3 text-gray-500 text-sm">
        Nenhuma conversa ainda
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Conversas
      </div>
      <ul className="list-none p-0 m-0">
        {sortedPeers.map(peerId => {
          const contact = users.get(peerId);
          const isSecure = hasSession(peerId);
          const online = isOnline(peerId);
          const unread = getUnreadCount(peerId);
          const isActive = activeUserId === peerId;
          const isTyping = typingUsers.has(peerId);
          const msgs = messagesByPeer.get(peerId) ?? [];
          const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const lastTime = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const preview = lastMsg
            ? `${lastMsg.direction === 'sent' ? 'Você: ' : ''}${lastMsg.plaintext.substring(0, 45)}${lastMsg.plaintext.length > 45 ? '...' : ''}`
            : '';

          return (
            <li
              key={peerId}
              className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-800/50 ${isActive ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
            >
              <div className="relative shrink-0">
                <span className="text-lg">{isSecure ? '\u{1F512}' : '\u{1F513}'}</span>
                {online && (
                  <span className="absolute -bottom-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-gray-900" />
                )}
              </div>
              <div className="flex-1 min-w-0" onClick={() => selectUser(peerId)}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-200 font-medium text-sm truncate">
                    {contact?.username || peerId.substring(0, 8)}
                  </span>
                  {lastMsg && (
                    <span className="text-gray-500 text-xs shrink-0 ml-2">{lastTime}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  {isTyping ? (
                    <span className="text-blue-400 text-xs italic truncate">digitando...</span>
                  ) : preview ? (
                    <span className="text-gray-500 text-xs truncate">{preview}</span>
                  ) : null}
                  {!isActive && unread > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-5 text-center leading-none shrink-0 ml-2">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Excluir conversa?')) {
                    deleteConversation(peerId);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-400 bg-transparent border-none shrink-0"
                title="Excluir conversa"
              >
                🗑️
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}