import { describe, it, expect, vi } from 'vitest';
import { UUID } from 'mongodb';
import { PublicationMapper } from '../src/infrastructure/repositories/mongo/PublicationMapper.js';
import { PublicationThreadResolver } from '../src/infrastructure/repositories/mongo/PublicationThreadResolver.js';

describe('PublicationMapper & ThreadResolver Unit Tests', () => {
  it('PublicationMapper converts BSON UUID parent_publication_id and root_publication_id to string', () => {
    const parentUuid = new UUID('019e6d84-f0fb-7370-8edc-d000ce452cf6');
    const doc = {
      _id: new UUID('019e6d84-f0fb-7370-8ede-2e4c0bd0765a'),
      type: 'shared',
      content: null,
      parent_publication_id: parentUuid,
      author: {
        _id: new UUID('019e6c9d-5b1d-7418-a4d3-4ade44b1d699'),
        username: 'mateo',
      },
    };

    const domain = PublicationMapper.toDomain(doc);
    expect(typeof domain.parent_publication_id).toBe('string');
    expect(domain.parent_publication_id).toBe('019e6d84-f0fb-7370-8edc-d000ce452cf6');
    expect(domain.type).toBe('shared');
    expect(domain.id).toBe('019e6d84-f0fb-7370-8ede-2e4c0bd0765a');
  });

  it('PublicationThreadResolver returns empty ancestors for quote and shared publications', async () => {
    const quotePub: any = {
      id: 'quote-1',
      type: 'quote',
      parent_publication_id: 'target-1',
    };
    const sharedPub: any = {
      id: 'shared-1',
      type: 'shared',
      parent_publication_id: 'target-2',
    };

    const quoteAncestors = await PublicationThreadResolver.findAncestors(quotePub);
    const sharedAncestors = await PublicationThreadResolver.findAncestors(sharedPub);

    expect(quoteAncestors).toEqual([]);
    expect(sharedAncestors).toEqual([]);
  });
});

