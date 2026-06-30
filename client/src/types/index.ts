export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  plaintext: string;
  timestamp: number;
  direction: 'sent' | 'received';
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
}

export interface WsOutgoingMessage {
  type: 'message';
  to: string;
  iv: string;
  ciphertext: string;
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
