import { Role } from '@oomfy/shared';

export interface AdminUserFilters {
  query?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: Role;
  status?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
}

export class AdminUserQueryBuilder {
  public static build(filters: AdminUserFilters): { sql: string; params: any[] } {
    let sql = 'SELECT id, username, name, email, role, status, created_at FROM members';
    const conditions: string[] = [];
    const params: any[] = [];

    const addParam = (val: any): string => {
      params.push(val);
      return `$${params.length}`;
    };

    if (filters.query?.trim()) {
      const q = `%${filters.query.trim()}%`;
      const p = addParam(q);
      conditions.push(`(username ILIKE ${p} OR name ILIKE ${p} OR email ILIKE ${p})`);
    }
    if (filters.name?.trim()) {
      conditions.push(`name ILIKE ${addParam(`%${filters.name.trim()}%`)}`);
    }
    if (filters.username?.trim()) {
      conditions.push(`username ILIKE ${addParam(`%${filters.username.trim()}%`)}`);
    }
    if (filters.email?.trim()) {
      conditions.push(`email ILIKE ${addParam(`%${filters.email.trim()}%`)}`);
    }
    if (filters.role && filters.role !== ('all' as any)) {
      conditions.push(`role = ${addParam(filters.role)}`);
    }
    if (filters.status && filters.status !== 'all') {
      conditions.push(`status = ${addParam(filters.status)}`);
    }
    if (filters.created_from) {
      conditions.push(`created_at >= ${addParam(filters.created_from)}::timestamptz`);
    }
    if (filters.created_to) {
      conditions.push(`created_at <= ${addParam(filters.created_to)}::timestamptz`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const limit = filters.limit || 30;
    const offset = filters.offset || 0;
    sql += ` ORDER BY created_at DESC LIMIT ${addParam(limit)} OFFSET ${addParam(offset)};`;

    return { sql, params };
  }
}

