import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';

export const VerifyView: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [mode, setMode] = useState<'signup' | 'email'>('signup');
  const [errorMsg, setErrorMsg] = useState('');
  const processedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const emailToken = params.get('email_token');
    const signupToken = params.get('token');
    const key = emailToken ? `email:${emailToken}` : signupToken ? `signup:${signupToken}` : '';
    if (key && processedTokenRef.current === key) return;
    if (key) processedTokenRef.current = key;

    if (emailToken) {
      setMode('email');
      ApiClient.post<any>('/settings/email/confirm', { token: emailToken })
        .then(() => {
          setStatus('success');
          setTimeout(() => navigate(isAuthenticated ? '/settings' : '/'), 2000);
        })
        .catch((err) => { setStatus('error'); setErrorMsg((err as Error).message); });
      return;
    }

    if (!signupToken) {
      setStatus('error');
      setErrorMsg('Token de activación no proporcionado.');
      return;
    }

    ApiClient.post<any>('/auth/verify', { token: signupToken })
      .then((res) => {
        setAuth(res.user, res.accessToken, res.refreshToken);
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      })
      .catch((err) => { setStatus('error'); setErrorMsg((err as Error).message); });
  }, [params, navigate, setAuth, isAuthenticated]);

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center font-mono">
      {status === 'verifying' && (
        <div role="status" className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <h1 className="text-xl font-bold text-white">
            {mode === 'email' ? 'Confirmando tu nuevo correo...' : 'Verificando tu cuenta...'}
          </h1>
        </div>
      )}
      {status === 'success' && (
        <div role="status" className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
          <h1 className="text-xl font-bold mb-2">
            {mode === 'email' ? '¡Correo Electrónico Actualizado!' : '¡Cuenta Activada con Éxito!'}
          </h1>
          <p className="text-sm">{mode === 'email' ? 'Redirigiendo...' : 'Redirigiendo a tu feed de oomfy...'}</p>
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
          <h1 className="text-xl font-bold mb-2">Error de Verificación</h1>
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}
    </main>
  );
};
