import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { ApiClient } from '../../services/api.js';

export const TermsAcceptanceModal: React.FC = () => {
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isReadingLegal = location.pathname === '/privacy' || location.pathname === '/terms';
  if (!isAuthenticated || !user || user.terms_accepted !== false || isReadingLegal) {
    return null;
  }

  const handleAccept = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await ApiClient.post<{ success: boolean; data: PublicUser }>('/members/me/accept-terms');
      setUser(res.data);
    } catch (err) {
      setError((err as Error).message || 'No se pudo registrar tu aceptación. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-mono">
      <div className="w-full max-w-md bg-dark-bg border-2 border-brand-500 shadow-pixel overflow-hidden">
        <div className="flex items-center gap-2 p-3.5 border-b border-dark-border bg-dark-card/70">
          <ShieldCheck className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Términos y Política de Privacidad</h2>
        </div>

        <div className="p-4 text-xs text-dark-text font-sans leading-relaxed flex flex-col gap-3">
          <p>
            Hemos incorporado nuestros <strong className="text-white">Términos y Condiciones</strong> y nuestra{' '}
            <strong className="text-white">Política de Privacidad</strong> para toda la comunidad de Oomfy.
          </p>
          <p className="text-brand-400 font-semibold">
            Si sigues usando la aplicación, confirmas que estás de acuerdo con todos los términos y políticas vigentes.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 font-mono text-[11px]">
            <Link to="/terms" className="text-brand-400 hover:underline font-bold">
              Leer Términos y Condiciones →
            </Link>
            <Link to="/privacy" className="text-brand-400 hover:underline font-bold">
              Leer Política de Privacidad →
            </Link>
          </div>
          {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 p-3.5 border-t border-dark-border bg-dark-card/30">
          <button
            type="button"
            onClick={() => logout()}
            disabled={submitting}
            className="px-3 py-2 text-xs text-dark-muted hover:text-white border border-dark-border bg-dark-card transition-colors"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black uppercase tracking-wider pixel-button"
          >
            {submitting ? 'Guardando...' : 'Aceptar y continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

