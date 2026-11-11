import { Report, ReportStatus } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoReportRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('reports');
  }

  public static async create(report: Report): Promise<void> {
    await this.getCollection().insertOne({
      ...report,
      _id: MongoIdHelper.toMongoId(report.id),
      id: report.id,
      reporter_id: MongoIdHelper.toMongoId(report.reporter_id),
      target_id: MongoIdHelper.toMongoId(report.target_id),
    });
  }

  public static async list(status?: ReportStatus, page: number = 1, limit: number = 30): Promise<{ reports: Report[]; pendingCount: number }> {
    const col = this.getCollection();
    const safeLimit = Math.min(Math.max(1, limit || 30), 100);
    const safeSkip = Math.max(0, (Math.max(1, page || 1) - 1) * safeLimit);
    const query: any = {};
    if (status) query.status = status;

    const [docs, pendingCount] = await Promise.all([
      col.find(query).sort({ created_at: -1 }).skip(safeSkip).limit(safeLimit).toArray(),
      col.countDocuments({ status: 'pending' }),
    ]);

    const reports: Report[] = docs.map((d: any) => ({
      id: String(d.id || d._id),
      reporter_id: String(d.reporter_id),
      reporter_username: d.reporter_username,
      target_type: d.target_type,
      target_id: String(d.target_id),
      target_username: d.target_username || null,
      target_content: d.target_content || null,
      reason: d.reason,
      details: d.details || null,
      status: d.status || 'pending',
      created_at: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
      resolved_at: d.resolved_at ? String(d.resolved_at) : null,
      resolved_by: d.resolved_by ? String(d.resolved_by) : null,
    }));

    return { reports, pendingCount };
  }

  public static async findById(id: string): Promise<Report | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id));
    if (!doc) return null;
    return {
      ...doc,
      id: String(doc.id || doc._id),
      reporter_id: String(doc.reporter_id),
      target_id: String(doc.target_id),
      created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
    };
  }

  public static async updateStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<boolean> {
    const res = await this.getCollection().updateOne(MongoIdHelper.idFilter(id), {
      $set: { status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy },
    });
    return res.modifiedCount > 0;
  }
}
