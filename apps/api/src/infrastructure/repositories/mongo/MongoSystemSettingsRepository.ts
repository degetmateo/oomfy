import { SystemSettings } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

const DEFAULT_SETTINGS: SystemSettings = {
  disable_post_creation: false,
  disable_profile_editing: false,
  disable_signups: false,
  disable_signins: false,
};

const ALLOWED_KEYS: Array<keyof SystemSettings> = [
  'disable_post_creation',
  'disable_profile_editing',
  'disable_signups',
  'disable_signins',
];

export class MongoSystemSettingsRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('system_settings');
  }

  public static async getSettings(): Promise<SystemSettings> {
    const doc = await this.getCollection().findOne({ _id: 'global' as any });
    if (!doc) return { ...DEFAULT_SETTINGS };
    return {
      disable_post_creation: Boolean(doc.disable_post_creation),
      disable_profile_editing: Boolean(doc.disable_profile_editing),
      disable_signups: Boolean(doc.disable_signups),
      disable_signins: Boolean(doc.disable_signins),
    };
  }

  public static async updateSettings(partial: Partial<SystemSettings>): Promise<SystemSettings> {
    const sanitized: Partial<SystemSettings> = {};
    for (const key of ALLOWED_KEYS) {
      if (typeof partial[key] === 'boolean') sanitized[key] = partial[key];
    }
    await this.getCollection().updateOne(
      { _id: 'global' as any },
      { $set: { ...sanitized, updated_at: new Date() } },
      { upsert: true }
    );
    return this.getSettings();
  }
}
