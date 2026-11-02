import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryPublicationService } from '../src/services/publications/QueryPublicationService.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { Publication } from '@oomfy/shared';

vi.mock('../src/infrastructure/repositories/mongo/MongoPublicationRepository.js', () => ({
  MongoPublicationRepository: {
    findById: vi.fn(),
    findAncestors: vi.fn(),
    findReplies: vi.fn(),
    findFeed: vi.fn(),
  },
}));

describe('QueryPublicationService Unit Tests', () => {
  const samplePub: Publication = {
    id: 'pub-leaf',
    author: {
      id: 'author-1',
      username: 'user1',
      name: 'User One',
      role: 'member',
      icon_url: null,
      banner_url: null,
    },
    type: 'reply',
    content: 'Leaf publication in long thread',
    created_at: '2026-11-01T12:00:00Z',
    parent_publication_id: 'pub-4',
    root_publication_id: 'pub-0',
    thread_ids: ['pub-0', 'pub-1', 'pub-2', 'pub-3', 'pub-4'],
    images: [],
    embeds: [],
    upvotes_count: 0,
    shares_count: 0,
    quotes_count: 0,
    comments_count: 0,
    is_upvoted: false,
    is_shared: false,
    target_publication: null,
  };

  const createAncestors = (count: number): Publication[] => {
    return Array.from({ length: count }, (_, i) => ({
      ...samplePub,
      id: `pub-${i}`,
      content: `Ancestor #${i}`,
      created_at: new Date(1700000000000 + i * 1000).toISOString(),
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('slices ancestors when thread is long and marks has_more_ancestors as true', async () => {
    const ancestors = createAncestors(6); // 6 ancestors
    (MongoPublicationRepository.findById as any).mockResolvedValue(samplePub);
    (MongoPublicationRepository.findAncestors as any).mockResolvedValue(ancestors);
    (MongoPublicationRepository.findReplies as any).mockResolvedValue([]);

    const result = await QueryPublicationService.getById('pub-leaf', undefined, 4);

    expect(result.publication.id).toBe('pub-leaf');
    expect(result.total_ancestors).toBe(6);
    expect(result.has_more_ancestors).toBe(true);
    expect(result.ancestors.length).toBe(4);
    // Closest ancestors immediately preceding the leaf post
    expect(result.ancestors.map((a) => a.id)).toEqual(['pub-2', 'pub-3', 'pub-4', 'pub-5']);
  });

  it('returns all ancestors when thread count is within limit', async () => {
    const ancestors = createAncestors(2); // 2 ancestors
    (MongoPublicationRepository.findById as any).mockResolvedValue(samplePub);
    (MongoPublicationRepository.findAncestors as any).mockResolvedValue(ancestors);
    (MongoPublicationRepository.findReplies as any).mockResolvedValue([]);

    const result = await QueryPublicationService.getById('pub-leaf', undefined, 4);

    expect(result.total_ancestors).toBe(2);
    expect(result.has_more_ancestors).toBe(false);
    expect(result.ancestors.length).toBe(2);
    expect(result.ancestors.map((a) => a.id)).toEqual(['pub-0', 'pub-1']);
  });

  it('paginates earlier ancestors backwards from before_id', async () => {
    const ancestors = createAncestors(6); // pub-0, pub-1, pub-2, pub-3, pub-4, pub-5
    (MongoPublicationRepository.findById as any).mockResolvedValue(samplePub);
    (MongoPublicationRepository.findAncestors as any).mockResolvedValue(ancestors);

    // Request earlier ancestors before pub-2 with limit 2
    const result = await QueryPublicationService.getAncestors('pub-leaf', undefined, 'pub-2', 2);

    expect(result.ancestors.map((a) => a.id)).toEqual(['pub-0', 'pub-1']);
    expect(result.has_more).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

