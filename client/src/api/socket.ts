import { WsIncomingMessage, WsError } from '@/types';

type MessageHandler = (msg: WsIncomingMessage | WsError) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private openHandlers: Set<() => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();

  connect(token: string): void {
    if (this.ws) this.disconnect();

    this.ws = new WebSocket(`ws://localhost:3001?token=${token}`);

    this.ws.onopen = () => {
      console.log('[Socket] Connected');
      this.openHandlers.forEach(h => h());
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as WsIncomingMessage | WsError;
      this.messageHandlers.forEach(h => h(data));
    };

    this.ws.onclose = () => {
      console.log('[Socket] Disconnected');
      this.closeHandlers.forEach(h => h());
    };

    this.ws.onerror = () => {
      console.error('[Socket] Error');
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onOpen(handler: () => void): () => void {
    this.openHandlers.add(handler);
    return () => this.openHandlers.delete(handler);
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }
}

export const socketService = new SocketService();
