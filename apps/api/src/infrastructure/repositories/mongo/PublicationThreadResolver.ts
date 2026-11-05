import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';

export class PublicationThreadResolver {
  public static async findAncestors(
    publication: Publication,
    userId?: string,
    maxLevels: number = 20
  ): Promise<Publication[]> {
    if (publication.type !== 'reply') {
      return [];
    }

    const col = MongoDatabase.getDb().collection<any>('publications');
    const ancestors: Publication[] = [];

    if (publication.thread_ids && publication.thread_ids.length > 0) {
      const threadFilters = publication.thread_ids.flatMap((id) => MongoIdHelper.idFilter(id).$or);
      const docs = await col.find({ $or: threadFilters }).sort({ created_at: 1 }).toArray();
      const domainList = docs.map(PublicationMapper.toDomain);
      const populated = await PublicationTargetPopulator.populate(domainList);
      return PublicationInteractionDecorator.decorate(populated, userId);
    }

    let currentParentId = publication.parent_publication_id;
    while (currentParentId && ancestors.length < maxLevels) {
      const parentDoc = await col.findOne(MongoIdHelper.idFilter(currentParentId));
      if (!parentDoc) break;
      const domain = PublicationMapper.toDomain(parentDoc);
      ancestors.unshift(domain);
      if (domain.type !== 'reply') {
        break;
      }
      currentParentId = domain.parent_publication_id;
    }

    const populated = await PublicationTargetPopulator.populate(ancestors);
    return PublicationInteractionDecorator.decorate(populated, userId);
  }
}

