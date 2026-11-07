import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { ApiClient } from '../services/api.js';

export function useProfileActions(user: PublicUser) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [isHovering, setIsHovering] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) return navigate('/signin');
    setIsLoadingFollow(true);
    try {
      if (user.is_following) await ApiClient.delete(`/follows/${user.username}`);
      else await ApiClient.post(`/follows/${user.username}`);
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
      queryClient.invalidateQueries({ queryKey: ['suggested-members'] });
    } catch (err: any) {
      dialog.alert(err.message, 'Error');
    } finally {
      setIsLoadingFollow(false);
    }
  };

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
      } else {
        setIsStartingChat(false);
      }
    } catch (err: any) {
      setIsStartingChat(false);
      dialog.alert(err.message || 'Error al iniciar chat', 'Error');
    }
  };

  return {
    isAuthenticated,
    isHovering,
    setIsHovering,
    isLoadingFollow,
    isStartingChat,
    isReportOpen,
    setIsReportOpen,
    handleFollowToggle,
    handleStartChat,
  };
}
