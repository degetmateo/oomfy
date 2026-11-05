import { Report, ReportStatus } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

export class MongoReportRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<Report>('reports');
  }

  public static async create(report: Report): Promise<void> {
    const col = this.getCollection();
    await col.insertOne({
      _id: report.id as any,
      ...report,
    });
  }

  public static async list(
    status?: ReportStatus,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ reports: Report[]; total: number }> {
    const col = this.getCollection();
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const [reports, total] = await Promise.all([
      col
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(query),
    ]);

    return { reports, total };
  }

  public static async findById(id: string): Promise<Report | null> {
    const col = this.getCollection();
    return col.findOne({ $or: [{ _id: id as any }, { id }] });
  }

  public static async updateStatus(
    id: string,
    status: ReportStatus,
    resolvedBy: string
  ): Promise<boolean> {
    const col = this.getCollection();
    const result = await col.updateOne(
      { $or: [{ _id: id as any }, { id }] },
      {
        $set: {
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
        },
      }
    );
    return result.modifiedCount > 0;
  }
}

