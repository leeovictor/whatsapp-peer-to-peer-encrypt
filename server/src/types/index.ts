import { Request } from 'express';

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
  text: string;
}

export interface WsOutgoingMessage {
  type: 'message';
  from: string;
  text: string;
  timestamp: number;
}

export interface WsError {
  type: 'error';
  message: string;
}
