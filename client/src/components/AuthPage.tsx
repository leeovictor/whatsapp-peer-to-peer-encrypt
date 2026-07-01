import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-6 text-center">
          Web Chat E2EE
        </h1>
        {isLogin ? <LoginForm /> : <RegisterForm />}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-400 hover:text-blue-300 text-sm text-center w-full mt-4 bg-transparent border-none"
        >
          {isLogin ? 'Criar conta' : 'Fazer login'}
        </button>
      </div>
    </div>
  );
}
