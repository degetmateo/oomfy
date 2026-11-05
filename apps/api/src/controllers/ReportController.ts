import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reports/ReportService.js';
import { ReportStatus } from '@oomfy/shared';

export class ReportController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporter = {
        id: req.user!.id,
        username: req.user!.username,
      };
      const result = await ReportService.createReport(reporter, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = (req.query.status as ReportStatus) || undefined;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await ReportService.listReports(status, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const resolvedBy = req.user!.username;

      const result = await ReportService.resolveReport(id, status, resolvedBy);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

