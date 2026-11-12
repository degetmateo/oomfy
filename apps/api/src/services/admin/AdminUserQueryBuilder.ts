import { Role, UserStatus } from '@oomfy/shared';
import { BadRequestError } from '../../errors/AppError.js';

export interface AdminUserFilters {
  query?: string;
  name?: string;
  username?: string;
  role?: Role;
  status?: UserStatus;
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
}

export class AdminUserQueryBuilder {
  public static build(filters: AdminUserFilters): { sql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    const addCond = (sqlFragment: string, value: any) => {
      params.push(value);
      conditions.push(sqlFragment.replace('?', `$${params.length}`));
    };

    if (filters.query?.trim()) {
      params.push(`%${filters.query.trim()}%`);
      const idx = params.length;
      conditions.push(`(username ILIKE $${idx} OR name ILIKE $${idx})`);
    }
    if (filters.name?.trim()) addCond('name ILIKE ?', `%${filters.name.trim()}%`);
    if (filters.username?.trim()) addCond('username ILIKE ?', `%${filters.username.trim()}%`);
    if (filters.role) addCond('role = ?', filters.role);
    if (filters.status) addCond('status = ?', filters.status);

    if (filters.created_from) {
      if (Number.isNaN(Date.parse(filters.created_from))) throw new BadRequestError('Fecha inicial inválida.');
      addCond('created_at >= ?::timestamptz', filters.created_from);
    }
    if (filters.created_to) {
      if (Number.isNaN(Date.parse(filters.created_to))) throw new BadRequestError('Fecha final inválida.');
      addCond('created_at <= ?::timestamptz', filters.created_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rawLimit = Number(filters.limit);
    const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 30), 100);
    const rawOffset = Number(filters.offset);
    const offset = Math.max(0, Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0);

    params.push(limit, offset);
    const fromClause = whereClause ? `FROM members ${whereClause}` : 'FROM members';
    const sql = `SELECT id, username, name, role, status, created_at ${fromClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    return { sql, params };
  }
}
