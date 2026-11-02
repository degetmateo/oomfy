import React, { useState } from 'react';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const AccountSettingsTab: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const dialog = useDialogStore();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername === user?.username) return;

    setSavingUsername(true);
    try {
      const res = await ApiClient.put<{ success: boolean; data: { username: string } }>('/settings/username', {
        username: newUsername.trim(),
      });
      if (user) {
        setUser({ ...user, username: res.data.username });
      }
      await dialog.alert('Tu nombre de usuario ha sido actualizado correctamente.', 'Ajustes de cuenta');
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al cambiar usuario');
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <form onSubmit={handleUpdateUsername} className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Nombre de Usuario</h3>
        <p className="text-xs text-dark-muted mb-4 font-sans leading-relaxed">
          Tu @ identifica tu cuenta y tus publicaciones en oomfy.
        </p>
        <div className="flex items-center bg-dark-card border border-dark-border px-3 py-2 text-xs">
          <span className="text-brand-400 font-bold mr-1">@</span>
          <input
            type="text"
            required
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="bg-transparent text-white outline-none flex-1 font-mono"
            placeholder="nuevo_usuario"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={savingUsername || !newUsername.trim() || newUsername === user?.username}
        className="py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start"
      >
        {savingUsername ? 'Guardando...' : 'Actualizar @'}
      </button>
    </form>
  );
};

