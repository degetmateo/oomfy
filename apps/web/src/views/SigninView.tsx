import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';

export const SigninView: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery modal state
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'password' | 'username'>('none');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await ApiClient.post<any>('/auth/signin', { username, password });
      setAuth(res.user, res.accessToken, res.refreshToken);

      const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as any).standalone === true);

      if (!isStandalone) {
        navigate('/');
        const wantInstall = await useDialogStore.getState().confirm({
          title: 'Instalar oomfy',
          message:
            '¿Sabías que puedes instalar oomfy en tu dispositivo para acceder más rápido y recibir notificaciones? ¿Deseas ver las instrucciones de instalación?',
          confirmText: 'Ver instrucciones',
          cancelText: 'Más tarde',
        });
        if (wantInstall) {
          navigate('/settings?tab=app');
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMsg('');
    setRecoveryLoading(true);

    try {
      if (recoveryMode === 'password') {
        const res = await ApiClient.post<any>('/auth/forgot-password', { username: recoveryInput.trim() });
        setRecoveryMsg(res.message);
      } else if (recoveryMode === 'username') {
        const res = await ApiClient.post<any>('/auth/forgot-username', { email: recoveryInput.trim() });
        setRecoveryMsg(res.message);
      }
    } catch (err) {
      setRecoveryError((err as Error).message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 font-mono">
      <div className="w-full max-w-md p-6 bg-dark-bg border-2 border-dark-border shadow-pixel relative">
        <div className="flex justify-center mb-4">
          <PixelLogo />
        </div>
        <h2 className="text-xl font-bold text-center text-white mb-1">Iniciar sesión en oomfy</h2>
        <p className="text-xs text-center text-dark-muted mb-6">Ingresa tus credenciales para acceder</p>

        {error && (
          <div className="p-3 mb-4 text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Usuario o Correo</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Contraseña</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-dark-muted hover:text-white p-0.5"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs mt-1">
            <button
              type="button"
              onClick={() => {
                setRecoveryMode('password');
                setRecoveryInput('');
                setRecoveryMsg('');
                setRecoveryError('');
              }}
              className="text-brand-400 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryMode('username');
                setRecoveryInput('');
                setRecoveryMsg('');
                setRecoveryError('');
              }}
              className="text-dark-muted hover:text-white hover:underline"
            >
              ¿Olvidaste tu usuario?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 font-bold text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black uppercase tracking-wider transition-colors pixel-button"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-xs text-center text-dark-muted mt-6">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/signup" className="text-brand-400 font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>

        {/* Modal de recuperación */}
        {recoveryMode !== 'none' && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-dark-bg border-2 border-dark-border shadow-pixel p-5 relative font-mono">
              <button
                onClick={() => setRecoveryMode('none')}
                className="absolute top-3 right-3 text-dark-muted hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-white mb-1">
                {recoveryMode === 'password' ? 'Recuperar Contraseña' : 'Recordar Nombre de Usuario'}
              </h3>
              <p className="text-xs text-dark-muted font-sans mb-4">
                {recoveryMode === 'password'
                  ? 'Ingresa tu nombre de usuario para recibir un enlace de restablecimiento en tu correo.'
                  : 'Ingresa tu correo electrónico registrado para enviarte tu nombre de usuario.'}
              </p>

              {recoveryMsg ? (
                <div className="p-3 bg-brand-950/30 border border-brand-500/40 text-brand-400 text-xs leading-relaxed mb-4">
                  {recoveryMsg}
                  <button
                    onClick={() => setRecoveryMode('none')}
                    className="block mt-3 w-full py-2 bg-brand-500 text-black font-bold text-xs uppercase pixel-button"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-3">
                  {recoveryError && (
                    <div className="p-2.5 text-xs bg-red-950/40 border border-red-500/40 text-red-400">
                      {recoveryError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-dark-muted mb-1 font-semibold">
                      {recoveryMode === 'password' ? 'Nombre de Usuario' : 'Correo Electrónico'}
                    </label>
                    <input
                      type={recoveryMode === 'password' ? 'text' : 'email'}
                      required
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      placeholder={recoveryMode === 'password' ? 'tu_usuario' : 'ejemplo@correo.com'}
                      className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
                    />
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryMode('none')}
                      className="px-3 py-1.5 text-xs text-dark-muted hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={recoveryLoading || !recoveryInput.trim()}
                      className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors"
                    >
                      {recoveryLoading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
