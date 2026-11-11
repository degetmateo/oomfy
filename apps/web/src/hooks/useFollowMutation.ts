import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

export function useFollowMutation(user: PublicUser) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [isLoading, setIsLoading] = useState(false);

  const key = user.username.toLowerCase();
  const liveUser = useEntityRegistryStore((s) => s.usersByUsername[key]);
  const { seedUser, patchUser } = useEntityRegistryStore();

  useEffect(() => {
    seedUser(user);
  }, [user.username, seedUser]);

  const isFollowing = Boolean(liveUser?.is_following ?? user.is_following);

  const syncUserCaches = (nextFollowing: boolean, deltaFollowers: number) => {
    patchUser(user.username, (prev) => ({
      ...prev,
      is_following: nextFollowing,
      follower_count: Math.max(0, (prev.follower_count || 0) + deltaFollowers),
    }));
    queryClient.setQueryData(['profile', user.username], (old: any) =>
      old?.data
        ? { ...old, data: { ...old.data, is_following: nextFollowing, follower_count: Math.max(0, (old.data.follower_count || 0) + deltaFollowers) } }
        : old
    );
    ['suggested-members', 'online-members', 'user-follows'].forEach((prefix) => {
      queryClient.setQueriesData({ queryKey: [prefix] }, (old: any) => {
        const updateList = (list: any[]) =>
          list.map((m) => (m?.username?.toLowerCase() === key ? { ...m, is_following: nextFollowing } : m));
        if (old?.pages) return { ...old, pages: old.pages.map((p: any) => ({ ...p, data: Array.isArray(p.data) ? updateList(p.data) : p.data })) };
        if (Array.isArray(old?.data)) return { ...old, data: updateList(old.data) };
        return old;
      });
    });
  };

  const toggleFollow = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAuthenticated) { navigate('/signin'); return; }
    if (isLoading) return;
    const prev = isFollowing;
    const delta = prev ? -1 : 1;
    setIsLoading(true);
    syncUserCaches(!prev, delta);
    try {
      if (prev) await ApiClient.delete(`/follows/${user.username}`);
      else await ApiClient.post(`/follows/${user.username}`);
    } catch (err: any) {
      syncUserCaches(prev, -delta);
      dialog.alert(err.message || 'Error al actualizar seguimiento', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return { isFollowing, isLoadingFollow: isLoading, toggleFollow };
}

