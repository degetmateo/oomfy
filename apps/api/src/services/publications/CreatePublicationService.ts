import { v7 as uuidv7 } from 'uuid';
import { CreatePublicationInput, LIMITS, Publication, PublicationEmbed } from '@oomfy/shared';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { UrlPreviewAdapter } from '../../infrastructure/adapters/UrlPreviewAdapter.js';
import { clampText } from '../../infrastructure/adapters/OpenGraphParser.js';
import { AuthorProfileResolver } from './AuthorProfileResolver.js';
import { PublicationMediaHelper } from './PublicationMediaHelper.js';
import { MentionNotificationHelper } from './MentionNotificationHelper.js';
import { BadRequestError, ForbiddenError } from '../../errors/AppError.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';

export class CreatePublicationService {
  public static async execute(
    input: CreatePublicationInput,
    user: { id: string; username: string; name: string; role: any },
    imageFiles: Express.Multer.File[] = []
  ): Promise<Publication> {
    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_post_creation && user.role !== 'admin') {
      throw new ForbiddenError('La creación de publicaciones está desactivada temporalmente por mantenimiento.');
    }

    const content = input.content?.replace(/\r\n?/g, '\n').trim() || '';
    if (user.role !== 'admin' && content.length > LIMITS.POST_CONTENT_MAX) {
      throw new BadRequestError(`El contenido no puede superar los ${LIMITS.POST_CONTENT_MAX} caracteres.`);
    }
    const tenorList = PublicationMediaHelper.parseTenorList(input.tenor);
    if (!content && imageFiles.length === 0 && tenorList.length === 0) {
      throw new BadRequestError('La publicación no puede estar vacía.');
    }

    let targetPublication: Publication | null = null;
    let pubType = input.type || 'default';
    if (input.target_id) {
      targetPublication = await MongoPublicationRepository.findById(input.target_id);
      if (!targetPublication) throw new BadRequestError('Publicación destino no encontrada.');
      if (targetPublication.author?.id && targetPublication.author.id !== user.id && (await MongoBlockRepository.isBlockedEitherWay(user.id, targetPublication.author.id))) {
        throw new ForbiddenError('No puedes interactuar con las publicaciones de este usuario.');
      }
    }

    const embeds: PublicationEmbed[] = [];
    if (content) {
      const urls = UrlPreviewAdapter.extractUrls(content, 4);
      const previews = await UrlPreviewAdapter.getPreviews(urls, 4500);
      for (const preview of previews) {
        if (preview.type === 'quote' && preview.target_publication) {
          if (!input.target_id && !targetPublication && pubType === 'default') {
            const quoted = preview.target_publication as Publication;
            if (quoted.author?.id && quoted.author.id !== user.id && (await MongoBlockRepository.isBlockedEitherWay(user.id, quoted.author.id))) {
              throw new ForbiddenError('No puedes interactuar con las publicaciones de este usuario.');
            }
            targetPublication = quoted;
            pubType = 'quote';
          } else {
            embeds.push({
              type: 'link', url: preview.url, title: clampText(preview.title, 200),
              description: clampText(preview.description, 200), site_name: 'Oomfy',
            });
          }
        } else if (preview.type !== 'quote') {
          embeds.push(preview);
        }
      }
    }

    const [limitedMedia, { iconUrl, bannerUrl }] = await Promise.all([
      PublicationMediaHelper.buildMediaItems(imageFiles, tenorList),
      AuthorProfileResolver.resolve(user),
    ]);

    let rootPublicationId: string | null = null;
    const threadIds: string[] = [];
    let didIncrementQuote = false;
    if (targetPublication && pubType === 'quote') {
      await MongoPublicationRepository.incrementCounters(targetPublication.id, { quotes_count: 1 });
      didIncrementQuote = true;
    } else if (targetPublication && input.target_id) {
      pubType = 'reply';
      rootPublicationId = targetPublication.root_publication_id || targetPublication.id;
      if (targetPublication.thread_ids?.length) threadIds.push(...targetPublication.thread_ids);
      threadIds.push(targetPublication.id);
      await MongoPublicationRepository.incrementCounters(targetPublication.id, { comments_count: 1 });
    }

    const newPublication: Publication = {
      id: uuidv7(),
      author: { id: user.id, username: user.username, name: user.name, role: user.role, icon_url: iconUrl, banner_url: bannerUrl },
      type: pubType as any, content: content || null, created_at: new Date().toISOString(),
      parent_publication_id: targetPublication?.id || input.target_id || null,
      root_publication_id: rootPublicationId, thread_ids: threadIds, images: limitedMedia, embeds,
      upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0, target_publication: targetPublication,
    };

    await MongoPublicationRepository.create(newPublication);
    await MongoMemberRepository.incrementCounters(user.id, { publication_count: 1 });
    await MentionNotificationHelper.notifyPublicationCreated(newPublication, targetPublication, pubType, user);
    return {
      ...newPublication,
      images: PublicationMapper.sanitizeImages(newPublication.images),
      target_publication: targetPublication ? {
        ...targetPublication,
        images: PublicationMapper.sanitizeImages(targetPublication.images),
        ...(didIncrementQuote ? { quotes_count: Math.max(0, targetPublication.quotes_count || 0) + 1, is_quoted: true } : {}),
      } : null,
    };
  }
}
