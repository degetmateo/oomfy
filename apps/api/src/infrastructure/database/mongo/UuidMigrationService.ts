import { UUID } from 'mongodb';
import { MongoDatabase } from './MongoDatabase.js';
import { UuidFieldConverter } from './UuidFieldConverter.js';

export class UuidMigrationService {
  private static readonly TARGET_COLLECTIONS = [
    'upvotes',
    'chats',
    'messages',
    'push_subscriptions',
    'notifications',
    'follows',
    'reports',
    'publications',
    'members',
  ];

  public static async migrateCollection(colName: string): Promise<number> {
    const col = MongoDatabase.getDb().collection(colName);
    const cursor = col.find({});
    let updatedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      let currentDoc = doc;
      if (!UuidFieldConverter.isBsonUuid(doc._id)) {
        const rawId = String(doc.id || doc._id);
        if (UuidFieldConverter.isUuidString(rawId)) {
          try {
            const bsonUuid = new UUID(rawId);
            await col.deleteOne({ _id: doc._id } as any);
            currentDoc = { ...doc, _id: bsonUuid as any, id: rawId };
            await col.insertOne(currentDoc as any);
            updatedCount++;
          } catch {}
        }
      }

      const converted = UuidFieldConverter.convertDeep(currentDoc);
      const changes: Record<string, any> = {};
      for (const [k, v] of Object.entries(converted)) {
        if (k !== '_id' && UuidFieldConverter.hasChanged(v, currentDoc[k])) {
          changes[k] = v;
        }
      }

      if (Object.keys(changes).length > 0) {
        await col.updateOne({ _id: currentDoc._id } as any, { $set: changes });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  public static async migrateAll(): Promise<void> {
    console.log('🟨 Verificando y migrando campos UUID a UUID BSON en todas las colecciones...');
    let totalMigrated = 0;

    for (const colName of this.TARGET_COLLECTIONS) {
      const count = await this.migrateCollection(colName);
      if (count > 0) {
        console.log(`  🟩 Colección [${colName}]: ${count} actualizaciones a UUID BSON.`);
        totalMigrated += count;
      }
    }

    if (totalMigrated > 0) {
      console.log(`🟩 Migración global completada: ${totalMigrated} documentos actualizados a UUID BSON.`);
    } else {
      console.log('🟩 Todas las colecciones ya cuentan con sus campos UUID en formato UUID BSON.');
    }
  }
}
