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

export function patchPubAuthor(pub: Publication, u: Partial<PublicUser> & { username: string; id?: string }): Publication {
  const nextAuthor = patchAuthor(pub.author, u);
  const nextTargetAuthor = pub.target_publication ? patchAuthor(pub.target_publication.author, u) : undefined;
  if (nextAuthor === pub.author && (!pub.target_publication || nextTargetAuthor === pub.target_publication.author)) {
    return pub;
  }
  return {
    ...pub,
    author: nextAuthor,
    ...(pub.target_publication ? { target_publication: { ...pub.target_publication, author: nextTargetAuthor } } : {}),
  };
}
