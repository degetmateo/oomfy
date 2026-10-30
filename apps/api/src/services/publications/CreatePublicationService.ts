import { v7 as uuidv7 } from 'uuid';
import { CreatePublicationInput, Publication, MediaItem } from '@oomfy/shared';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { UrlPreviewAdapter } from '../../infrastructure/adapters/UrlPreviewAdapter.js';
import { AuthorProfileResolver } from './AuthorProfileResolver.js';
import { BadRequestError } from '../../errors/AppError.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class CreatePublicationService {
  public static async execute(
    input: CreatePublicationInput,
    user: { id: string; username: string; name: string; role: any },
    imageFiles: Express.Multer.File[] = []
  ): Promise<Publication> {
    const content = input.content?.trim() || '';
    let tenorList: Array<{ src?: string; index?: number }> = [];
    if (typeof input.tenor === 'string') {
      try { tenorList = JSON.parse(input.tenor); } catch { tenorList = []; }
    } else if (Array.isArray(input.tenor)) {
      tenorList = input.tenor;
    }

    if (!content && imageFiles.length === 0 && tenorList.length === 0 && input.type !== 'shared') {
      throw new BadRequestError('La publicación no puede estar vacía.');
    }

    const mediaItems: MediaItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const upload = await ImgBBStorageAdapter.upload(imageFiles[i].buffer);
      mediaItems.push({
        url: upload.url,
        source: 'imgbb',
        index: i,
        delete_url: upload.delete_url,
        imgbb_id: upload.imgbb_id,
      });
    }

    for (const t of tenorList) {
      if (t && typeof t.src === 'string' && t.src.trim().length > 0) {
        mediaItems.push({ url: t.src.trim(), source: 'tenor', index: t.index ?? 0 });
      }
    }

    const { iconUrl, bannerUrl } = await AuthorProfileResolver.resolve(user);
    const embeds: any[] = [];
    let targetPublication: Publication | null = null;
    let rootPublicationId: string | null = null;
    const threadIds: string[] = [];

    let pubType = input.type || 'default';
    if (content) {
      const extractedUrl = UrlPreviewAdapter.extractFirstUrl(content);
      if (extractedUrl) {
        const preview = await UrlPreviewAdapter.getPreview(extractedUrl);
        if (preview) {
          if (preview.type === 'quote' && !targetPublication) {
            targetPublication = preview.target_publication;
            pubType = 'quote';
          } else {
            embeds.push(preview);
          }
        }
      }
    }

    if (input.target_id) {
      targetPublication = await MongoPublicationRepository.findById(input.target_id);
      if (!targetPublication) throw new BadRequestError('Publicación destino no encontrada.');

      if (pubType === 'quote') {
        rootPublicationId = null;
        await MongoPublicationRepository.incrementCounters(targetPublication.id, { quotes_count: 1 });
      } else {
        pubType = 'reply';
        rootPublicationId = targetPublication.root_publication_id || targetPublication.id;
        if (targetPublication.thread_ids && targetPublication.thread_ids.length > 0) {
          threadIds.push(...targetPublication.thread_ids);
        }
        threadIds.push(targetPublication.id);
        await MongoPublicationRepository.incrementCounters(targetPublication.id, { comments_count: 1 });
      }
    }

    const newPublication: Publication = {
      id: uuidv7(),
      author: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        icon_url: iconUrl,
        banner_url: bannerUrl,
      },
      type: pubType as any,
      content: content || null,
      created_at: new Date().toISOString(),
      parent_publication_id: targetPublication?.id || input.target_id || null,
      root_publication_id: rootPublicationId,
      thread_ids: threadIds,
      images: mediaItems,
      embeds,
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
      target_publication: targetPublication,
    };

    await MongoPublicationRepository.create(newPublication);
    await MongoMemberRepository.incrementCounters(user.id, { publication_count: 1 });

    if (targetPublication && targetPublication.author.id !== user.id) {
      const notifType = pubType === 'quote' ? 'quote' : 'comment';
      const notif = {
        id: uuidv7(),
        recipient_id: targetPublication.author.id,
        sender: newPublication.author,
        type: notifType as any,
        target_publication_id: newPublication.id,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      };
      await MongoNotificationRepository.create(notif);
      SocketGateway.sendNotification(targetPublication.author.id, notif);
    }

    return newPublication;
  }
}
