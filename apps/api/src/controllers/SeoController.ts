import { Request, Response, NextFunction } from 'express';
import { SitemapService } from '../services/seo/SitemapService.js';
import { OgCardService } from '../services/seo/OgCardService.js';

export class SeoController {
  public static getRobotsTxt(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(SitemapService.getRobotsTxt());
  }

  public static getSitemapIndex(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.status(200).send(SitemapService.getSitemapIndex());
  }

  public static getStaticSitemap(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(SitemapService.getStaticSitemap());
  }

  public static async getTopicsSitemap(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const xml = await SitemapService.getTopicsSitemap();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  }

  public static async getUsersSitemap(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const xml = await SitemapService.getUsersSitemap();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  }

  public static async getPostsSitemap(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const xml = await SitemapService.getPostsSitemap();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  }

  public static async getUserOgImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const svg = await OgCardService.generateUserOgSvg(req.params.username);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(svg);
    } catch (err) {
      next(err);
    }
  }

  public static async getBotRenderedHtml(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const path = String(req.query.path || req.path || '/');
      const html = await OgCardService.generateBotHtml(path);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=600');
      res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  }
}

