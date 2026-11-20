import { AuthorSnapshot, Publication } from './publication.js';

export type NotificationType = 'upvote' | 'comment' | 'follow' | 'quote' | 'share' | 'mention';
export type NotificationStatus = 'pending' | 'seen';

export interface Notification {
  id: string; // UUID v7
  recipient_id: string;
  sender: AuthorSnapshot;
  type: NotificationType;
  target_publication_id: string | null;
  target_publication?: Publication | null;
  status: NotificationStatus;
  created_at: string;
}

export type PushCategoryKey = 'messages' | 'replies' | 'quotes' | 'upvotes' | 'shares' | 'follows' | 'mentions';

export interface PushPreferences {
  messages: boolean;
  replies: boolean;
  quotes: boolean;
  upvotes: boolean;
  shares: boolean;
  follows: boolean;
  mentions: boolean;
  messages_silent?: boolean;
  replies_silent?: boolean;
  quotes_silent?: boolean;
  upvotes_silent?: boolean;
  shares_silent?: boolean;
  follows_silent?: boolean;
  mentions_silent?: boolean;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  messages: true,
  replies: true,
  quotes: true,
  upvotes: true,
  shares: true,
  follows: true,
  mentions: true,
};

