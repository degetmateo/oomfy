import { ProfileMediaService } from '../users/ProfileMediaService.js';

export class NotificationIconHelper {
  public static readonly DEFAULT_APP_ICON = '/assets/oomfy-logo-black-bg.png';

  public static async resolveSenderIcon(sender?: {
    id?: string;
    username?: string;
    icon_url?: string | null;
  } | null): Promise<string> {
    if (!sender) return this.DEFAULT_APP_ICON;

    const raw = typeof sender.icon_url === 'string' ? sender.icon_url.trim() : '';
    if (raw && /^(https?:\/\/|data:)/i.test(raw)) {
      return raw;
    }

    const identifier = sender.username?.trim() || sender.id?.trim();
    if (identifier) {
      try {
        const live = await ProfileMediaService.getUserIcon(identifier);
        if (live && /^(https?:\/\/|data:)/i.test(live.trim())) {
          return live.trim();
        }
      } catch {}
    }

    return this.DEFAULT_APP_ICON;
  }
}
