import { PublicUser } from '@oomfy/shared';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class BlockService {
  private static async resolveTargetUser(param: string): Promise<PublicUser> {
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(param) || /^\d+$/.test(param);
    const user = isId ? await MongoMemberRepository.findById(param) : await MongoMemberRepository.findByUsername(param);
    if (!user) throw new NotFoundError('Usuario no encontrado.');
    return user;
  }

  public static async blockUser(blockerId: string, targetParam: string): Promise<{ blocked: boolean; message: string }> {
    const target = await this.resolveTargetUser(targetParam);
    if (blockerId === target.id) throw new BadRequestError('No puedes bloquearte a ti mismo.');

    await MongoBlockRepository.block(blockerId, target.id);

    const [targetWasFollowing, blockerWasFollowing] = await Promise.all([
      MongoFollowRepository.unfollow(target.id, blockerId),
      MongoFollowRepository.unfollow(blockerId, target.id),
    ]);

    const counterUpdates: Promise<any>[] = [];
    if (targetWasFollowing) {
      counterUpdates.push(
        MongoMemberRepository.incrementCounters(target.id, { followed_count: -1 }),
        MongoMemberRepository.incrementCounters(blockerId, { follower_count: -1 })
      );
    }
    if (blockerWasFollowing) {
      counterUpdates.push(
        MongoMemberRepository.incrementCounters(blockerId, { followed_count: -1 }),
        MongoMemberRepository.incrementCounters(target.id, { follower_count: -1 })
      );
    }
    if (counterUpdates.length > 0) await Promise.all(counterUpdates);

    return { blocked: true, message: `Has bloqueado a @${target.username}.` };
  }

  public static async unblockUser(blockerId: string, targetParam: string): Promise<{ blocked: boolean; message: string }> {
    const target = await this.resolveTargetUser(targetParam);
    await MongoBlockRepository.unblock(blockerId, target.id);
    return { blocked: false, message: `Has desbloqueado a @${target.username}.` };
  }
}
