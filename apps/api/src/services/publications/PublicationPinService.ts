import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { NotFoundError } from '../../errors/AppError.js';

export class PublicationPinService {
  public static async pinPublication(userId: string, publicationId: string): Promise<{ success: boolean; pinned_publication_id: string }> {
    const pub = await MongoPublicationRepository.findById(publicationId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    await MongoMemberRepository.setPinnedPublication(userId, pub.id);
    return { success: true, pinned_publication_id: pub.id };
  }

  public static async unpinPublication(userId: string): Promise<{ success: boolean; pinned_publication_id: null }> {
    await MongoMemberRepository.setPinnedPublication(userId, null);
    return { success: true, pinned_publication_id: null };
  }
}

