import { Publication, AuthorSnapshot } from '@oomfy/shared';

export function sameAuthor(a?: Partial<AuthorSnapshot> | null, b?: Partial<AuthorSnapshot> | null): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id).toLowerCase() === String(b.id).toLowerCase()) return true;
  return Boolean(a.username && b.username && a.username.toLowerCase() === b.username.toLowerCase());
}

export function parentKeyOf(pub: Pick<Publication, 'parent_publication_id'> & { target_publication_id?: any }): string {
  const raw = pub.parent_publication_id || pub.target_publication_id || '';
  return raw ? String(raw).toLowerCase() : '';
}

export function groupByParent(items: Publication[]): Map<string, Publication[]> {
  const map = new Map<string, Publication[]>();
  for (const item of items) {
    const pKey = parentKeyOf(item);
    if (!pKey) continue;
    const list = map.get(pKey) || [];
    list.push(item);
    map.set(pKey, list);
  }
  return map;
}

export function traceAuthorChain(rootPost: Publication, allReplies: Publication[]): Publication[] {
  const byParent = groupByParent(allReplies);
  const visited = new Set<string>([rootPost.id.toLowerCase()]);
  const chain: Publication[] = [];
  let curr: Publication = rootPost;

  while (chain.length < 30) {
    const children = byParent.get(curr.id.toLowerCase()) || [];
    const next = children.find(
      (c) => !visited.has(c.id.toLowerCase()) && sameAuthor(c.author, rootPost.author)
    );
    if (!next) break;
    visited.add(next.id.toLowerCase());
    chain.push(next);
    curr = next;
  }
  return chain;
}

export function buildOrderedSubthread(
  starter: Publication,
  byParent: Map<string, Publication[]>,
  rootAuthor?: Partial<AuthorSnapshot> | null
): Publication[] {
  const visited = new Set<string>([starter.id.toLowerCase()]);
  const ordered: Publication[] = [];

  const rankChild = (c: Publication) => {
    if (sameAuthor(c.author, rootAuthor)) return 0;
    if (sameAuthor(c.author, starter.author)) return 1;
    return 2;
  };

  const visit = (nodeId: string) => {
    const children = [...(byParent.get(nodeId.toLowerCase()) || [])].sort((a, b) => rankChild(a) - rankChild(b));
    for (const child of children) {
      const cKey = child.id.toLowerCase();
      if (visited.has(cKey)) continue;
      visited.add(cKey);
      ordered.push(child);
      visit(child.id);
    }
  };

  visit(starter.id);
  return ordered;
}

export function sortDirectReplies(replies: Publication[], rootAuthor?: Partial<AuthorSnapshot> | null): Publication[] {
  const tierOf = (r: Publication) => {
    if (sameAuthor(r.author, rootAuthor)) return 0;
    if (r.has_author_reply) return 1;
    return 2;
  };
  return [...replies].sort((a, b) => tierOf(a) - tierOf(b));
}
