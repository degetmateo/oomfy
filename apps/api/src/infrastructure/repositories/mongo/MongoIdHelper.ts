import { ObjectId, UUID } from 'mongodb';

export class MongoIdHelper {
  public static toMongoId(id: string | null | undefined): any {
    if (!id) return id;
    if (ObjectId.isValid(id) && id.length === 24) {
      try {
        return new ObjectId(id);
      } catch {
        // fall through
      }
    }
    try {
      return new UUID(id);
    } catch {
      return id;
    }
  }

  public static idFilter(id: string): any {
    const conditions: any[] = [{ _id: id }, { id }];

    if (ObjectId.isValid(id) && id.length === 24) {
      try {
        conditions.push({ _id: new ObjectId(id) });
      } catch {}
    }

    try {
      conditions.push({ _id: new UUID(id) });
    } catch {}

    const num = Number(id);
    if (!isNaN(num) && num > 0) {
      conditions.push({ old_id: num });
    }

    return { $or: conditions };
  }
}
