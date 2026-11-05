import { UUID } from 'mongodb';

export class UuidFieldConverter {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  public static isBsonUuid(val: any): boolean {
    if (!val) return false;
    return (
      val instanceof UUID ||
      val?.constructor?.name === 'UUID' ||
      (val?._bsontype === 'Binary' && val?.sub_type === 4)
    );
  }

  public static isUuidString(val: any): boolean {
    return typeof val === 'string' && this.UUID_REGEX.test(val);
  }

  public static toBsonUuid(val: any): any {
    if (!val) return val;
    if (this.isBsonUuid(val)) return val;
    if (this.isUuidString(val)) {
      try {
        return new UUID(val);
      } catch {
        return val;
      }
    }
    return val;
  }

  public static convertDeep(obj: any, keyName?: string): any {
    if (!obj) return obj;
    if (this.isBsonUuid(obj)) {
      if (keyName === 'id') return obj.toString();
      return obj;
    }
    if (keyName === 'id') return obj;
    if (this.isUuidString(obj)) {
      try {
        return new UUID(obj);
      } catch {
        return obj;
      }
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertDeep(item));
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        res[k] = this.convertDeep(v, k);
      }
      return res;
    }
    return obj;
  }

  public static hasChanged(a: any, b: any): boolean {
    if (a === b) return false;
    if (a instanceof UUID || a?._bsontype === 'Binary') {
      if (!(b instanceof UUID || b?._bsontype === 'Binary')) return true;
      return a.toString() !== b.toString();
    }
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return true;
      return a.some((item, idx) => this.hasChanged(item, b[idx]));
    }
    if (typeof a === 'object' && a !== null) {
      if (typeof b !== 'object' || b === null) return true;
      const keysA = Object.keys(a);
      return keysA.some((k) => this.hasChanged(a[k], b[k]));
    }
    return a !== b;
  }
}
