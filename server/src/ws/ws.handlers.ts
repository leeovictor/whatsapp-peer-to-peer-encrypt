import { WebSocket } from 'ws';
import { WsError, WsMessage, WsOutgoingMessage, WsQueuedNotification } from '../types';
import { enqueueMessage } from '../messages/messages.store';

function isValidMessage(data: unknown): data is WsMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data && data.type === 'message' &&
    'to' in data && typeof data.to === 'string' &&
    'iv' in data && typeof data.iv === 'string' &&
    'ciphertext' in data && typeof data.ciphertext === 'string'
  );
}

export function handleMessage(ws: WebSocket, data: string, userId: string, connections: Map<string, WebSocket>): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' } satisfies WsError));
    return;
  }

  if (!isValidMessage(parsed)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' } satisfies WsError));
    return;
  }

  const targetWs = connections.get(parsed.to);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    const outgoing: WsOutgoingMessage = {
      type: 'message',
      from: userId,
      iv: parsed.iv,
      ciphertext: parsed.ciphertext,
      timestamp: Date.now(),
    };
    targetWs.send(JSON.stringify(outgoing));
  } else {
    const message = enqueueMessage({
      from: userId,
      to: parsed.to,
      iv: parsed.iv,
      ciphertext: parsed.ciphertext,
      timestamp: Date.now(),
      delivered: false,
    });

    const queued: WsQueuedNotification = {
      type: 'queued',
      messageId: message.id,
      to: parsed.to,
    };
    ws.send(JSON.stringify(queued));
  }
}
