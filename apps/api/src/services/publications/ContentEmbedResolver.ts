import { Publication, PublicationEmbed } from '@oomfy/shared';
import { UrlPreviewAdapter } from '../../infrastructure/adapters/UrlPreviewAdapter.js';
import { clampText } from '../../infrastructure/adapters/OpenGraphParser.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { ForbiddenError } from '../../errors/AppError.js';

export interface ResolveContentEmbedsOptions {
  userId: string;
  allowQuotePromotion?: boolean;
  throwOnBlockedQuote?: boolean;
  budgetMs?: number;
}

export interface ResolvedContentEmbeds {
  embeds: PublicationEmbed[];
  quotedPublication: Publication | null;
}

export class ContentEmbedResolver {
  public static async resolveForContent(
    content: string | null | undefined,
    options: ResolveContentEmbedsOptions
  ): Promise<ResolvedContentEmbeds> {
    const cleanContent = content?.trim() || '';
    if (!cleanContent) {
      return { embeds: [], quotedPublication: null };
    }

    const urls = UrlPreviewAdapter.extractUrls(cleanContent, 4);
    if (urls.length === 0) {
      return { embeds: [], quotedPublication: null };
    }

    const previews = await UrlPreviewAdapter.getPreviews(urls, options.budgetMs ?? 4500);
    const embeds: PublicationEmbed[] = [];
    let quotedPublication: Publication | null = null;

    for (const preview of previews) {
      if (preview.type === 'quote' && preview.target_publication) {
        if (options.allowQuotePromotion && !quotedPublication) {
          const quoted = preview.target_publication as Publication;
          if (
            quoted.author?.id &&
            quoted.author.id !== options.userId &&
            (await MongoBlockRepository.isBlockedEitherWay(options.userId, quoted.author.id))
          ) {
            if (options.throwOnBlockedQuote) {
              throw new ForbiddenError('No puedes interactuar con las publicaciones de este usuario.');
            }
            continue;
          }
          quotedPublication = PublicationMapper.stripViewerFlags({
            ...quoted,
            images: PublicationMapper.sanitizeImages(quoted.images),
            embeds: PublicationMapper.sanitizeEmbeds(quoted.embeds),
          });
        } else {
          embeds.push({
            type: 'link',
            url: preview.url,
            title: clampText(preview.title, 200),
            description: clampText(preview.description, 200),
            site_name: 'Oomfy',
          });
        }
      } else if (preview.type !== 'quote') {
        embeds.push(preview);
      }
    }

    return {
      embeds: PublicationMapper.sanitizeEmbeds(embeds),
      quotedPublication,
    };
  }
}
