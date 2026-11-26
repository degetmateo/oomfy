import { AuthorSnapshot, Notification } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

const MAX_GROUPED_ACTORS_SNAPSHOTS = 8;

function toDomainActor(raw: any): AuthorSnapshot {
  return {
    ...raw,
    id: String(raw?.id || raw?._id || ''),
    username: raw?.username || '',
    name: raw?.name || raw?.username || '',
    role: raw?.role || 'member',
    icon_url: raw?.icon_url ?? null,
    banner_url: raw?.banner_url ?? null,
  };
}

function toPersistenceActor(actor: AuthorSnapshot) {
  const actorUuid = actor?.id ? MongoIdHelper.toMongoId(actor.id) : null;
  return { ...actor, id: actorUuid || actor.id };
}

function mapNotificationDoc(doc: any): Notification {
  const actorIds = Array.isArray(doc.actor_ids) ? doc.actor_ids.map((id: any) => String(id)) : undefined;
  const actors = Array.isArray(doc.actors) ? doc.actors.map(toDomainActor) : undefined;
  const actorsCount = typeof doc.actors_count === 'number'
    ? Math.max(1, doc.actors_count)
    : actorIds?.length
      ? actorIds.length
      : undefined;

  return {
    ...doc,
    id: String(doc.id || doc._id),
    recipient_id: String(doc.recipient_id),
    target_publication_id: doc.target_publication_id ? String(doc.target_publication_id) : null,
    sender: doc.sender ? toDomainActor(doc.sender) : doc.sender,
    ...(actors ? { actors } : {}),
    ...(actorIds ? { actor_ids: actorIds } : {}),
    ...(actorsCount !== undefined ? { actors_count: actorsCount } : {}),
  };
}

function collectOrderedUniqueActors(docs: any[], excludeIds: Set<string> = new Set()): {
  actorIds: string[];
  actors: AuthorSnapshot[];
} {
  const seenIds = new Set<string>();
  const actorIds: string[] = [];
  const actorMap = new Map<string, AuthorSnapshot>();

  const addActor = (idRaw: unknown, snapshot?: any) => {
    const idStr = idRaw ? String(idRaw) : '';
    if (!idStr) return;
    const key = idStr.toLowerCase();
    if (excludeIds.has(key)) return;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      actorIds.push(idStr);
    }
    if (snapshot && !actorMap.has(key)) {
      actorMap.set(key, toDomainActor({ ...snapshot, id: idStr }));
    }
  };

  for (const doc of docs) {
    if (doc.sender) addActor(doc.sender.id || doc.sender._id, doc.sender);
    if (Array.isArray(doc.actors)) {
      for (const actor of doc.actors) addActor(actor?.id || actor?._id, actor);
    }
    if (Array.isArray(doc.actor_ids)) {
      for (const id of doc.actor_ids) addActor(id);
    }
  }

  const actors = actorIds
    .map((id) => actorMap.get(id.toLowerCase()))
    .filter((a): a is AuthorSnapshot => Boolean(a))
    .slice(0, MAX_GROUPED_ACTORS_SNAPSHOTS);

  return { actorIds, actors };
}

export class MongoNotificationRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<Notification>('notifications');
  }

  public static async create(notification: Notification): Promise<void> {
    const col = this.getCollection();
    const notifUuid = MongoIdHelper.toMongoId(notification.id);
    const recipientUuid = MongoIdHelper.toMongoId(notification.recipient_id);
    const targetPubUuid = notification.target_publication_id
      ? MongoIdHelper.toMongoId(notification.target_publication_id)
      : null;

    await col.insertOne({
      ...notification,
      _id: notifUuid,
      id: notifUuid,
      recipient_id: recipientUuid,
      target_publication_id: targetPubUuid,
      sender: notification.sender ? toPersistenceActor(notification.sender) : notification.sender,
    } as any);
  }

  public static async upsertGroupedInteraction(
    notification: Notification
  ): Promise<{ notification: Notification; wasAlreadyPending: boolean }> {
    const col = this.getCollection();
    const targetPubId = notification.target_publication_id;
    if (!targetPubId) {
      await this.create(notification);
      return { notification, wasAlreadyPending: false };
    }

    const existingDocs = await col
      .find({
        recipient_id: { $in: MongoIdHelper.idVariants(notification.recipient_id) },
        type: notification.type,
        target_publication_id: { $in: MongoIdHelper.idVariants(targetPubId) },
      } as any)
      .sort({ created_at: -1 })
      .toArray();

    const senderId = String(notification.sender.id);
    const senderDomain = toDomainActor(notification.sender);

    if (existingDocs.length === 0) {
      const grouped: Notification = {
        ...notification,
        sender: senderDomain,
        actors: [senderDomain],
        actor_ids: [senderId],
        actors_count: 1,
      };
      const notifUuid = MongoIdHelper.toMongoId(grouped.id);
      await col.insertOne({
        ...grouped,
        _id: notifUuid,
        id: notifUuid,
        recipient_id: MongoIdHelper.toMongoId(grouped.recipient_id),
        target_publication_id: MongoIdHelper.toMongoId(targetPubId),
        sender: toPersistenceActor(senderDomain),
        actors: [toPersistenceActor(senderDomain)],
        actor_ids: [MongoIdHelper.toMongoId(senderId)],
        actors_count: 1,
      } as any);
      return { notification: grouped, wasAlreadyPending: false };
    }

    const primaryDoc: any = existingDocs[0];
    const wasAlreadyPending = primaryDoc.status === 'pending';
    const { actorIds: priorIds, actors: priorActors } = collectOrderedUniqueActors(
      existingDocs,
      new Set([senderId.toLowerCase()])
    );

    const mergedActorIds = [senderId, ...priorIds];
    const mergedActors = [
      senderDomain,
      ...priorActors.filter((a) => a.id.toLowerCase() !== senderId.toLowerCase()),
    ].slice(0, MAX_GROUPED_ACTORS_SNAPSHOTS);

    await col.updateOne(
      { _id: primaryDoc._id } as any,
      {
        $set: {
          sender: toPersistenceActor(senderDomain),
          actors: mergedActors.map(toPersistenceActor),
          actor_ids: mergedActorIds.map((id) => MongoIdHelper.toMongoId(id)),
          actors_count: mergedActorIds.length,
          status: 'pending',
          created_at: notification.created_at,
        },
      }
    );

    const duplicateIds = existingDocs.slice(1).map((d: any) => d._id).filter(Boolean);
    if (duplicateIds.length > 0) {
      await col.deleteMany({ _id: { $in: duplicateIds } } as any);
    }

    const updated = mapNotificationDoc({
      ...primaryDoc,
      sender: senderDomain,
      actors: mergedActors,
      actor_ids: mergedActorIds,
      actors_count: mergedActorIds.length,
      status: 'pending',
      created_at: notification.created_at,
    });
    return { notification: updated, wasAlreadyPending };
  }

  public static async removeActorFromGroup(
    recipientId: string,
    type: 'upvote' | 'share',
    targetPublicationId: string,
    actorId: string
  ): Promise<void> {
    const col = this.getCollection();
    const docs = await col
      .find({
        recipient_id: { $in: MongoIdHelper.idVariants(recipientId) },
        type,
        target_publication_id: { $in: MongoIdHelper.idVariants(targetPublicationId) },
      } as any)
      .sort({ created_at: -1 })
      .toArray();

    if (docs.length === 0) return;

    const actorLower = String(actorId).toLowerCase();
    const { actorIds: remainingIds, actors: remainingActors } = collectOrderedUniqueActors(
      docs,
      new Set([actorLower])
    );

    if (remainingIds.length === 0) {
      await col.deleteMany({ _id: { $in: docs.map((d: any) => d._id) } } as any);
      return;
    }

    const primaryDoc: any = docs[0];
    const currentSenderId = String(primaryDoc.sender?.id || primaryDoc.sender?._id || '').toLowerCase();
    const nextSender =
      currentSenderId === actorLower || !primaryDoc.sender
        ? (remainingActors[0] || toDomainActor({ id: remainingIds[0], username: primaryDoc.sender?.username || 'usuario' }))
        : toDomainActor(primaryDoc.sender);

    await col.updateOne(
      { _id: primaryDoc._id } as any,
      {
        $set: {
          sender: toPersistenceActor(nextSender),
          actors: remainingActors.map(toPersistenceActor),
          actor_ids: remainingIds.map((id) => MongoIdHelper.toMongoId(id)),
          actors_count: remainingIds.length,
        },
      }
    );

    const duplicateIds = docs.slice(1).map((d: any) => d._id).filter(Boolean);
    if (duplicateIds.length > 0) {
      await col.deleteMany({ _id: { $in: duplicateIds } } as any);
    }
  }

  public static async listByRecipient(recipientId: string, limit: number = 20, olderId?: string | null): Promise<Notification[]> {
    const col = this.getCollection();
    const query: any = { recipient_id: { $in: MongoIdHelper.idVariants(recipientId) } };
    if (olderId) {
      const olderDoc: any = await col.findOne(MongoIdHelper.idFilter(olderId) as any);
      if (!olderDoc || !olderDoc.created_at) return [];
      query.$or = [
        { created_at: { $lt: olderDoc.created_at } },
        { created_at: olderDoc.created_at, _id: { $lt: olderDoc._id } },
      ];
    }
    const docs = await col.find(query).sort({ created_at: -1, _id: -1 }).limit(limit).toArray();
    return docs.map(mapNotificationDoc);
  }

  public static async markAllAsSeen(recipientId: string): Promise<void> {
    const col = this.getCollection();
    await col.updateMany(
      { recipient_id: { $in: MongoIdHelper.idVariants(recipientId) }, status: 'pending' },
      { $set: { status: 'seen' } }
    );
  }

  public static async countPending(recipientId: string): Promise<number> {
    const col = this.getCollection();
    return col.countDocuments({ recipient_id: { $in: MongoIdHelper.idVariants(recipientId) }, status: 'pending' });
  }

  public static async listSince(recipientId: string, sinceDate: Date, limit = 20): Promise<Notification[]> {
    const col = this.getCollection();
    const iso = sinceDate.toISOString();
    const docs = await col
      .find({
        recipient_id: { $in: MongoIdHelper.idVariants(recipientId) },
        $or: [{ created_at: { $gt: iso } }, { created_at: { $gt: sinceDate } }],
      } as any)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    return docs.map(mapNotificationDoc);
  }
}
