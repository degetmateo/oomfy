import React, { useEffect, useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { AdminUserSummary, Role, UsernameSchema } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

interface Props { user: AdminUserSummary | null; onClose: () => void; onSuccess: () => void; }

export const AdminEditUserModal: React.FC<Props> = ({ user, onClose, onSuccess }) => {
  const dialog = useDialogStore();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>(user?.status || 'active');
  const [role, setRole] = useState<Role>(user?.role || 'member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(user?.name || ''); setUsername(user?.username || '');
    setPassword(''); setStatus(user?.status || 'active'); setRole(user?.role || 'member');
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      const validation = UsernameSchema.safeParse(username.trim());
      if (!validation.success) {
        dialog.alert(validation.error.issues[0]?.message || 'Solo se permiten letras del alfabeto inglés, números y guiones bajos.', 'Error');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const payload: any = { name, username, status, role };
      if (password.trim()) payload.password = password.trim();
      await ApiClient.put(`/admin/users/${user.id}`, payload);
      dialog.alert('Usuario actualizado correctamente.', 'Éxito');
      onSuccess();
      onClose();
    } catch (err: any) {
      dialog.alert(err.message || 'Error al actualizar usuario.', 'Error');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 font-mono text-xs">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-dark-bg border-2 border-dark-border shadow-pixel overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <div className="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>Editar @{user.username}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-dark-border text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div>
            <label className="block text-[10px] uppercase text-dark-muted mb-1">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-dark-card border border-dark-border p-2 text-white font-sans text-xs" />
          </div>
          <div>
            <label htmlFor="admin-edit-username" className="block text-[10px] uppercase text-dark-muted mb-1">Usuario</label>
            <input id="admin-edit-username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="none" autoCorrect="off" pattern="^[a-zA-Z0-9_]+$" title="Solo se permiten letras del alfabeto inglés, números y guiones bajos." required className="w-full bg-dark-card border border-dark-border p-2 text-white text-xs" />
          </div>
          <div>
            <label htmlFor="admin-edit-password" className="block text-[10px] uppercase text-dark-muted mb-1">Nueva Contraseña (opcional)</label>
            <input id="admin-edit-password" name="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar en blanco para mantener" className="w-full bg-dark-card border border-dark-border p-2 text-white text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase text-dark-muted mb-1">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-dark-card border border-dark-border p-2 text-white text-xs">
                <option value="active">Activo</option><option value="pending">Pendiente</option><option value="suspended">Suspendido</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-dark-muted mb-1">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full bg-dark-card border border-dark-border p-2 text-white text-xs">
                <option value="member">Miembro</option><option value="mod">Mod</option><option value="tester">Tester</option><option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-dark-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-dark-border text-dark-muted hover:text-white">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-brand-500 text-black font-bold hover:bg-brand-400 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
