import { AuthorSnapshot } from './publication.js';

export type NotificationType = 'upvote' | 'comment' | 'follow' | 'quote' | 'share';
export type NotificationStatus = 'pending' | 'seen';

export interface Notification {
  id: string; // UUID v7
  recipient_id: string;
  sender: AuthorSnapshot;
  type: NotificationType;
  target_publication_id: string | null;
  status: NotificationStatus;
  created_at: string;
}

export interface PushPreferences {
  messages: boolean;
  replies: boolean;
  quotes: boolean;
  upvotes: boolean;
  shares: boolean;
  follows: boolean;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  messages: true,
  replies: true,
  quotes: true,
  upvotes: true,
  shares: true,
  follows: true,
};

