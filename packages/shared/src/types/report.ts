export type ReportTargetType = 'publication' | 'user' | 'message';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_type: ReportTargetType;
  target_id: string;
  target_username?: string | null;
  target_content?: string | null;
  reason: string;
  details?: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface CreateReportInput {
  target_type: ReportTargetType;
  target_id: string;
  target_username?: string | null;
  target_content?: string | null;
  reason: string;
  details?: string | null;
}

