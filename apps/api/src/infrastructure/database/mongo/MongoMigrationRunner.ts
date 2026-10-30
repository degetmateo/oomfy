import { Db, Collection, IndexSpecification, CreateIndexesOptions } from 'mongodb';
import { MongoDatabase } from './MongoDatabase.js';

export class MongoMigrationRunner {
  private static async safeCreateIndex(
    col: Collection,
    spec: IndexSpecification,
    options?: CreateIndexesOptions
  ): Promise<void> {
    try {
      await col.createIndex(spec, options);
    } catch (err: any) {
      if (err.code === 85 || err.code === 86) {
        console.warn(`ℹ️ Índice en [${col.collectionName}] ya existente con especificaciones previas.`);
      } else {
        throw err;
      }
    }
  }

  public static async run(): Promise<void> {
    const db: Db = await MongoDatabase.connect();
    console.log('🟨 Asegurando colecciones e índices en MongoDB...');

    // 1. Colección publications
    const publications = db.collection('publications');
    await this.safeCreateIndex(publications, { created_at: -1 });
    await this.safeCreateIndex(publications, { 'author.username': 1 });
    await this.safeCreateIndex(publications, { parent_publication_id: 1 });
    await this.safeCreateIndex(publications, { root_publication_id: 1 });
    await this.safeCreateIndex(publications, { type: 1 });

    // 2. Colección members
    const members = db.collection('members');
    await this.safeCreateIndex(members, { username: 1 });
    await this.safeCreateIndex(members, { created_at: -1 });

    // 3. Colección follows
    const follows = db.collection('follows');
    await this.safeCreateIndex(follows, { follower_id: 1, followed_id: 1 });
    await this.safeCreateIndex(follows, { 'follower.username': 1 });
    await this.safeCreateIndex(follows, { 'followed.username': 1 });

    // 4. Colección notifications
    const notifications = db.collection('notifications');
    await this.safeCreateIndex(notifications, { recipient_id: 1, created_at: -1 });
    await this.safeCreateIndex(notifications, { recipient_id: 1, status: 1 });

    // 5. Normalización de fechas de publicaciones (conversión segura de strings a BSON Date)
    const stringDocs = await publications.find({ created_at: { $type: 'string' } }).toArray();
    if (stringDocs.length > 0) {
      console.log(`🟨 Normalizando ${stringDocs.length} fechas string en publicaciones...`);
      for (const doc of stringDocs) {
        const d = new Date(doc.created_at);
        if (!isNaN(d.getTime())) {
          await publications.updateOne({ _id: doc._id }, { $set: { created_at: d } });
        }
      }
      console.log(`🟩 ${stringDocs.length} fechas normalizadas a BSON Date.`);
    }

    console.log('🟩 Índices y colecciones de MongoDB asegurados con éxito.');
  }
}
