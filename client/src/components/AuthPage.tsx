import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{
      maxWidth: 400,
      margin: isMobile ? '20px auto' : '40px auto',
      padding: isMobile ? 16 : 20,
    }}>
      <h1>Web Chat E2EE</h1>
      {isLogin ? <LoginForm /> : <RegisterForm />}
      <p style={{ marginTop: 16 }}>
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Criar conta' : 'Fazer login'}
        </button>
      </p>
    </div>
  );
}
