import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';

export const VerifyView: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Token de activación no proporcionado.');
      return;
    }

    ApiClient.post<any>('/auth/verify', { token })
      .then((res) => {
        setAuth(res.user, res.accessToken);
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg((err as Error).message);
      });
  }, [params, navigate, setAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-white">Verificando tu cuenta...</h2>
        </div>
      )}

      {status === 'success' && (
        <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
          <h2 className="text-xl font-bold mb-2">¡Cuenta Activada con Éxito!</h2>
          <p className="text-sm">Redirigiendo a tu feed de oomfy...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
          <h2 className="text-xl font-bold mb-2">Error de Verificación</h2>
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};

