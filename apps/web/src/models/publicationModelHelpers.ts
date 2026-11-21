import { Publication, PublicUser } from '@oomfy/shared';

export function normalizePubCounters(pub: Publication): Publication {
  return {
    ...pub,
    upvotes_count: Math.max(0, pub.upvotes_count || 0),
    shares_count: Math.max(0, pub.shares_count || 0),
    quotes_count: Math.max(0, pub.quotes_count || 0),
    comments_count: Math.max(0, pub.comments_count || 0),
  };
}

function patchAuthor(author: any, u: Partial<PublicUser>): any {
  if (!author) return author;
  const sameId = u.id && author.id === u.id;
  const sameUser = u.username && author.username?.toLowerCase() === u.username.toLowerCase();
  if (!sameId && !sameUser) return author;
  return {
    ...author,
    ...(u.name !== undefined ? { name: u.name } : {}),
    ...(u.username !== undefined ? { username: u.username } : {}),
    ...(u.role !== undefined ? { role: u.role } : {}),
    ...(u.icon_url !== undefined ? { icon_url: u.icon_url } : {}),
    ...(u.banner_url !== undefined ? { banner_url: u.banner_url } : {}),
  };
}

type AuthorPatch = Partial<PublicUser> & { username: string; id?: string };

function patchPreviewList(list: Publication[] | undefined, u: AuthorPatch): Publication[] | undefined {
  if (!list?.length) return list;
  let changed = false;
  const next = list.map((item) => {
    const patched = patchPubAuthor(item, u);
    if (patched !== item) changed = true;
    return patched;
  });
  return changed ? next : list;
}

export function patchPubAuthor(pub: Publication, u: AuthorPatch): Publication {
  const nextAuthor = patchAuthor(pub.author, u);
  const nextTargetAuthor = pub.target_publication ? patchAuthor(pub.target_publication.author, u) : undefined;
  const nextThread = patchPreviewList(pub.author_thread_preview, u);
  const nextSub = patchPreviewList(pub.subthread_preview, u);
  if (
    nextAuthor === pub.author &&
    (!pub.target_publication || nextTargetAuthor === pub.target_publication.author) &&
    nextThread === pub.author_thread_preview &&
    nextSub === pub.subthread_preview
  ) {
    return pub;
  }
  return {
    ...pub,
    author: nextAuthor,
    ...(pub.target_publication ? { target_publication: { ...pub.target_publication, author: nextTargetAuthor } } : {}),
    ...(nextThread !== pub.author_thread_preview ? { author_thread_preview: nextThread } : {}),
    ...(nextSub !== pub.subthread_preview ? { subthread_preview: nextSub } : {}),
  };
}

export function applyCanonicalAuthors(
  pub: Publication,
  getUser: (username?: string | null) => PublicUser | undefined
): Publication {
  let next = pub;
  const candidates = [
    next.author?.username,
    next.target_publication?.author?.username,
    ...(next.author_thread_preview || []).map((p) => p.author?.username),
    ...(next.subthread_preview || []).map((p) => p.author?.username),
  ];
  const seen = new Set<string>();
  for (const un of candidates) {
    const key = un?.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const canonical = getUser(key);
    if (canonical) next = patchPubAuthor(next, canonical);
  }
  return next;
}
