import { SystemSettings } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

export class MongoSystemSettingsRepository {
  private static readonly DOC_ID = 'global_settings';

  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('system_settings');
  }

  public static async getSettings(): Promise<SystemSettings> {
    const col = this.getCollection();
    const doc = await col.findOne({ _id: this.DOC_ID as any });
    return {
      disable_post_creation: Boolean(doc?.disable_post_creation),
      disable_profile_editing: Boolean(doc?.disable_profile_editing),
      disable_signups: Boolean(doc?.disable_signups),
    };
  }

  public static async updateSettings(partial: Partial<SystemSettings>): Promise<SystemSettings> {
    const col = this.getCollection();
    await col.updateOne(
      { _id: this.DOC_ID as any },
      {
        $set: {
          ...partial,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );
    return this.getSettings();
  }
}

