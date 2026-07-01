import { Request } from 'express';
import { WebSocket } from 'ws';

export type ConnectionsMap = Map<string, Set<WebSocket>>;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface WsMessage {
  type: 'message';
  to: string;
  iv: string;
  ciphertext: string;
}

export interface WsOutgoingMessage {
  type: 'message';
  from: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
}

export interface WsError {
  type: 'error';
  message: string;
}

export interface PublicKeyEntry {
  userId: string;
  publicKey: string;
}

export interface PublicKeyVersion {
  version: number;
  publicKey: string;
  createdAt: number;
}

export interface StoredMessage {
  id: string;
  from: string;
  to: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
  delivered: boolean;
}

export interface WsQueuedNotification {
  type: 'queued';
  messageId: string;
  to: string;
}

export interface WsOfflineMessages {
  type: 'offline_messages';
  messages: Array<{
    from: string;
    iv: string;
    ciphertext: string;
    timestamp: number;
  }>;
}
