import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2 } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const AccountLifecycleSection: React.FC = () => {
  const { user, logout } = useAuthStore();
  const dialog = useDialogStore();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: any }>('/members/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `oomfy-datos-${user?.username || 'cuenta'}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      dialog.alert(err.message || 'No se pudo exportar tu información.', 'Error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    const ok = await dialog.confirm({
      title: 'Eliminar cuenta permanentemente',
      message: 'Esta acción borrará tu perfil, publicaciones, mensajes, seguidores e imágenes de forma irreversible.',
      isDanger: true,
      confirmText: 'Sí, eliminar mi cuenta',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await ApiClient.delete('/members/me', { password });
      logout(false);
      navigate('/', { replace: true });
      dialog.alert('Tu cuenta ha sido eliminada permanentemente.', 'Cuenta eliminada');
    } catch (err: any) {
      dialog.alert(err.message || 'No se pudo eliminar la cuenta.', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 border-t border-dark-border mt-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase text-white">Portabilidad de Datos</h3>
          <p className="text-[11px] text-dark-muted font-sans">Descarga una copia en JSON con tus publicaciones, perfil, mensajes y actividad.</p>
        </div>
        <button type="button" onClick={handleExport} disabled={isExporting} className="px-3 py-1.5 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black text-xs font-bold flex items-center gap-1.5 self-start transition-colors">
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exportando...' : 'Exportar datos'}</span>
        </button>
      </div>

      <div className="border border-red-500/40 bg-red-500/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase text-red-400">Zona de Peligro · Eliminar Cuenta</h3>
            <p className="text-[11px] text-dark-muted font-sans">Borra permanentemente tu cuenta y todo su contenido asociado.</p>
          </div>
          {!showDeleteForm && (
            <button type="button" onClick={() => setShowDeleteForm(true)} className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar cuenta</span>
            </button>
          )}
        </div>
        {showDeleteForm && (
          <form onSubmit={handleDeleteAccount} className="mt-3 flex flex-col sm:flex-row gap-2">
            <label htmlFor="delete-account-password" className="sr-only">Confirma tu contraseña actual</label>
            <input id="delete-account-password" name="current_password" type="password" autoComplete="current-password" enterKeyHint="done" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Confirma tu contraseña actual" className="flex-1 bg-dark-bg border border-dark-border p-2 text-xs text-white focus:border-red-500 focus:outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowDeleteForm(false); setPassword(''); }} className="px-3 py-1.5 border border-dark-border text-xs text-dark-muted hover:text-white">Cancelar</button>
              <button type="submit" disabled={isDeleting || !password} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold">
                {isDeleting ? 'Eliminando...' : 'Confirmar borrado'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

