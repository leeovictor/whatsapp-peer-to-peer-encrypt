export interface User {
  id: string;
  username: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  from: string;
  to: string;
  plaintext: string;
  timestamp: number;
  direction: 'sent' | 'received';
  status: MessageStatus;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WsIncomingMessage {
  type: 'message';
  from: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
  messageId: string;
}

export interface WsOutgoingMessage {
  type: 'message';
  to: string;
  iv: string;
  ciphertext: string;
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

export interface WsTypingStartNotification {
  type: 'typing_start';
  from: string;
}

export interface WsTypingStopNotification {
  type: 'typing_stop';
  from: string;
}

export interface WsStatusBatch {
  type: 'status_batch';
  statuses: Array<{ userId: string; online: boolean }>;
}

export interface WsError {
  type: 'error';
  message: string;
}

export interface WsQueuedNotification {
  type: 'queued';
  messageId: string;
  to: string;
}

export interface PublicKeyResponse {
  publicKey: string;
}

export interface PublicKeyVersion {
  version: number;
  publicKey: string;
  createdAt: number;
}

export interface PublicKeyVersionMeta {
  version: number;
  createdAt: number;
}

export interface PublicKeyVersionsResponse {
  versions: PublicKeyVersionMeta[];
}

export interface KeyVersionResponse {
  publicKey: string;
  version: number | string;
}

export interface Conversation {
  peerId: string;
  peerUsername: string;
  lastMessage?: string;
  lastTimestamp?: number;
  hasSession: boolean;
}
