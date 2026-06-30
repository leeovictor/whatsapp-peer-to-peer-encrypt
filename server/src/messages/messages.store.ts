import { v4 as uuidv4 } from 'uuid';

export interface StoredMessage {
  id: string;
  from: string;
  to: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
  delivered: boolean;
}

const messageQueue = new Map<string, StoredMessage[]>();

export function enqueueMessage(msg: Omit<StoredMessage, 'id'>): StoredMessage {
  const message: StoredMessage = { id: uuidv4(), ...msg };
  const queue = messageQueue.get(message.to) || [];
  queue.push(message);
  messageQueue.set(message.to, queue);
  console.log(`[Messages] Enqueued message ${message.id} for ${message.to}`);
  return message;
}

export function dequeueMessages(userId: string): StoredMessage[] {
  const queue = messageQueue.get(userId) || [];
  messageQueue.delete(userId);
  console.log(`[Messages] Dequeued ${queue.length} messages for ${userId}`);
  return queue;
}

export function hasPendingMessages(userId: string): boolean {
  const queue = messageQueue.get(userId);
  return queue !== undefined && queue.length > 0;
}

export function pendingCount(userId: string): number {
  return messageQueue.get(userId)?.length || 0;
}
