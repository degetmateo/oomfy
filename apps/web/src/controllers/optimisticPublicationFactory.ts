import { MediaWarning, Publication, PublicUser } from '@oomfy/shared';

const blobUrlTracker = new Map<string, string[]>();

export function revokeTrackedBlobs(tempId: string): void {
  const urls = blobUrlTracker.get(tempId);
  if (urls && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }
  blobUrlTracker.delete(tempId);
}

export function buildOptimisticPublication(input: {
  user: PublicUser;
  content: string;
  files: File[];
  gifs: string[];
  fileWarnings?: (MediaWarning | null)[];
  gifWarnings?: (MediaWarning | null)[];
  type: 'default' | 'quote' | 'reply';
  targetPublication?: Publication | null;
}): Publication {
  const id = `temp-pub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const blobs: string[] = [];
  const fileImages = input.files
    .map((file, idx) => {
      const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
      if (url.startsWith('blob:')) blobs.push(url);
      const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
      const warning = input.fileWarnings?.[idx] ?? null;
      return {
        url,
        source: 'other' as const,
        index: idx,
        ...(warning ? { warning } : {}),
        ...(isGif ? { is_gif: true } : {}),
      };
    })
    .filter((m) => Boolean(m.url));
  if (blobs.length > 0) blobUrlTracker.set(id, blobs);

  const gifImages = input.gifs.map((url, idx) => {
    const warning = input.gifWarnings?.[idx] ?? null;
    return {
      url,
      source: 'tenor' as const,
      index: fileImages.length + idx,
      is_gif: true,
      ...(warning ? { warning } : {}),
    };
  });
  return {
    id,
    author: {
      id: input.user.id,
      username: input.user.username,
      name: input.user.name,
      role: input.user.role,
      icon_url: input.user.icon_url || `/members/${input.user.username}/icon`,
      banner_url: input.user.banner_url || null,
    },
    type: input.type,
    content: input.content || null,
    created_at: new Date().toISOString(),
    parent_publication_id: input.targetPublication?.id || null,
    root_publication_id: input.targetPublication?.root_publication_id || input.targetPublication?.id || null,
    images: [...fileImages, ...gifImages],
    embeds: [],
    upvotes_count: 0,
    shares_count: 0,
    quotes_count: 0,
    comments_count: 0,
    is_upvoted: false,
    is_shared: false,
    is_quoted: false,
    target_publication: input.targetPublication || null,
  };
}
