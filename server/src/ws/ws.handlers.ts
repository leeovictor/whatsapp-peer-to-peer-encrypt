import { WebSocket } from 'ws';
import { WsError, WsMessage, WsOutgoingMessage, WsQueuedNotification, ConnectionsMap } from '../types';
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

function deliverToUser(recipientId: string, outgoing: WsOutgoingMessage, connections: ConnectionsMap): boolean {
  const userConns = connections.get(recipientId);
  if (!userConns || userConns.size === 0) return false;

  let delivered = false;
  for (const conn of userConns) {
    if (conn.readyState === WebSocket.OPEN) {
      conn.send(JSON.stringify(outgoing));
      delivered = true;
    }
  }
  return delivered;
}

export function handleMessage(ws: WebSocket, data: string, userId: string, connections: ConnectionsMap): void {
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

  const outgoing: WsOutgoingMessage = {
    type: 'message',
    from: userId,
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
    timestamp: Date.now(),
  };

  const delivered = deliverToUser(parsed.to, outgoing, connections);

  if (!delivered) {
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
