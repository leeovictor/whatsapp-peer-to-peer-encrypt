import { WsIncomingMessage, WsDeliveryAck, WsReadReceipt, WsStatus, WsStatusBatch, WsError, WsQueuedNotification } from '@/types';

type MessageHandler = (msg: WsIncomingMessage | WsDeliveryAck | WsReadReceipt | WsStatus | WsStatusBatch | WsError | WsQueuedNotification) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private openHandlers: Set<() => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();

  private token: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  connect(token: string): void {
    this.token = token;
    this.intentionalClose = false;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.openHandlers.forEach(h => h());
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === 'offline_messages') {
        data.messages.forEach((msg: WsIncomingMessage) => {
          this.messageHandlers.forEach(h => h(msg));
        });
        return;
      }

      this.messageHandlers.forEach(h => h(data));
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.closeHandlers.forEach(h => h());

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      console.error('[WS] Error');
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.createConnection();
    }, delay);
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.reconnectAttempts = 0;
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
