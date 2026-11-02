import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { PublicationCacheService } from './PublicationCacheService.js';
import { Publication } from '@oomfy/shared';

describe('PublicationCacheService', () => {
  const samplePost: Publication = {
    id: 'post-test-123',
    author: {
      id: 'author-1',
      username: 'sam',
      name: 'Sam',
      role: 'member',
      icon_url: null,
      banner_url: null,
    },
    type: 'default',
    content: 'Cached feed content',
    created_at: new Date().toISOString(),
    parent_publication_id: null,
    root_publication_id: null,
    thread_ids: [],
    images: [],
    embeds: [],
    upvotes_count: 5,
    shares_count: 2,
    quotes_count: 1,
    comments_count: 0,
    is_upvoted: false,
    is_shared: false,
    target_publication: null,
  };

  it('finds publication in feed infinite query cache', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['feed'], {
      pages: [{ data: [samplePost] }],
    });

    const found = PublicationCacheService.findInCache(queryClient, 'post-test-123');
    expect(found).toBeDefined();
    expect(found?.content).toBe('Cached feed content');
  });

  it('generates initial detail structure without loading delay', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['feed'], {
      pages: [{ data: [samplePost] }],
    });

    const initial = PublicationCacheService.getInitialDetailData(queryClient, 'post-test-123');
    expect(initial).toBeDefined();
    expect(initial?.publication.id).toBe('post-test-123');
    expect(initial?.replies).toEqual([]);
  });

  it('returns undefined when publication is not in cache', () => {
    const queryClient = new QueryClient();
    const found = PublicationCacheService.findInCache(queryClient, 'non-existent-id');
    expect(found).toBeUndefined();
  });

  it('primes publication preview on navigation click without polluting query cache', () => {
    const queryClient = new QueryClient();
    PublicationCacheService.primePublication(queryClient, samplePost);

    const placeholder = PublicationCacheService.getPlaceholderDetailData(queryClient, 'post-test-123');
    expect(placeholder).toBeDefined();
    expect(placeholder?.publication.id).toBe('post-test-123');
    expect(placeholder?.replies).toEqual([]);

    // Query cache itself remains unpolluted so real queryFn runs automatically on mount
    const cachedQuery = queryClient.getQueryData<any>(['publication', 'post-test-123']);
    expect(cachedQuery).toBeUndefined();
  });
});
