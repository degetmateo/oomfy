import { describe, it, expect, beforeEach } from 'vitest';
import { mergePublicationEntity } from '../src/stores/entityMergeHelpers.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { Publication } from '@oomfy/shared';

function createMockPublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 'pub-test-counter-1',
    author: { id: 'u1', username: 'author1', name: 'Author One', role: 'member', icon_url: null, banner_url: null },
    type: 'default',
    content: 'Counter test content',
    created_at: new Date().toISOString(),
    parent_publication_id: null,
    root_publication_id: null,
    thread_ids: [],
    images: [],
    embeds: [],
    upvotes_count: 0,
    shares_count: 0,
    quotes_count: 0,
    comments_count: 0,
    is_upvoted: false,
    is_shared: false,
    target_publication: null,
    ...overrides,
  };
}

describe('Non-Negative Counters Guard (Frontend)', () => {
  beforeEach(() => {
    publicationIdentityMap.clear();
  });

  it('mergePublicationEntity preserves 0 and never returns negative numbers', () => {
    const prev = createMockPublication({ shares_count: 1, is_shared: true });
    const unsharedIncoming = createMockPublication({ shares_count: 0, is_shared: false });

    const merged = mergePublicationEntity(prev, unsharedIncoming, false);
    expect(merged.is_shared).toBe(false);
    expect(merged.shares_count).toBe(0);
  });

  it('mergePublicationEntity strictly clamps negative incoming values to 0', () => {
    const prev = createMockPublication({ upvotes_count: 0 });
    const negativeIncoming = createMockPublication({
      upvotes_count: -1 as any,
      shares_count: -5 as any,
      quotes_count: -2 as any,
      comments_count: -3 as any,
    });

    const merged = mergePublicationEntity(prev, negativeIncoming, false);
    expect(merged.upvotes_count).toBe(0);
    expect(merged.shares_count).toBe(0);
    expect(merged.quotes_count).toBe(0);
    expect(merged.comments_count).toBe(0);
  });

  it('PublicationIdentityMap.patch clamps negative results to 0', () => {
    const pub = createMockPublication({ shares_count: 0, is_shared: false });
    publicationIdentityMap.seed([pub]);

    const patched = publicationIdentityMap.patch(pub.id, (p) => ({
      ...p,
      shares_count: (p.shares_count || 0) - 1,
      is_shared: false,
    }));

    expect(patched?.shares_count).toBe(0);
    expect(publicationIdentityMap.get(pub.id)?.shares_count).toBe(0);
  });

  it('PublicationIdentityMap.seed clamps negative counters on seed', () => {
    const badPub = createMockPublication({
      id: 'bad-pub-1',
      shares_count: -1 as any,
      upvotes_count: -10 as any,
    });
    publicationIdentityMap.seed([badPub]);

    const stored = publicationIdentityMap.get('bad-pub-1');
    expect(stored?.shares_count).toBe(0);
    expect(stored?.upvotes_count).toBe(0);
  });
});

