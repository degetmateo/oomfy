export type Role = 'member' | 'tester' | 'mod' | 'admin';

export type UserStatus = 'pending' | 'active' | 'suspended';

export interface UserImageMetadata {
  url: string | null;
  source?: 'imgbb' | 'other' | null;
  delete_url?: string | null;
  imgbb_id?: string | null;
}

export interface User {
  id: string; // UUID v7
  username: string;
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  link: string | null;
  role: Role;
  status: UserStatus;
  created_at: string;
  icon?: UserImageMetadata | null;
  banner?: UserImageMetadata | null;
  icon_url?: string | null;
  banner_url?: string | null;
}

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  bio: string | null;
  location: string | null;
  link: string | null;
  created_at: string;
  icon_url: string | null;
  banner_url: string | null;
  follower_count: number;
  followed_count: number;
  publication_count: number;
  is_following?: boolean;
}

