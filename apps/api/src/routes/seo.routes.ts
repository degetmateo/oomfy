import { Router } from 'express';
import { SeoController } from '../controllers/SeoController.js';

const router = Router();

router.get('/robots.txt', SeoController.getRobotsTxt);
router.get('/sitemap_index.xml', SeoController.getSitemapIndex);
router.get('/sitemap.xml', SeoController.getSitemapIndex);
router.get('/sitemap-static.xml', SeoController.getStaticSitemap);
router.get('/sitemap-topics.xml', SeoController.getTopicsSitemap);
router.get('/sitemap-users-1.xml', SeoController.getUsersSitemap);
router.get('/sitemap-posts-1.xml', SeoController.getPostsSitemap);
router.get('/og/user/:username', SeoController.getUserOgImage);
router.get('/api/og/user/:username', SeoController.getUserOgImage);
router.get('/seo/render', SeoController.getBotRenderedHtml);

export default router;

