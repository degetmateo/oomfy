import { ObjectId, UUID } from 'mongodb';

export class MongoIdHelper {
  public static toMongoId(id: string | null | undefined): any {
    if (!id) return id;
    if (typeof id !== 'string') return id;
    if (ObjectId.isValid(id) && id.length === 24) {
      try {
        return new ObjectId(id);
      } catch {}
    }
    try {
      return new UUID(id);
    } catch {
      return id;
    }
  }

  public static toMongoUuid(id: any): any {
    if (!id) return id;
    if (id instanceof UUID || (id && id._bsontype === 'Binary')) return id;
    if (Array.isArray(id)) return id.map((item) => this.toMongoUuid(item));
    if (typeof id === 'string') {
      try {
        return new UUID(id);
      } catch {
        return id;
      }
    }
    return id;
  }

  public static idVariants(id: string | null | undefined): any[] {
    if (!id) return [];
    const list: any[] = [String(id)];
    const mongoId = this.toMongoId(String(id));
    if (mongoId && mongoId.toString() !== String(id)) list.push(mongoId);
    else if (mongoId && mongoId !== String(id)) list.push(mongoId);
    return list;
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
      conditions.push({ id: new UUID(id) });
    } catch {}
    const num = Number(id);
    if (!isNaN(num) && num > 0) {
      conditions.push({ old_id: num });
    }
    return { $or: conditions };
  }

  public static fieldFilter(fieldName: string, id: string | null | undefined): any {
    if (!id) return { [fieldName]: id };
    const variants = this.idVariants(id);
    if (variants.length === 1) return { [fieldName]: variants[0] };
    return { [fieldName]: { $in: variants } };
  }
}
