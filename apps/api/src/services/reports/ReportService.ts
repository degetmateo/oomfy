import { v7 as uuidv7 } from 'uuid';
import { CreateReportInput, Report, ReportStatus } from '@oomfy/shared';
import { MongoReportRepository } from '../../infrastructure/repositories/mongo/MongoReportRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoMessageRepository } from '../../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class ReportService {
  public static async createReport(reporter: { id: string; username: string }, input: CreateReportInput): Promise<Report> {
    if (!input.target_type || !input.target_id || !input.reason?.trim()) {
      throw new BadRequestError('Faltan datos obligatorios para generar el reporte.');
    }

    let verifiedUsername: string | null = input.target_username || null;
    let verifiedContent: string | null = input.target_content || null;

    if (input.target_type === 'publication') {
      const pub = await MongoPublicationRepository.findById(input.target_id);
      if (!pub) throw new NotFoundError('Publicación reportada no encontrada.');
      verifiedUsername = pub.author.username;
      verifiedContent = pub.content ? pub.content.slice(0, 300) : null;
    } else if (input.target_type === 'user') {
      const member = await MongoMemberRepository.findById(input.target_id) || await MongoMemberRepository.findByUsername(input.target_id);
      if (!member) throw new NotFoundError('Usuario reportado no encontrado.');
      verifiedUsername = member.username;
      verifiedContent = member.bio ? member.bio.slice(0, 300) : null;
    } else if (input.target_type === 'message') {
      const msg = await MongoMessageRepository.findById(input.target_id);
      if (!msg) throw new NotFoundError('Mensaje reportado no encontrado.');
      verifiedUsername = msg.sender?.username || null;
      verifiedContent = msg.content ? msg.content.slice(0, 300) : null;
    }

    const report: Report = {
      id: uuidv7(),
      reporter_id: reporter.id,
      reporter_username: reporter.username,
      target_type: input.target_type,
      target_id: input.target_id,
      target_username: verifiedUsername,
      target_content: verifiedContent,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await MongoReportRepository.create(report);
    return report;
  }

  public static async listReports(status?: ReportStatus, page: number = 1, limit: number = 30) {
    return MongoReportRepository.list(status, Math.max(1, page || 1), Math.min(Math.max(1, limit || 30), 50));
  }

  public static async resolveReport(id: string, status: 'resolved' | 'dismissed', adminUsername: string): Promise<{ message: string }> {
    const existing = await MongoReportRepository.findById(id);
    if (!existing) throw new NotFoundError('Reporte no encontrado.');
    if (!['resolved', 'dismissed'].includes(status)) throw new BadRequestError('Estado de resolución inválido.');
    await MongoReportRepository.updateStatus(id, status, adminUsername);
    return { message: `Reporte marcado como ${status}.` };
  }
}
