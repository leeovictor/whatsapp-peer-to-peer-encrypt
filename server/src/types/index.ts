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
  messageId: string;
}

export interface WsOutgoingMessage {
  type: 'message';
  from: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
  messageId: string;
}

export interface WsDeliveryAck {
  type: 'delivery_ack';
  messageId: string;
  to: string;
  timestamp: number;
}

export interface WsReadReceipt {
  type: 'read_receipt';
  from: string;
  to: string;
  timestamp: number;
}

export interface WsStatus {
  type: 'status';
  userId: string;
  online: boolean;
}

export interface WsStatusBatch {
  type: 'status_batch';
  statuses: Array<{ userId: string; online: boolean }>;
}

export interface WsTypingNotification {
  type: 'typing_start' | 'typing_stop';
  from?: string;
  to: string;
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
  clientMessageId: string;
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
    messageId: string;
    from: string;
    iv: string;
    ciphertext: string;
    timestamp: number;
  }>;
}
