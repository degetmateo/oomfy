export interface Session {
  id: string; // UUID v7
  user_id: string;
  ip: string;
  platform: string;
  created_at: string;
  is_current?: boolean;
}

