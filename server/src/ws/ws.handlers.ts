import { WebSocket } from 'ws';
import { WsError, WsMessage, WsOutgoingMessage, WsDeliveryAck, WsReadReceipt, WsQueuedNotification, WsTypingNotification, ConnectionsMap } from '../types';
import { enqueueMessage } from '../messages/messages.store';
import { sendPushNotification } from '../notifications/notifications.service';

function isValidMessage(data: unknown): data is WsMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data && data.type === 'message' &&
    'to' in data && typeof data.to === 'string' &&
    'iv' in data && typeof data.iv === 'string' &&
    'ciphertext' in data && typeof data.ciphertext === 'string' &&
    'messageId' in data && typeof data.messageId === 'string'
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

export function sendToUser(userId: string, data: unknown, connections: ConnectionsMap): boolean {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return false;

  let sent = false;
  for (const conn of userConns) {
    if (conn.readyState === WebSocket.OPEN) {
      conn.send(JSON.stringify(data));
      sent = true;
    }
  }
  return sent;
}

export function handleMessage(ws: WebSocket, data: string, userId: string, connections: ConnectionsMap, activeTyping: Map<string, Set<string>>): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' } satisfies WsError));
    return;
  }

  if (parsed && typeof parsed === 'object' && 'type' in parsed) {
    switch ((parsed as Record<string, unknown>).type) {
      case 'message':
        handleChatMessage(ws, parsed as WsMessage, userId, connections);
        return;
      case 'read_receipt':
        handleReadReceipt(ws, parsed as WsReadReceipt & { to: string }, userId, connections);
        return;
      case 'typing_start':
      case 'typing_stop':
        handleTypingNotification(ws, parsed as WsTypingNotification, userId, connections, activeTyping);
        return;
    }
  }

  ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' } satisfies WsError));
}

function handleChatMessage(ws: WebSocket, parsed: WsMessage, userId: string, connections: ConnectionsMap): void {
  const outgoing: WsOutgoingMessage = {
    type: 'message',
    from: userId,
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
    timestamp: Date.now(),
    messageId: parsed.messageId,
  };

  const delivered = deliverToUser(parsed.to, outgoing, connections);

  const deliveryAck: WsDeliveryAck = {
    type: 'delivery_ack',
    messageId: parsed.messageId,
    to: parsed.to,
    timestamp: outgoing.timestamp,
  };

  if (delivered) {
    ws.send(JSON.stringify(deliveryAck));
  } else {
    enqueueMessage({
      clientMessageId: parsed.messageId,
      from: userId,
      to: parsed.to,
      iv: parsed.iv,
      ciphertext: parsed.ciphertext,
      timestamp: outgoing.timestamp,
      delivered: false,
    });

    const queued: WsQueuedNotification = {
      type: 'queued',
      messageId: parsed.messageId,
      to: parsed.to,
    };
    ws.send(JSON.stringify(queued));

    sendPushNotification(parsed.to, 'New message', 'You have a new encrypted message');
  }
}

function handleTypingNotification(ws: WebSocket, parsed: WsTypingNotification, userId: string, connections: ConnectionsMap, activeTyping: Map<string, Set<string>>): void {
  if (parsed.type === 'typing_start') {
    if (!activeTyping.has(userId)) activeTyping.set(userId, new Set());
    activeTyping.get(userId)!.add(parsed.to);
  } else {
    const typingSet = activeTyping.get(userId);
    if (typingSet) {
      typingSet.delete(parsed.to);
      if (typingSet.size === 0) activeTyping.delete(userId);
    }
  }

  const outgoing: WsTypingNotification = {
    type: parsed.type,
    from: userId,
    to: parsed.to,
  };
  sendToUser(parsed.to, outgoing, connections);
}

function handleReadReceipt(ws: WebSocket, parsed: { to: string; timestamp: number }, userId: string, connections: ConnectionsMap): void {
  const receipt: WsReadReceipt = {
    type: 'read_receipt',
    from: userId,
    to: parsed.to,
    timestamp: parsed.timestamp,
  };

  sendToUser(parsed.to, receipt, connections);
}

export function sendDeliveryAck(messageId: string, from: string, toUserId: string, timestamp: number, connections: ConnectionsMap): void {
  const ack: WsDeliveryAck = {
    type: 'delivery_ack',
    messageId,
    to: toUserId,
    timestamp,
  };
  sendToUser(from, ack, connections);
}
