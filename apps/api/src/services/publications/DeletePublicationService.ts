import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export class DeletePublicationService {
  public static async execute(pubId: string, user: { id: string; role: string }): Promise<{ message: string }> {
    const rawDoc = await MongoDatabase.getDb().collection('publications').findOne(MongoIdHelper.idFilter(pubId));
    if (!rawDoc) throw new NotFoundError('Publicación no encontrada.');

    const authorId = rawDoc.author?._id?.toString() || rawDoc.author?.id?.toString() || '';
    const isOwner = authorId === user.id;
    const isStaff = user.role === 'admin' || user.role === 'mod';

    if (!isOwner && !isStaff) {
      throw new ForbiddenError('No tienes permisos para eliminar esta publicación.');
    }

    const parentId = rawDoc.parent_publication_id?.toString() || rawDoc.target_publication_id?.toString();
    if (parentId) {
      if (rawDoc.type === 'reply') await MongoPublicationRepository.incrementCounters(parentId, { comments_count: -1 });
      else if (rawDoc.type === 'quote') await MongoPublicationRepository.incrementCounters(parentId, { quotes_count: -1 });
      else if (rawDoc.type === 'shared') await MongoPublicationRepository.incrementCounters(parentId, { shares_count: -1 });
    }

    await MongoPublicationRepository.deleteById(pubId);
    if (authorId) await MongoMemberRepository.incrementCounters(authorId, { publication_count: -1 });

    await MongoDatabase.getDb().collection('upvotes').deleteMany({
      publication_id: { $in: MongoIdHelper.idVariants(pubId) },
    });

    for (const img of rawDoc.images || []) {
      if (img?.delete_url) ImgBBStorageAdapter.delete(img.delete_url).catch(() => {});
    }

    return { message: 'Publicación eliminada con éxito.' };
  }
}
