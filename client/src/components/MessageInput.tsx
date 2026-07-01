import { useState, FormEvent, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';

export function MessageInput() {
  const { sendMessage, sendTypingStart, sendTypingStop } = useChat();
  const [text, setText] = useState('');
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const clearTypingTimer = useCallback(() => {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setText(value);

    if (value.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingStart();
      }
      clearTypingTimer();
      typingStopTimer.current = setTimeout(() => {
        isTypingRef.current = false;
        sendTypingStop();
      }, 1500);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        clearTypingTimer();
        sendTypingStop();
      }
    }
  }, [sendTypingStart, sendTypingStop, clearTypingTimer]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
      if (isTypingRef.current) {
        isTypingRef.current = false;
        clearTypingTimer();
        sendTypingStop();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', padding: 12, borderTop: '1px solid #ccc' }}>
      <input
        type="text"
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Digite uma mensagem..."
        style={{ flex: 1, padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <button type="submit" style={{ marginLeft: 8, padding: '10px 16px' }}>Enviar</button>
    </form>
  );
}
