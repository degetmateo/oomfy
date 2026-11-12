import { describe, it, expect } from 'vitest';
import { PublicationMapper } from '../src/infrastructure/repositories/mongo/PublicationMapper.js';
import { MongoMemberMapper } from '../src/infrastructure/repositories/mongo/MongoMemberMapper.js';

describe('Non-Negative Counters Guard (Backend)', () => {
  it('PublicationMapper.toDomain should strictly clamp negative values to 0', () => {
    const rawDoc = {
      _id: 'test-pub-1',
      author: { id: 'user-1', username: 'testuser', name: 'Tester' },
      content: 'Hello world',
      upvote_count: -1,
      share_count: -5,
      quote_count: -2,
      comment_count: -10,
    };
    const domain = PublicationMapper.toDomain(rawDoc);
    expect(domain.upvotes_count).toBe(0);
    expect(domain.shares_count).toBe(0);
    expect(domain.quotes_count).toBe(0);
    expect(domain.comments_count).toBe(0);
  });

  it('PublicationMapper.toPersistence should strictly clamp negative values to 0', () => {
    const pub: any = {
      id: 'test-pub-2',
      author: { id: 'user-2', username: 'testuser2', name: 'Tester 2' },
      content: 'Persistence test',
      upvotes_count: -1,
      shares_count: -1,
      quotes_count: -1,
      comments_count: -1,
    };
    const persisted = PublicationMapper.toPersistence(pub);
    expect(persisted.upvote_count).toBe(0);
    expect(persisted.share_count).toBe(0);
    expect(persisted.quote_count).toBe(0);
    expect(persisted.comment_count).toBe(0);
  });

  it('MongoMemberMapper.toDomain should strictly clamp negative counts to 0', () => {
    const rawMember = {
      _id: 'member-1',
      username: 'memberone',
      name: 'Member One',
      follower_count: -3,
      followed_count: -2,
      publication_count: -1,
    };
    const domain = MongoMemberMapper.toDomain(rawMember);
    expect(domain.follower_count).toBe(0);
    expect(domain.followed_count).toBe(0);
    expect(domain.publication_count).toBe(0);
  });
});

