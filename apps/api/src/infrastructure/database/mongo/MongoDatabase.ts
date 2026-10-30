import { MongoClient, Db } from 'mongodb';
import { Environment } from '../../../config/Environment.js';

export class MongoDatabase {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;

  public static async connect(): Promise<Db> {
    if (!this.db) {
      this.client = new MongoClient(Environment.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(Environment.MONGODB_NAME);
      console.log(`🟩 Conectado a MongoDB: [${Environment.MONGODB_NAME}]`);
    }
    return this.db;
  }

  public static getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB no ha sido inicializado. Llame a MongoDatabase.connect() primero.');
    }
    return this.db;
  }

  public static async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

