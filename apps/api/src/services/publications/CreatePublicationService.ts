import { v7 as uuidv7 } from 'uuid';
import { CreatePublicationInput, Publication } from '@oomfy/shared';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { UrlPreviewAdapter } from '../../infrastructure/adapters/UrlPreviewAdapter.js';
import { AuthorProfileResolver } from './AuthorProfileResolver.js';
import { PublicationMediaHelper } from './PublicationMediaHelper.js';
import { PublicationSnippetHelper } from './PublicationSnippetHelper.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
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

    const content = input.content?.trim() || '';
    const tenorList = PublicationMediaHelper.parseTenorList(input.tenor);
    if (!content && imageFiles.length === 0 && tenorList.length === 0) {
      throw new BadRequestError('La publicación no puede estar vacía.');
    }

    const limitedMedia = await PublicationMediaHelper.buildMediaItems(imageFiles, tenorList);
    const { iconUrl, bannerUrl } = await AuthorProfileResolver.resolve(user);
    const embeds: any[] = [];
    let targetPublication: Publication | null = null;
    let rootPublicationId: string | null = null;
    const threadIds: string[] = [];
    let pubType = input.type || 'default';

    if (content) {
      const extractedUrl = UrlPreviewAdapter.extractFirstUrl(content);
      const preview = extractedUrl ? await UrlPreviewAdapter.getPreview(extractedUrl) : null;
      if (preview) {
        if (preview.type === 'quote' && !targetPublication) {
          targetPublication = preview.target_publication;
          pubType = 'quote';
        } else embeds.push(preview);
      }
    }

    if (input.target_id) {
      targetPublication = await MongoPublicationRepository.findById(input.target_id);
      if (!targetPublication) throw new BadRequestError('Publicación destino no encontrada.');
    }
    if (targetPublication?.author?.id && targetPublication.author.id !== user.id && (await MongoBlockRepository.isBlockedEitherWay(user.id, targetPublication.author.id))) {
      throw new ForbiddenError('No puedes interactuar con las publicaciones de este usuario.');
    }
    if (targetPublication && input.target_id) {
      if (pubType === 'quote') {
        await MongoPublicationRepository.incrementCounters(targetPublication.id, { quotes_count: 1 });
      } else {
        pubType = 'reply';
        rootPublicationId = targetPublication.root_publication_id || targetPublication.id;
        if (targetPublication.thread_ids?.length) threadIds.push(...targetPublication.thread_ids);
        threadIds.push(targetPublication.id);
        await MongoPublicationRepository.incrementCounters(targetPublication.id, { comments_count: 1 });
      }
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

    if (targetPublication) {
      await NotificationDispatcher.dispatch({
        recipientId: targetPublication.author.id, sender: newPublication.author,
        type: pubType === 'quote' ? 'quote' : 'comment', targetPublicationId: newPublication.id,
        push: {
          title: pubType === 'quote' ? `${user.name} te citó` : `${user.name} te respondió`,
          body: PublicationSnippetHelper.extractSnippet(newPublication),
          url: `/publication/${newPublication.id}`, category: pubType === 'quote' ? 'quotes' : 'replies',
        },
      });
    }
    return {
      ...newPublication,
      images: PublicationMapper.sanitizeImages(newPublication.images),
      target_publication: targetPublication ? { ...targetPublication, images: PublicationMapper.sanitizeImages(targetPublication.images) } : null,
    };
  }
}
