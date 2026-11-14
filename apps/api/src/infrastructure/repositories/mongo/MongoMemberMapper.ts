import { PublicUser } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoMemberMapper {
  public static toDomain(doc: any): PublicUser {
    return {
      id: doc._id ? doc._id.toString() : doc.id,
      username: doc.username,
      name: doc.name || doc.username,
      role: doc.role || 'member',
      bio: doc.bio || null,
      location: doc.location || null,
      link: doc.link || null,
      icon_url: doc.icon?.url || doc.icon_url || null,
      banner_url: doc.banner?.url || doc.banner_url || null,
      created_at: doc.created_at || new Date().toISOString(),
      follower_count: Math.max(0, doc.follower_count || 0),
      followed_count: Math.max(0, doc.followed_count || 0),
      publication_count: Math.max(0, doc.publication_count || 0),
      terms_accepted: doc.terms_accepted === true,
      terms_accepted_at: doc.terms_accepted_at || null,
      pinned_publication_id: doc.pinned_publication_id ? String(doc.pinned_publication_id) : null,
      pinned_publication: null,
    };
  }

  public static buildUpsertOps(user: Partial<PublicUser> & { id: string; username: string }) {
    const setFields: Record<string, any> = {
      _id: MongoIdHelper.toMongoId(user.id),
      id: user.id,
      username: user.username,
    };
    for (const key of ['name', 'role', 'bio', 'location', 'link', 'created_at', 'terms_accepted', 'terms_accepted_at', 'pinned_publication_id'] as const) {
      if (user[key] !== undefined) setFields[key] = user[key];
    }
    if (user.icon_url !== undefined) {
      setFields.icon_url = user.icon_url;
      setFields.icon = user.icon_url ? { url: user.icon_url } : null;
    }
    if (user.banner_url !== undefined) {
      setFields.banner_url = user.banner_url;
      setFields.banner = user.banner_url ? { url: user.banner_url } : null;
    }

    const onInsertFields: Record<string, any> = { follower_count: 0, followed_count: 0, publication_count: 0 };
    if (setFields.name === undefined) onInsertFields.name = user.name || user.username;
    if (setFields.role === undefined) onInsertFields.role = user.role || 'member';
    if (setFields.created_at === undefined) onInsertFields.created_at = new Date().toISOString();
    if (setFields.terms_accepted === undefined) onInsertFields.terms_accepted = false;

    return { $set: setFields, $setOnInsert: onInsertFields };
  }
}
