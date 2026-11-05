import React, { useState } from 'react';
import { Send, Users, User } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const AdminPushForm: React.FC = () => {
  const dialog = useDialogStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'user'>('all');
  const [targetUsername, setTargetUsername] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      dialog.alert('El título y contenido son obligatorios.', 'Campos requeridos');
      return;
    }
    if (targetType === 'user' && !targetUsername.trim()) {
      dialog.alert('Debes ingresar el nombre de usuario del destinatario.', 'Destinatario requerido');
      return;
    }

    const cleanUsername = targetUsername.trim().replace(/^@/, '');
    const recipient = targetType === 'all' ? 'todos los dispositivos suscritos' : `@${cleanUsername}`;
    const confirmed = await dialog.confirm({
      title: 'Confirmar envío push',
      message: `¿Estás seguro de que deseas enviar esta notificación push a ${recipient}?`,
      confirmText: 'Enviar ahora',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    setIsSending(true);
    try {
      const res = await ApiClient.post<any>('/admin/notifications/push/broadcast', {
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/notifications',
        target_username: targetType === 'user' ? cleanUsername : undefined,
      });
      dialog.alert(res.message || 'Notificación enviada con éxito.', 'Envío completado');
      setTitle('');
      setBody('');
      setUrl('');
      setTargetUsername('');
    } catch (err: any) {
      dialog.alert(err.message || 'Error al enviar notificaciones push.', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-2">Destinatarios</label>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setTargetType('all')}
            className={`flex-1 py-2 px-3 border flex items-center justify-center gap-1.5 font-bold transition-colors ${
              targetType === 'all' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-dark-border text-dark-muted hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Todos los usuarios</span>
          </button>
          <button
            type="button"
            onClick={() => setTargetType('user')}
            className={`flex-1 py-2 px-3 border flex items-center justify-center gap-1.5 font-bold transition-colors ${
              targetType === 'user' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-dark-border text-dark-muted hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Usuario específico</span>
          </button>
        </div>
      </div>

      {targetType === 'user' && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1">Username</label>
          <input
            type="text"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            placeholder="ej: mateo o @mateo"
            className="w-full bg-dark-bg border border-dark-border p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ej: @oomfy publicó un nuevo anuncio"
          className="w-full bg-dark-bg border border-dark-border p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1">Contenido / Mensaje</label>
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Texto del anuncio..."
          className="w-full bg-dark-bg border border-dark-border p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1">URL (Opcional)</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/notifications"
          className="w-full bg-dark-bg border border-dark-border p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSending}
        className="mt-2 py-3 px-5 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>{isSending ? 'Enviando...' : 'Enviar notificación push'}</span>
      </button>
    </form>
  );
};

