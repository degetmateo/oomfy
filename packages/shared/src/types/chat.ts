import { AuthorSnapshot } from './publication.js';

export interface Participant {
  id: string; // UUID v7
  chat_id: string;
  user_id: string;
  joined_at: string;
  role: 'member' | 'admin';
  user: AuthorSnapshot;
}

export interface ChatMessage {
  id: string; // UUID v7
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  status: 'sent' | 'delivered' | 'read';
  sender?: AuthorSnapshot;
}

export interface Chat {
  id: string; // UUID v7
  type: 'private' | 'group';
  created_at: string;
  participants: Participant[];
  last_message?: ChatMessage | null;
}

