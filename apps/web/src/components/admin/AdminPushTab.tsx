import React from 'react';
import { Bell } from 'lucide-react';
import { AdminPushForm } from './AdminPushForm.js';

export const AdminPushTab: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 max-w-xl flex flex-col gap-6 font-mono">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-brand-400" />
          <span>Enviar Notificaciones Push Manuales</span>
        </h3>
        <p className="text-xs text-dark-muted font-sans leading-relaxed">
          Envía anuncios, avisos de moderación o mensajes globales en tiempo real a los navegadores y dispositivos PWA.
        </p>
      </div>

      <AdminPushForm />
    </div>
  );
};
