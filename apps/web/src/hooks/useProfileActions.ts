import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { ApiClient } from '../services/api.js';
import { useFollowMutation } from './useFollowMutation.js';

export function useProfileActions(user: PublicUser) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user: authUser, setUser: setAuthUser } = useAuthStore();
  const dialog = useDialogStore();
  const patchEntityUser = useEntityRegistryStore((s) => s.patchUser);
  const [isHovering, setIsHovering] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(Boolean(user.is_blocked));
  const [isLoadingBlock, setIsLoadingBlock] = useState(false);
  const [followsYou, setFollowsYou] = useState(Boolean(user.follows_you));
  const [isRemovingFollower, setIsRemovingFollower] = useState(false);
  const { isFollowing, isLoadingFollow, toggleFollow } = useFollowMutation(user);

  useEffect(() => {
    setIsBlocked(Boolean(user.is_blocked));
    setFollowsYou(Boolean(user.follows_you));
  }, [user.id, user.is_blocked, user.follows_you]);

  const syncBlockCaches = (nextBlocked: boolean) => {
    setIsBlocked(nextBlocked);
    if (nextBlocked) setFollowsYou(false);
    const applyPatch = (u: PublicUser): PublicUser => ({
      ...u,
      is_blocked: nextBlocked,
      ...(nextBlocked ? { is_following: false, follows_you: false } : {}),
    });
    patchEntityUser(user.username, applyPatch);
    userIdentityMap.patch(user.username, applyPatch);
    queryClient.setQueryData(['profile', user.username.toLowerCase()], (old: any) =>
      old?.data ? { ...old, data: applyPatch(old.data) } : old
    );
  };

  const handleRemoveFollower = async () => {
    if (!isAuthenticated) return navigate('/signin');
    if (isRemovingFollower || !followsYou) return;
    const ok = await dialog.confirm({
      title: 'Eliminar seguidor',
      message: `¿Quieres eliminar a @${user.username} de tus seguidores? Dejará de seguirte sin recibir notificación.`,
      isDanger: true,
      confirmText: 'Eliminar seguidor',
    });
    if (!ok) return;
    setIsRemovingFollower(true);
    try {
      const res = await ApiClient.delete<{ success: boolean; removed?: boolean }>(`/follows/followers/${user.username}`);
      const delta = res?.removed ? -1 : 0;
      setFollowsYou(false);
      const applyTargetPatch = (u: PublicUser): PublicUser => ({
        ...u,
        follows_you: false,
        followed_count: Math.max(0, (u.followed_count || 0) + delta),
      });
      patchEntityUser(user.username, applyTargetPatch);
      userIdentityMap.patch(user.username, applyTargetPatch);
      queryClient.setQueryData(['profile', user.username.toLowerCase()], (old: any) =>
        old?.data ? { ...old, data: applyTargetPatch(old.data) } : old
      );
      if (authUser && delta !== 0) {
        const nextMe = { ...authUser, follower_count: Math.max(0, (authUser.follower_count || 0) + delta) };
        setAuthUser(nextMe);
        userIdentityMap.patch(authUser.username, (u) => ({
          ...u,
          follower_count: Math.max(0, (u.follower_count || 0) + delta),
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-follows'] });
    } catch (err: any) {
      dialog.alert(err.message || 'Error al eliminar seguidor', 'Error');
    } finally {
      setIsRemovingFollower(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!isAuthenticated) return navigate('/signin');
    if (isLoadingBlock) return;
    if (!isBlocked) {
      const ok = await dialog.confirm({
        title: 'Bloquear usuario',
        message: `¿Estás seguro de que deseas bloquear a @${user.username}? No podrá seguirte, interactuar con tus publicaciones ni enviarte mensajes.`,
        isDanger: true,
        confirmText: 'Bloquear',
      });
      if (!ok) return;
    }
    setIsLoadingBlock(true);
    try {
      if (isBlocked) await ApiClient.delete(`/members/${user.username}/block`);
      else await ApiClient.post(`/members/${user.username}/block`);
      syncBlockCaches(!isBlocked);
      queryClient.invalidateQueries({ queryKey: ['profile', user.username.toLowerCase()] });
    } catch (err: any) {
      dialog.alert(err.message || 'Error al actualizar bloqueo', 'Error');
    } finally {
      setIsLoadingBlock(false);
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) return navigate('/signin');
    setIsStartingChat(true);
    try {
      const res = await ApiClient.post<{ success: boolean; chatId?: string; data?: { id: string } }>('/chats/start', {
        target_username: user.username,
      });
      const resolvedChatId = res.chatId || res.data?.id;
      if (!resolvedChatId) throw new Error('No se pudo abrir la conversación.');
      await queryClient.refetchQueries({ queryKey: ['chats'] });
      navigate(`/chats?id=${resolvedChatId}`);
    } catch (err: any) {
      dialog.alert(err.message || 'Error al iniciar chat', 'Error');
    } finally {
      setIsStartingChat(false);
    }
  };

  return {
    isAuthenticated, isFollowing, isHovering, setIsHovering, isLoadingFollow,
    isStartingChat, isReportOpen, setIsReportOpen, isBlocked,
    followsYou, isRemovingFollower,
    hasBlockedViewer: Boolean(user.has_blocked_viewer), isLoadingBlock,
    handleFollowToggle: toggleFollow, handleStartChat, handleBlockToggle, handleRemoveFollower,
  };
}
