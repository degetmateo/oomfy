import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { AdminReportsList } from '../components/admin/AdminReportsList.js';

export const ModerationView: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header
        title="Moderación de Staff"
        subtitle="Panel de reportes y revisión de contenido"
      />

      <div className="p-4 flex flex-col gap-4">
        <div className="p-3 bg-brand-950/20 border border-brand-500/40 text-xs text-brand-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>
            Panel exclusivo para Staff (Moderadores y Administradores). Revisa y resuelve los reportes enviados por los usuarios.
          </span>
        </div>

        <AdminReportsList />
      </div>
    </div>
  );
};

