import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { useUserModel } from './useUserModel.js';
import { ProfileController } from '../controllers/ProfileController.js';

export function useFollowMutation(user: PublicUser) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [isLoading, setIsLoading] = useState(false);

  const key = user.username.toLowerCase();
  const modelUser = useUserModel(user);
  const { seedUser } = useEntityRegistryStore();

  useEffect(() => { seedUser(user); }, [user.username, seedUser]);
  const isFollowing = Boolean(modelUser?.is_following ?? user.is_following);

  const syncQueryLists = (nextFollowing: boolean, deltaFollowers: number) => {
    queryClient.setQueryData(['profile', user.username], (old: any) =>
      old?.data ? { ...old, data: { ...old.data, is_following: nextFollowing, follower_count: Math.max(0, (old.data.follower_count || 0) + deltaFollowers) } } : old
    );
    ['suggested-members', 'user-follows'].forEach((prefix) => {
      queryClient.setQueriesData({ queryKey: [prefix] }, (old: any) => {
        const mapList = (list: any[]) => list.map((m) => (m?.username?.toLowerCase() === key ? { ...m, is_following: nextFollowing } : m));
        if (old?.pages) return { ...old, pages: old.pages.map((p: any) => ({ ...p, data: Array.isArray(p.data) ? mapList(p.data) : p.data })) };
        if (Array.isArray(old?.data)) return { ...old, data: mapList(old.data) };
        return old;
      });
    });
  };

  const toggleFollow = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAuthenticated) { navigate('/signin'); return; }
    if (isLoading) return;
    if (!userIdentityMap.get(user.username)) userIdentityMap.seed(user);
    const prev = isFollowing;
    const delta = prev ? -1 : 1;
    setIsLoading(true);
    syncQueryLists(!prev, delta);
    try {
      await ProfileController.toggleFollow(user, prev);
    } catch (err: any) {
      syncQueryLists(prev, -delta);
      dialog.alert(err.message || 'Error al actualizar seguimiento', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return { isFollowing, isLoadingFollow: isLoading, toggleFollow };
}
