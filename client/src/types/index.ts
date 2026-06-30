export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
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
  text: string;
  timestamp: number;
}

export interface WsOutgoingMessage {
  type: 'message';
  to: string;
  text: string;
}

export interface WsError {
  type: 'error';
  message: string;
}
