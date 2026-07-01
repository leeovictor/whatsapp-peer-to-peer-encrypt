import { useState, FormEvent, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';

export function MessageInput() {
  const { sendMessage, sendTypingStart, sendTypingStop } = useChat();
  const [text, setText] = useState('');
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      inputRef.current?.focus();
      if (isTypingRef.current) {
        isTypingRef.current = false;
        clearTypingTimer();
        sendTypingStop();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Digite uma mensagem..."
        className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
      />
      <button
        type="submit"
        onMouseDown={e => e.preventDefault()}
        disabled={!text.trim()}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
      >
        Enviar
      </button>
    </form>
  );
}