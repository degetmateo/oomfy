import { Role } from './user.js';

export interface SystemSettings {
  disable_post_creation: boolean;
  disable_profile_editing: boolean;
  disable_signups: boolean;
  disable_signins: boolean;
}

export interface AdminUserSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  publication_count?: number;
  follower_count?: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalPublications: number;
}

