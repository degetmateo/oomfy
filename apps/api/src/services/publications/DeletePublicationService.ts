import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export class DeletePublicationService {
  public static async execute(
    publicationId: string,
    user: { id: string; role: string }
  ): Promise<{ message: string }> {
    const publication = await MongoPublicationRepository.findById(publicationId);
    if (!publication) {
      throw new NotFoundError('Publicación no encontrada.');
    }

    const isAuthor = publication.author.id === user.id;
    const isModerator = ['admin', 'mod'].includes(user.role);

    if (!isAuthor && !isModerator) {
      throw new ForbiddenError('No tienes permisos para eliminar esta publicación.');
    }

    await MongoPublicationRepository.deleteById(publicationId);
    await MongoMemberRepository.incrementCounters(publication.author.id, { publication_count: -1 });

    if (publication.parent_publication_id) {
      await MongoPublicationRepository.incrementCounters(publication.parent_publication_id, { comments_count: -1 });
    }

    return { message: 'Publicación eliminada correctamente.' };
  }
}

