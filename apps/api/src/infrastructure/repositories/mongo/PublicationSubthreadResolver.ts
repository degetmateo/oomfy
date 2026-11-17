import { Collection } from 'mongodb';
import { Publication } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { buildOrderedSubthread, groupByParent, sameAuthor, sortDirectReplies, traceAuthorChain } from './SubthreadGraphHelper.js';

export class PublicationSubthreadResolver {
  private static async decorateList(items: Publication[], userId?: string): Promise<Publication[]> {
    if (items.length === 0) return items;
    const populated = await PublicationTargetPopulator.populate(items);
    return PublicationInteractionDecorator.decorate(populated, userId);
  }

  private static async fetchThreadDescendants(col: Collection<any>, parentIds: string[], rootId?: string | null): Promise<Publication[]> {
    const variants = Array.from(new Set(parentIds.flatMap((id) => MongoIdHelper.idVariants(id))));
    const rootVariants = rootId ? MongoIdHelper.idVariants(rootId) : [];
    const orClauses: any[] = [
      { parent_publication_id: { $in: variants } },
      { target_publication_id: { $in: variants } },
      { thread_ids: { $in: variants } },
      { root_publication_id: { $in: rootVariants.length > 0 ? rootVariants : variants } },
    ];
    const docs = await col.find({ type: 'reply', $or: orClauses }).sort({ created_at: 1, _id: 1 }).limit(300).toArray();
    return docs.map(PublicationMapper.toDomain);
  }

  public static async attachAuthorThreadPreviews(col: Collection<any>, posts: Publication[], userId?: string, previewLimit = 2): Promise<Publication[]> {
    const candidates = posts.filter((p) => p.type === 'default' || p.type === 'quote');
    if (candidates.length === 0) return posts;
    const allReplies = await this.fetchThreadDescendants(col, candidates.map((p) => p.id));
    if (allReplies.length === 0) return posts;

    const previewPool: Publication[] = [];
    const perPostChain = new Map<string, Publication[]>();
    for (const post of candidates) {
      const chain = traceAuthorChain(post, allReplies);
      if (chain.length > 0) { perPostChain.set(post.id, chain); previewPool.push(...chain.slice(0, previewLimit)); }
    }
    const decoratedMap = new Map((await this.decorateList(previewPool, userId)).map((p) => [p.id, p]));
    return posts.map((post) => {
      const chain = perPostChain.get(post.id);
      if (!chain?.length) return post;
      const preview = chain.slice(0, previewLimit).map((c) => decoratedMap.get(c.id) || c);
      return { ...post, author_thread_preview: preview, author_thread_remaining_count: Math.max(0, chain.length - preview.length) };
    });
  }

  public static async findRepliesWithSubthreads(col: Collection<any>, targetId: string, userId?: string, limit = 50, parentPub?: Publication, previewLimit = 2): Promise<Publication[]> {
    const targetVariants = MongoIdHelper.idVariants(targetId);
    const docs = await col.find({
      type: 'reply',
      $or: [{ target_publication_id: { $in: targetVariants } }, { parent_publication_id: { $in: targetVariants } }, { old_parent_publication_id: parseInt(targetId, 10) || -1 }],
    }).sort({ created_at: 1, _id: 1 }).limit(limit).toArray();
    if (docs.length === 0) return [];

    const directReplies = await this.decorateList(docs.map(PublicationMapper.toDomain), userId);
    const descendants = await this.fetchThreadDescendants(col, directReplies.map((r) => r.id), parentPub?.root_publication_id || targetId);
    const byParent = groupByParent(descendants);
    const rootAuthor = parentPub?.author;
    const previewPool: Publication[] = [];
    const builtMap = new Map<string, Publication[]>();

    for (const reply of directReplies) {
      const sub = buildOrderedSubthread(reply, byParent, rootAuthor);
      if (sub.length > 0) { builtMap.set(reply.id, sub); previewPool.push(...sub.slice(0, previewLimit)); }
    }
    const decoratedMap = new Map((await this.decorateList(previewPool, userId)).map((p) => [p.id, p]));
    const enriched = directReplies.map((reply) => {
      const sub = builtMap.get(reply.id) || [];
      if (sub.length === 0) return reply;
      const preview = sub.slice(0, previewLimit).map((s) => decoratedMap.get(s.id) || s);
      return {
        ...reply, subthread_preview: preview, subthread_remaining_count: Math.max(0, sub.length - preview.length),
        has_author_reply: Boolean(rootAuthor && sub.some((s) => sameAuthor(s.author, rootAuthor))),
      };
    });
    return sortDirectReplies(enriched, rootAuthor);
  }

  public static async getPaginatedSubthread(col: Collection<any>, pub: Publication, mode: 'author' | 'subthread', offset = 0, limit = 5, userId?: string) {
    const descendants = await this.fetchThreadDescendants(col, [pub.id], mode === 'subthread' ? (pub.root_publication_id || pub.id) : pub.id);
    let rootAuthor = pub.author;
    if (mode === 'subthread' && (pub.root_publication_id || pub.parent_publication_id)) {
      const rootDoc = await col.findOne(MongoIdHelper.idFilter(pub.root_publication_id || pub.parent_publication_id!));
      if (rootDoc) rootAuthor = PublicationMapper.toDomain(rootDoc).author;
    }
    const ordered = mode === 'author' ? traceAuthorChain(pub, descendants) : buildOrderedSubthread(pub, groupByParent(descendants), rootAuthor);
    const slice = ordered.slice(offset, offset + limit);
    const decorated = await this.decorateList(slice, userId);
    const remaining = Math.max(0, ordered.length - (offset + decorated.length));
    return { items: decorated, remaining, has_more: remaining > 0, total: ordered.length };
  }
}
