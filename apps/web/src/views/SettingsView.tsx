import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Key, Laptop, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { ApiClient } from '../services/api.js';
import { Session } from '@oomfy/shared';

type Tab = 'account' | 'security' | 'sessions';

export const SettingsView: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const dialog = useDialogStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  // Account tab state
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Sessions query
  const { data: sessionsData, isLoading: loadingSessions } = useQuery<{ success: boolean; data: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => ApiClient.get('/sessions'),
    enabled: activeTab === 'sessions',
  });

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      await dialog.alert('Las contraseñas nuevas no coinciden.', 'Error');
      return;
    }
    if (newPassword.length < 8) {
      await dialog.alert('La nueva contraseña debe tener al menos 8 caracteres.', 'Error');
      return;
    }

    setSavingPassword(true);
    try {
      await ApiClient.put('/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await dialog.alert('Tu contraseña ha sido actualizada exitosamente.', 'Seguridad');
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const handleRevokeSession = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Revocar sesión',
      message: '¿Deseas cerrar esta sesión? El dispositivo deberá volver a identificarse.',
      isDanger: true,
      confirmText: 'Cerrar sesión',
    });
    if (confirmed) {
      revokeSessionMutation.mutate(id);
    }
  };

  const handleRevokeAllOthers = async () => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar otras sesiones',
      message: '¿Deseas cerrar todas las sesiones abiertas en otros dispositivos?',
      isDanger: true,
      confirmText: 'Cerrar todas',
    });
    if (confirmed) {
      await ApiClient.delete('/sessions/others');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await dialog.alert('Todas las demás sesiones fueron cerradas.', 'Sesiones');
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Configuración" />

      {/* Tabs */}
      <div className="flex border-b border-dark-border bg-dark-bg text-xs">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 py-3 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'account' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Cuenta</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-3 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'security' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Seguridad</span>
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-3 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'sessions' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Sesiones</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-xl">
        {activeTab === 'account' && (
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
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Cambiar Contraseña</h3>
              <p className="text-xs text-dark-muted mb-4 font-sans leading-relaxed">
                Utiliza una combinación segura de al menos 8 caracteres.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Contraseña Actual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword}
              className="py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start"
            >
              {savingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Sesiones Activas</h3>
                <p className="text-xs text-dark-muted font-sans">
                  Dispositivos en los que has iniciado sesión en oomfy.
                </p>
              </div>
              <button
                onClick={handleRevokeAllOthers}
                className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-[11px] pixel-button transition-colors"
              >
                Cerrar las demás
              </button>
            </div>

            <div className="divide-y divide-dark-border border border-dark-border bg-dark-card/30">
              {loadingSessions ? (
                <div className="p-6 text-center text-xs text-dark-muted">Cargando sesiones...</div>
              ) : sessionsData?.data && sessionsData.data.length > 0 ? (
                sessionsData.data.map((sess) => (
                  <div key={sess.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-dark-bg border border-dark-border text-brand-400 flex-shrink-0">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="font-bold text-white truncate">{sess.platform || 'Navegador Web'}</p>
                        <p className="text-[11px] text-dark-muted truncate">
                          IP: {sess.ip} · {new Date(sess.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-1.5 text-dark-muted hover:text-red-400 hover:bg-red-950/20 transition-colors flex-shrink-0"
                      title="Cerrar sesión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-dark-muted">No hay sesiones activas registradas.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
