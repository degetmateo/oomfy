import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const LogoutSection: React.FC = () => {
  const { logout, user } = useAuthStore();
  const dialog = useDialogStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar sesión',
      message: `¿Estás seguro de que deseas cerrar la sesión de @${user?.username}?`,
      isDanger: true,
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      logout();
      navigate('/signin');
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-dark-border">
      <div className="bg-dark-card/40 border border-dark-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sesión actual</span>
          </h4>
          <p className="text-[11px] text-dark-muted font-sans mt-0.5">
            Cierra tu sesión activa en este dispositivo móvil o navegador.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 border border-red-500/80 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

