import { Publication } from './publication.js';

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  position: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookmarkEntry {
  id: string;
  user_id: string;
  publication_id: string;
  folder_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  publication?: Publication | null;
}
