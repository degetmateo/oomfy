import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { ApiClient } from '../services/api.js';

export function usePinPublication(postId: string) {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const isPinned = Boolean(user && user.pinned_publication_id === postId);

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;

    const confirmed = await dialog.confirm({
      title: isPinned ? 'Desfijar de tu perfil' : 'Fijar en tu perfil',
      message: isPinned
        ? '¿Estás seguro de que deseas desfijar esta publicación de tu perfil?'
        : '¿Estás seguro de que deseas fijar esta publicación en tu perfil?',
      confirmText: isPinned ? 'Desfijar' : 'Fijar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      if (isPinned) {
        await ApiClient.delete(`/publications/${postId}/pin`);
        setUser({ ...user, pinned_publication_id: null, pinned_publication: null });
      } else {
        await ApiClient.post(`/publications/${postId}/pin`);
        setUser({ ...user, pinned_publication_id: postId });
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    } catch (err: any) {
      dialog.alert(err.message || 'Error al procesar la solicitud');
    }
  };

  return { isPinned, togglePin, canPin: isAuthenticated };
}

