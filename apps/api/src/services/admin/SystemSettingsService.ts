import { SystemSettings } from '@oomfy/shared';
import { MongoSystemSettingsRepository } from '../../infrastructure/repositories/mongo/MongoSystemSettingsRepository.js';

export class SystemSettingsService {
  public static async getSettings(): Promise<SystemSettings> {
    return MongoSystemSettingsRepository.getSettings();
  }

  public static async updateSettings(partial: Partial<SystemSettings>): Promise<SystemSettings> {
    return MongoSystemSettingsRepository.updateSettings(partial);
  }
}

