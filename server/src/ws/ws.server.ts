import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyWsToken } from './ws.auth';
import { handleMessage, sendDeliveryAck, sendToUser } from './ws.handlers';
import { dequeueMessages } from '../messages/messages.store';
import { ConnectionsMap, WsStatus, WsStatusBatch, WsTypingNotification } from '../types';

const connections: ConnectionsMap = new Map();
const activeTyping: Map<string, Set<string>> = new Map();

function addConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);
}

function removeConnection(userId: string, ws: WebSocket): void {
  const userConns = connections.get(userId);
  if (!userConns) return;
  userConns.delete(ws);
  if (userConns.size === 0) {
    connections.delete(userId);
  }
}

function broadcastToAll(data: unknown, excludeUserId?: string): void {
  for (const [uid, conns] of connections) {
    if (uid === excludeUserId) continue;
    for (const conn of conns) {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(JSON.stringify(data));
      }
    }
  }
}

function buildStatusBatch(): WsStatusBatch {
  const statuses: Array<{ userId: string; online: boolean }> = [];
  for (const userId of connections.keys()) {
    statuses.push({ userId, online: true });
  }
  return { type: 'status_batch', statuses };
}

export function initWebSocketServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const payload = verifyWsToken(token);
    if (!payload) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const userId = payload.sub;
    console.log(`[WS] User connected: ${payload.username} (${userId})`);

    const wasOffline = !connections.has(userId) || connections.get(userId)!.size === 0;
    addConnection(userId, ws);

    const pending = dequeueMessages(userId);
    if (pending.length > 0) {
      ws.send(JSON.stringify({
        type: 'offline_messages',
        messages: pending.map(msg => ({
          type: 'message' as const,
          messageId: msg.clientMessageId,
          from: msg.from,
          iv: msg.iv,
          ciphertext: msg.ciphertext,
          timestamp: msg.timestamp,
        })),
      }));

      for (const msg of pending) {
        sendDeliveryAck(msg.clientMessageId, msg.from, msg.to, msg.timestamp, connections);
      }
    }

    ws.send(JSON.stringify(buildStatusBatch()));

    if (wasOffline) {
      const status: WsStatus = { type: 'status', userId, online: true };
      broadcastToAll(status, userId);
    }

    ws.on('message', (data: Buffer) => {
      handleMessage(ws, data.toString(), userId, connections, activeTyping);
    });

    ws.on('close', () => {
      console.log(`[WS] User disconnected: ${userId}`);
      removeConnection(userId, ws);

      const typingPeers = activeTyping.get(userId);
      if (typingPeers) {
        for (const peerId of typingPeers) {
          sendToUser(peerId, { type: 'typing_stop', from: userId, to: peerId } satisfies WsTypingNotification, connections);
        }
        activeTyping.delete(userId);
      }

      if (!connections.has(userId)) {
        const status: WsStatus = { type: 'status', userId, online: false };
        broadcastToAll(status);
      }
    });

    ws.on('error', () => {
      removeConnection(userId, ws);

      const typingPeers = activeTyping.get(userId);
      if (typingPeers) {
        for (const peerId of typingPeers) {
          sendToUser(peerId, { type: 'typing_stop', from: userId, to: peerId } satisfies WsTypingNotification, connections);
        }
        activeTyping.delete(userId);
      }

      if (!connections.has(userId)) {
        const status: WsStatus = { type: 'status', userId, online: false };
        broadcastToAll(status);
      }
    });
  });
}
