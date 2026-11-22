import { ChatMessage } from './chat.js';
import { Notification } from './notification.js';

export interface ClientLeavePayload {
  activeChatId?: string | null;
  timestamp: number;
}

export interface ClientReturnPayload {
  since?: number | null;
  activeChatId?: string | null;
  chatIds?: string[];
}

export interface ClientSyncPayload {
  serverTime: number;
  unread_notifications_count: number;
  unread_messages_count: number;
  missed_notifications: Notification[];
  missed_messages: Record<string, ChatMessage[]>;
  rejoined_chats: string[];
}
