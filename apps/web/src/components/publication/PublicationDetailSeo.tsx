import React from 'react';
import { Publication, SITE_URL } from '@oomfy/shared';
import { SeoHead } from '../common/SeoHead.js';

export const PublicationDetailSeo: React.FC<{ publication: Publication; repliesCount: number }> = ({
  publication,
  repliesCount,
}) => {
  const snippet = (publication.content || 'Publicación multimedia').replace(/\s+/g, ' ').trim();
  const plain = snippet.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
  const isThin = plain.length < 15 && (!publication.images || publication.images.length === 0);
  const ogImg = publication.images?.[0]?.url || `${SITE_URL}/og/user/${publication.author.username}`;

  return (
    <SeoHead
      title={`${publication.author.name}: "${snippet.slice(0, 60)}" en Oomfy`}
      description={snippet.slice(0, 155)}
      canonicalPath={`/publication/${publication.id}`}
      ogImage={ogImg}
      ogType="article"
      noIndex={isThin}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'SocialMediaPosting',
        headline: snippet.slice(0, 110),
        articleBody: publication.content || '',
        datePublished: publication.created_at,
        author: { '@type': 'Person', name: publication.author.name, url: `${SITE_URL}/${publication.author.username}` },
        interactionStatistic: [
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: Math.max(0, publication.upvotes_count || 0) },
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: Math.max(0, publication.comments_count || repliesCount) },
        ],
      }}
    />
  );
};

