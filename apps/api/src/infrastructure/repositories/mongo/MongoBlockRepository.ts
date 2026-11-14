import { v7 as uuidv7 } from 'uuid';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoBlockRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('blocks');
  }

  public static async block(blockerId: string, blockedId: string): Promise<void> {
    const col = this.getCollection();
    const blockerVariants = MongoIdHelper.idVariants(blockerId);
    const blockedVariants = MongoIdHelper.idVariants(blockedId);
    const idVal = uuidv7();
    await col.updateOne(
      { blocker_id: { $in: blockerVariants }, blocked_id: { $in: blockedVariants } },
      {
        $setOnInsert: {
          _id: MongoIdHelper.toMongoId(idVal),
          id: idVal,
          blocker_id: MongoIdHelper.toMongoId(blockerId),
          blocked_id: MongoIdHelper.toMongoId(blockedId),
          created_at: new Date(),
        },
      },
      { upsert: true }
    );
  }

  public static async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const res = await this.getCollection().deleteMany({
      blocker_id: { $in: MongoIdHelper.idVariants(blockerId) },
      blocked_id: { $in: MongoIdHelper.idVariants(blockedId) },
    });
    return (res.deletedCount ?? 0) > 0;
  }

  public static async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const doc = await this.getCollection().findOne(
      { blocker_id: { $in: MongoIdHelper.idVariants(blockerId) }, blocked_id: { $in: MongoIdHelper.idVariants(blockedId) } },
      { projection: { _id: 1 } }
    );
    return Boolean(doc);
  }

  public static async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    if (!userA || !userB || userA === userB) return false;
    const aVariants = MongoIdHelper.idVariants(userA);
    const bVariants = MongoIdHelper.idVariants(userB);
    const doc = await this.getCollection().findOne(
      {
        $or: [
          { blocker_id: { $in: aVariants }, blocked_id: { $in: bVariants } },
          { blocker_id: { $in: bVariants }, blocked_id: { $in: aVariants } },
        ],
      },
      { projection: { _id: 1 } }
    );
    return Boolean(doc);
  }

  public static async getBlockStatus(viewerId: string, targetId: string): Promise<{ isBlocked: boolean; hasBlockedViewer: boolean }> {
    const [isBlocked, hasBlockedViewer] = await Promise.all([
      this.isBlocked(viewerId, targetId),
      this.isBlocked(targetId, viewerId),
    ]);
    return { isBlocked, hasBlockedViewer };
  }
}
