import { Role } from './user.js';

export type PublicationType = 'default' | 'reply' | 'quote' | 'shared';

export interface AuthorSnapshot {
  id: string; // UUID
  username: string;
  name: string;
  role: Role;
  icon_url: string | null;
  banner_url: string | null;
}

export interface MediaItem {
  url: string;
  source: 'imgbb' | 'tenor' | 'other';
  index: number;
  delete_url?: string | null;
  imgbb_id?: string | null;
}

export interface SpotifyEmbed {
  type: 'spotify';
  url: string;
  title: string;
  iframe_url: string;
  thumbnail_url: string;
}

export interface GenericEmbed {
  type: 'twitter' | 'tiktok' | 'youtube' | 'link';
  url: string;
  title?: string;
  description?: string;
  author_name?: string;
  author_username?: string;
  thumbnail_url?: string;
  image?: string | null;
  site_name?: string;
}

export type PublicationEmbed = SpotifyEmbed | GenericEmbed;

export interface Publication {
  id: string; // UUID v7
  author: AuthorSnapshot;
  type: PublicationType;
  content: string | null;
  created_at: string;
  parent_publication_id: string | null;
  root_publication_id: string | null;
  thread_ids?: string[];
  images?: MediaItem[];
  embeds?: PublicationEmbed[];
  upvotes_count: number;
  shares_count: number;
  quotes_count: number;
  comments_count: number;
  is_upvoted?: boolean;
  is_quoted?: boolean;
  is_shared?: boolean;
  target_publication?: Publication | null;
}

