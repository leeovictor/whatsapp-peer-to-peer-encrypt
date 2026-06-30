import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyWsToken } from './ws.auth';
import { handleMessage } from './ws.handlers';

const connections = new Map<string, WebSocket>();

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
    connections.set(userId, ws);

    ws.on('message', (data: Buffer) => {
      handleMessage(ws, data.toString(), userId, connections);
    });

    ws.on('close', () => {
      console.log(`[WS] User disconnected: ${userId}`);
      connections.delete(userId);
    });

    ws.on('error', () => {
      connections.delete(userId);
    });
  });
}
