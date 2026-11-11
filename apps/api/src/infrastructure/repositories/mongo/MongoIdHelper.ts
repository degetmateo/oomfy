import { ObjectId, UUID } from 'mongodb';

export class MongoIdHelper {
  public static toMongoId(id: any): any {
    if (!id) return id;
    if (id instanceof UUID || (id && id._bsontype === 'Binary')) return id;
    if (id instanceof ObjectId) return id;
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

  public static escapeRegex(value: string): string {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public static idVariants(id: any): any[] {
    if (!id) return [];
    const str = String(id);
    const list: any[] = [str];
    const mongoId = this.toMongoId(str);
    if (mongoId && mongoId !== str) list.push(mongoId);
    return list;
  }

  public static idFilter(id: any): any {
    if (!id) return { _id: id };
    const strId = String(id);
    const conditions: any[] = [{ _id: strId }, { id: strId }];
    if (ObjectId.isValid(strId) && strId.length === 24) {
      try {
        conditions.push({ _id: new ObjectId(strId) });
      } catch {}
    }
    try {
      const uuidObj = new UUID(strId);
      conditions.push({ _id: uuidObj });
      conditions.push({ id: uuidObj });
    } catch {}
    const num = Number(strId);
    if (!isNaN(num) && num > 0) {
      conditions.push({ old_id: num });
    }
    return { $or: conditions };
  }

  public static fieldFilter(fieldName: string, id: any): any {
    if (!id) return { [fieldName]: id };
    const variants = this.idVariants(id);
    if (variants.length === 1) return { [fieldName]: variants[0] };
    return { [fieldName]: { $in: variants } };
  }
}
