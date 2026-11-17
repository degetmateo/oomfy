import { describe, it, expect } from 'vitest';
import { Publication } from '@oomfy/shared';
import { buildOrderedSubthread, groupByParent } from '../src/infrastructure/repositories/mongo/SubthreadGraphHelper.js';

const makePub = (id: string, username: string, parentId: string | null, createdAt = new Date().toISOString()): Publication => ({
  id,
  author: { id: `u-${username}`, username, name: username, role: 'member', icon_url: null, banner_url: null },
  type: 'reply',
  content: `Content from ${username}`,
  created_at: createdAt,
  parent_publication_id: parentId,
  root_publication_id: 'root-post',
  images: [],
  embeds: [],
  upvotes_count: 0,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
});

describe('SubthreadGraphHelper - Single Linear Subthread Path', () => {
  const rootAuthor = { id: 'u-shiro', username: 'shiro' };
  const lou = makePub('lou-1', 'lou', 'root-post', '2026-11-17T10:00:00Z');

  it('does NOT connect disjoint sibling branches under the same parent', () => {
    // Shiro replies to Lou, bateo also replies to Lou
    const shiroReply = makePub('shiro-1', 'shiro', 'lou-1', '2026-11-17T11:00:00Z');
    const bateoReply = makePub('bateo-1', 'bateo', 'lou-1', '2026-11-17T10:30:00Z');

    const byParent = groupByParent([shiroReply, bateoReply]);
    const subthread = buildOrderedSubthread(lou, byParent, rootAuthor);

    // Should prioritize the root author's branch and NOT append bateo
    expect(subthread.map((p) => p.id)).toEqual(['shiro-1']);
    expect(subthread.some((p) => p.id === 'bateo-1')).toBe(false);
  });

  it('follows multi-step conversation in chosen branch and ignores sibling branches', () => {
    const shiroReply = makePub('shiro-1', 'shiro', 'lou-1', '2026-11-17T11:00:00Z');
    const louReplyToShiro = makePub('lou-2', 'lou', 'shiro-1', '2026-11-17T11:05:00Z');
    const bateoReply = makePub('bateo-1', 'bateo', 'lou-1', '2026-11-17T10:30:00Z');
    const bateoFollowUp = makePub('bateo-2', 'carlos', 'bateo-1', '2026-11-17T10:35:00Z');

    const byParent = groupByParent([shiroReply, louReplyToShiro, bateoReply, bateoFollowUp]);
    const subthread = buildOrderedSubthread(lou, byParent, rootAuthor);

    expect(subthread.map((p) => p.id)).toEqual(['shiro-1', 'lou-2']);
  });

  it('prioritizes branch whose deeper descendant contains root author', () => {
    // UserA replied to Lou, and Shiro (author) replied to UserA
    // UserB also replied to Lou
    const userAReply = makePub('userA-1', 'userA', 'lou-1', '2026-11-17T10:10:00Z');
    const shiroToUserA = makePub('shiro-1', 'shiro', 'userA-1', '2026-11-17T10:15:00Z');
    const userBReply = makePub('userB-1', 'userB', 'lou-1', '2026-11-17T10:05:00Z');

    const byParent = groupByParent([userAReply, shiroToUserA, userBReply]);
    const subthread = buildOrderedSubthread(lou, byParent, rootAuthor);

    expect(subthread.map((p) => p.id)).toEqual(['userA-1', 'shiro-1']);
  });
});
