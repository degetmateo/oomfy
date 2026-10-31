import { AdminStats } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';

export class AdminStatsService {
  public static async getStats(): Promise<AdminStats> {
    const pool = PostgresPool.getInstance();

    const userStatsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
      FROM oomfy;
    `);

    const userStats = userStatsRes.rows[0] || { total: 0, active: 0, suspended: 0 };

    const totalPublications = await MongoDatabase.getDb()
      .collection('publications')
      .countDocuments();

    return {
      totalUsers: userStats.total,
      activeUsers: userStats.active,
      suspendedUsers: userStats.suspended,
      totalPublications,
    };
  }
}

