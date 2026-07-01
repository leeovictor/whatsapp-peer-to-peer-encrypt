import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyWsToken } from './ws.auth';
import { handleMessage } from './ws.handlers';
import { dequeueMessages } from '../messages/messages.store';
import { ConnectionsMap } from '../types';

const connections: ConnectionsMap = new Map();

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
    addConnection(userId, ws);

    const pending = dequeueMessages(userId);
    if (pending.length > 0) {
      ws.send(JSON.stringify({
        type: 'offline_messages',
        messages: pending.map(msg => ({
          type: 'message' as const,
          from: msg.from,
          iv: msg.iv,
          ciphertext: msg.ciphertext,
          timestamp: msg.timestamp,
        })),
      }));
    }

    ws.on('message', (data: Buffer) => {
      handleMessage(ws, data.toString(), userId, connections);
    });

    ws.on('close', () => {
      console.log(`[WS] User disconnected: ${userId}`);
      removeConnection(userId, ws);
    });

    ws.on('error', () => {
      removeConnection(userId, ws);
    });
  });
}
