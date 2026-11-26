import { QueryClient } from '@tanstack/react-query';
import { LIMITS, PublicUser, normalizeProfileLink } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { useAuthStore } from '../stores/authStore.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';

export interface ProfileEditDraft {
  name: string;
  pronouns: string;
  bio: string;
  location: string;
  link: string;
  bannerPreview: string | null;
  iconPreview: string | null;
  bannerFile: File | null;
  iconFile: File | null;
  bannerAction: 'none' | 'update' | 'delete';
  iconAction: 'none' | 'update' | 'delete';
}

export class ProfileController {
  public static createDraft(user: PublicUser): ProfileEditDraft {
    const model = userIdentityMap.get(user.username) || user;
    return {
      name: model.name || '', pronouns: model.pronouns || '', bio: model.bio || '', location: model.location || '', link: model.link || '',
      bannerPreview: model.banner_url || null, iconPreview: model.icon_url || null,
      bannerFile: null, iconFile: null, bannerAction: 'none', iconAction: 'none',
    };
  }

  private static resolveDraftLink(rawLink: string): string | null {
    const trimmed = rawLink.trim();
    if (!trimmed) return null;
    const normalized = normalizeProfileLink(trimmed);
    if (!normalized) {
      throw new Error('Ingresa un enlace válido (ej. ejemplo.com o https://ejemplo.com).');
    }
    if (normalized.length > LIMITS.LINK_MAX) {
      throw new Error(`El enlace no puede superar los ${LIMITS.LINK_MAX} caracteres.`);
    }
    return normalized;
  }

  public static buildProfileFormData(base: PublicUser, draft: ProfileEditDraft): { formData: FormData; hasChanges: boolean } {
    const formData = new FormData();
    let hasChanges = false;
    const trimmedName = draft.name.trim();
    const trimmedPronouns = draft.pronouns.trim();
    const normalizedLink = this.resolveDraftLink(draft.link);

    if (trimmedName !== (base.name || '')) { formData.append('name', trimmedName); hasChanges = true; }
    if (trimmedPronouns !== (base.pronouns || '')) { formData.append('pronouns', trimmedPronouns); hasChanges = true; }
    if (draft.bio !== (base.bio || '')) { formData.append('bio', draft.bio); hasChanges = true; }
    if (draft.location !== (base.location || '')) { formData.append('location', draft.location); hasChanges = true; }
    if ((normalizedLink || '') !== (base.link || '')) { formData.append('link', normalizedLink || ''); hasChanges = true; }

    formData.append('banner_action', draft.bannerAction);
    formData.append('icon_action', draft.iconAction);
    if (draft.bannerAction === 'update' && draft.bannerFile) { formData.append('banner', draft.bannerFile); hasChanges = true; }
    else if (draft.bannerAction === 'delete') hasChanges = true;
    if (draft.iconAction === 'update' && draft.iconFile) { formData.append('icon', draft.iconFile); hasChanges = true; }
    else if (draft.iconAction === 'delete') hasChanges = true;

    return { formData, hasChanges };
  }

  public static async saveProfileDraft(base: PublicUser, draft: ProfileEditDraft, queryClient?: QueryClient | null): Promise<PublicUser> {
    const modelBase = userIdentityMap.get(base.username) || base;
    const normalizedLink = this.resolveDraftLink(draft.link);
    const { formData, hasChanges } = this.buildProfileFormData(modelBase, draft);
    if (!hasChanges) return modelBase;

    userIdentityMap.patch(modelBase.username, (prev) => ({
      ...prev, name: draft.name.trim() || prev.name, pronouns: draft.pronouns.trim() || null, bio: draft.bio, location: draft.location, link: normalizedLink,
    }));

    try {
      const res = await ApiClient.put<{ success: boolean; data: PublicUser }>('/members/me', formData);
      const updated = res.data;
      userIdentityMap.ingest([updated], Date.now(), true);
      publicationIdentityMap.syncAuthor(updated);
      useAuthStore.getState().setUser(updated);
      if (queryClient) {
        queryClient.setQueriesData({ queryKey: ['profile'] }, (old: any) => (
          old?.data && (old.data.id === updated.id || old.data.username?.toLowerCase() === updated.username?.toLowerCase())
            ? { ...old, data: { ...old.data, ...updated } } : old
        ));
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        PublicationCacheService.invalidatePublicationLists(queryClient);
      }
      return updated;
    } catch (err) {
      userIdentityMap.ingest([modelBase], Date.now(), true);
      throw err;
    }
  }

  public static async toggleFollow(user: PublicUser, isFollowing: boolean): Promise<void> {
    const delta = isFollowing ? -1 : 1;
    userIdentityMap.patch(user.username, (prev) => ({
      ...prev, is_following: !isFollowing, follower_count: Math.max(0, (prev.follower_count || 0) + delta),
    }));
    try {
      if (isFollowing) await ApiClient.delete(`/follows/${user.username}`);
      else await ApiClient.post(`/follows/${user.username}`);
    } catch (err) {
      userIdentityMap.patch(user.username, (prev) => ({
        ...prev, is_following: isFollowing, follower_count: Math.max(0, (prev.follower_count || 0) - delta),
      }));
      throw err;
    }
  }
}
