import { v7 as uuidv7 } from 'uuid';
import { CreateReportInput, Report, ReportStatus } from '@oomfy/shared';
import { MongoReportRepository } from '../../infrastructure/repositories/mongo/MongoReportRepository.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class ReportService {
  public static async createReport(
    reporter: { id: string; username: string },
    input: CreateReportInput
  ): Promise<Report> {
    if (!input.target_id || !input.target_type || !input.reason) {
      throw new BadRequestError('Faltan campos obligatorios para enviar el reporte.');
    }

    const report: Report = {
      id: uuidv7(),
      reporter_id: reporter.id,
      reporter_username: reporter.username,
      target_type: input.target_type,
      target_id: input.target_id,
      target_username: input.target_username || null,
      target_content: input.target_content || null,
      reason: input.reason.trim(),
      details: input.details ? input.details.trim() : null,
      status: 'pending',
      created_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null,
    };

    await MongoReportRepository.create(report);
    return report;
  }

  public static async listReports(
    status?: ReportStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reports: Report[]; total: number; page: number; totalPages: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const { reports, total } = await MongoReportRepository.list(status, safeLimit, skip);
    return {
      reports,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  public static async resolveReport(
    reportId: string,
    status: ReportStatus,
    resolvedBy: string
  ): Promise<{ message: string }> {
    const report = await MongoReportRepository.findById(reportId);
    if (!report) {
      throw new NotFoundError('Reporte no encontrado.');
    }

    await MongoReportRepository.updateStatus(reportId, status, resolvedBy);
    return { message: `Reporte actualizado a estado ${status}.` };
  }
}

