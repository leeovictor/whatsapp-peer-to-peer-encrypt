import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { AuthPage } from '@/components/AuthPage';
import { ChatPage } from '@/components/ChatPage';

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <ChatPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AuthProvider>
  );
}
