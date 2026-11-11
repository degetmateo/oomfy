import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { ApiClient } from '../services/api.js';
import { useFollowMutation } from './useFollowMutation.js';

export function useProfileActions(user: PublicUser) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [isHovering, setIsHovering] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { isFollowing, isLoadingFollow, toggleFollow } = useFollowMutation(user);

  const handleStartChat = async () => {
    if (!isAuthenticated) return navigate('/signin');
    setIsStartingChat(true);
    try {
      const res = await ApiClient.post<{ success: boolean; chatId: string }>('/chats/start', {
        target_username: user.username,
      });
      if (res.chatId) {
        await queryClient.refetchQueries({ queryKey: ['chats'] });
        navigate(`/chats?id=${res.chatId}`);
      } else setIsStartingChat(false);
    } catch (err: any) {
      setIsStartingChat(false);
      dialog.alert(err.message || 'Error al iniciar chat', 'Error');
    }
  };

  return {
    isAuthenticated,
    isFollowing,
    isHovering,
    setIsHovering,
    isLoadingFollow,
    isStartingChat,
    isReportOpen,
    setIsReportOpen,
    handleFollowToggle: toggleFollow,
    handleStartChat,
  };
}
