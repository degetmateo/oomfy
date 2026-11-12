import { describe, it, expect } from 'vitest';
import { AdminUserQueryBuilder } from '../src/services/admin/AdminUserQueryBuilder.js';

describe('AdminUserQueryBuilder', () => {
  it('builds basic select query without filters', () => {
    const { sql, params } = AdminUserQueryBuilder.build({});
    expect(sql).toContain('FROM members');
    expect(sql).toContain('ORDER BY created_at DESC');
    expect(params).toEqual([30, 0]);
  });

  it('builds query with search, role, status and date range', () => {
    const { sql, params } = AdminUserQueryBuilder.build({
      query: 'alice',
      role: 'admin',
      status: 'active',
      created_from: '2026-01-01',
      created_to: '2026-12-31',
      limit: 15,
      offset: 5,
    });

    expect(sql).toContain('FROM members WHERE');
    expect(sql).toContain('username ILIKE $1 OR name ILIKE $1');
    expect(sql).not.toContain('email');
    expect(sql).toContain('role = $2');
    expect(sql).toContain('status = $3');
    expect(sql).toContain('created_at >= $4::timestamptz');
    expect(sql).toContain('created_at <= $5::timestamptz');
    expect(sql).toContain('LIMIT $6 OFFSET $7');
    expect(params).toEqual(['%alice%', 'admin', 'active', '2026-01-01', '2026-12-31', 15, 5]);
  });

  it('builds query with specific name and username filters', () => {
    const { sql, params } = AdminUserQueryBuilder.build({
      name: 'Bob',
      username: 'bob_the_builder',
    });

    expect(sql).toContain('name ILIKE $1');
    expect(sql).toContain('username ILIKE $2');
    expect(params).toEqual(['%Bob%', '%bob_the_builder%', 30, 0]);
  });
});

