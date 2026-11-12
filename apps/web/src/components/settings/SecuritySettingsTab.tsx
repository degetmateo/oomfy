import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const SecuritySettingsTab: React.FC = () => {
  const dialog = useDialogStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  const renderPasswordField = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    show: boolean,
    toggleShow: () => void,
    autoComplete: string,
    enterKeyHint: 'next' | 'done',
    minLength?: number
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-dark-muted mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          id={id} name={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} enterKeyHint={enterKeyHint}
          required minLength={minLength} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-9 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
        />
        <button type="button" onClick={toggleShow} aria-pressed={show} aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'} className="absolute right-2.5 text-dark-muted hover:text-white p-0.5" title={show ? 'Ocultar contraseña' : 'Ver contraseña'}>
          {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Cambiar Contraseña</h3>
        <p className="text-xs text-dark-muted mb-4 font-sans leading-relaxed">
          Utiliza una combinación segura de al menos 8 caracteres.
        </p>
      </div>

      {renderPasswordField('current-password', 'Contraseña Actual', currentPassword, setCurrentPassword, showCurrentPass, () => setShowCurrentPass(!showCurrentPass), 'current-password', 'next')}
      {renderPasswordField('new-password', 'Nueva Contraseña', newPassword, setNewPassword, showNewPass, () => setShowNewPass(!showNewPass), 'new-password', 'next', 8)}
      {renderPasswordField('confirm-new-password', 'Confirmar Nueva Contraseña', confirmPassword, setConfirmPassword, showConfirmPass, () => setShowConfirmPass(!showConfirmPass), 'new-password', 'done', 8)}

      <button
        type="submit"
        disabled={savingPassword || !currentPassword || !newPassword}
        className="py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start"
      >
        {savingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
      </button>
    </form>
  );
};

