import { AuthorSnapshot } from './publication.js';

export interface FollowRelation {
  id: string; // UUID v7
  follower_id: string;
  followed_id: string;
  follower: AuthorSnapshot;
  followed: AuthorSnapshot;
  created_at: string;
}

