import { WebSocket } from 'ws';
import { WsError, WsOutgoingMessage } from '../types';

export function handleMessage(ws: WebSocket, data: string, userId: string, connections: Map<string, WebSocket>): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' } satisfies WsError));
    return;
  }

  const msg = parsed as { type?: string; to?: string; text?: string };
  if (msg.type !== 'message' || !msg.to || !msg.text) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' } satisfies WsError));
    return;
  }

  const targetWs = connections.get(msg.to);
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message: 'User offline' } satisfies WsError));
    return;
  }

  const outgoing: WsOutgoingMessage = {
    type: 'message',
    from: userId,
    text: msg.text,
    timestamp: Date.now(),
  };

  targetWs.send(JSON.stringify(outgoing));
}
