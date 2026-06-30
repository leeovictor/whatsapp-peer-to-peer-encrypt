import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20 }}>
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
