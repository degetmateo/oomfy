import { Report, ReportStatus } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoReportRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<Report>('reports');
  }

  public static async create(report: Report): Promise<void> {
    const col = this.getCollection();
    const id = report.id;
    const idUuid = MongoIdHelper.toMongoId(id);
    const reporterUuid = MongoIdHelper.toMongoId(report.reporter_id);
    const targetUuid = MongoIdHelper.toMongoId(report.target_id);
    await col.insertOne({
      ...report,
      _id: idUuid,
      id,
      reporter_id: reporterUuid,
      target_id: targetUuid,
    } as any);
  }

  public static async list(
    status?: ReportStatus,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ reports: Report[]; total: number }> {
    const col = this.getCollection();
    const query: any = {};
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      col.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(query),
    ]);

    return {
      reports: reports.map((r: any) => ({
        ...r,
        id: String(r.id || r._id),
        reporter_id: String(r.reporter_id),
        target_id: String(r.target_id),
        resolved_by: r.resolved_by ? String(r.resolved_by) : null,
      })),
      total,
    };
  }

  public static async findById(id: string): Promise<Report | null> {
    const col = this.getCollection();
    const r = await col.findOne(MongoIdHelper.idFilter(id) as any);
    if (!r) return null;
    return {
      ...r,
      id: String((r as any).id || (r as any)._id),
      reporter_id: String((r as any).reporter_id),
      target_id: String((r as any).target_id),
      resolved_by: (r as any).resolved_by ? String((r as any).resolved_by) : null,
    };
  }

  public static async updateStatus(
    id: string,
    status: ReportStatus,
    resolvedBy: string
  ): Promise<boolean> {
    const col = this.getCollection();
    const resolvedByUuid = MongoIdHelper.toMongoId(resolvedBy);
    const result = await col.updateOne(
      MongoIdHelper.idFilter(id) as any,
      {
        $set: {
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedByUuid,
        },
      }
    );
    return result.modifiedCount > 0;
  }
}
