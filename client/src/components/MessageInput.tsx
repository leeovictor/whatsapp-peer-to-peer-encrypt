import { useState, FormEvent } from 'react';
import { useChat } from '@/hooks/useChat';

export function MessageInput() {
  const { sendMessage } = useChat();
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', padding: 12, borderTop: '1px solid #ccc' }}>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Digite uma mensagem..."
        style={{ flex: 1, padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <button type="submit" style={{ marginLeft: 8, padding: '10px 16px' }}>Enviar</button>
    </form>
  );
}
