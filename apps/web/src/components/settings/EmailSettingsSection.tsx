import React, { useState } from 'react';
import { RequestEmailChangeSchema } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const EmailSettingsSection: React.FC = () => {
  const dialog = useDialogStore();
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = RequestEmailChangeSchema.safeParse({
      new_email: newEmail,
      current_password: currentPassword,
    });
    if (!validation.success) {
      await dialog.alert(validation.error.issues[0]?.message || 'Datos inválidos.', 'Error de validación');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.post<{ success: boolean; message: string }>('/settings/email/request', {
        new_email: validation.data.new_email,
        current_password: validation.data.current_password,
      });
      setNewEmail('');
      setCurrentPassword('');
      await dialog.alert(res.message, 'Verificación de correo enviada');
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al cambiar correo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-dark-border pt-6 mt-6 font-mono">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Correo Electrónico</h3>
        <p className="text-xs text-dark-muted font-sans leading-relaxed">
          Actualiza tu correo electrónico. Te enviaremos un enlace de verificación al nuevo correo antes de aplicar el cambio.
        </p>
      </div>
      <div>
        <label htmlFor="settings-new-email" className="block text-[11px] font-bold text-dark-muted uppercase mb-1">
          Nuevo correo electrónico
        </label>
        <input
          id="settings-new-email"
          name="new_email"
          type="email"
          autoComplete="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="nuevo@correo.com"
          className="w-full bg-dark-card border border-dark-border px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label htmlFor="settings-email-password" className="block text-[11px] font-bold text-dark-muted uppercase mb-1">
          Contraseña actual
        </label>
        <input
          id="settings-email-password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Tu contraseña actual"
          className="w-full bg-dark-card border border-dark-border px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !newEmail.trim() || !currentPassword}
        className="py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start"
      >
        {isSubmitting ? 'Enviando...' : 'Solicitar cambio de correo'}
      </button>
    </form>
  );
};
