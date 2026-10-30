import React from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

export const MobileFloatingButton: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={() => openPostModal()}
      title="Publicar"
      className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-brand-500 hover:bg-brand-600 text-black flex items-center justify-center border-2 border-black shadow-pixel pixel-button"
    >
      <Plus className="w-6 h-6 stroke-[3]" />
    </button>
  );
};

