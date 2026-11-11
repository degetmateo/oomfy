import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { PasswordRecoveryModal } from '../components/auth/PasswordRecoveryModal.js';

export const SigninView: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'password' | 'username'>('none');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await ApiClient.post<any>('/auth/signin', { username, password });
      setAuth(res.user, res.accessToken);
      const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
      if (PushNotificationService.isPermissionGranted()) await PushNotificationService.syncSubscription().catch(() => { });
      navigate('/');

      if (res.user?.terms_accepted === false) return;
      if (!isStandalone) {
        const wantInstall = await useDialogStore.getState().confirm({
          title: 'Instalar oomfy',
          message: '¿Sabías que podés instalar oomfy en tu dispositivo para acceder más rápido y recibir notificaciones?',
          confirmText: 'Ver instrucciones', cancelText: 'Más tarde',
        });
        if (wantInstall) navigate('/settings?tab=app');
      } else if (!PushNotificationService.isPermissionGranted()) {
        const wantPush = await useDialogStore.getState().confirm({
          title: 'Notificaciones Push',
          message: 'oomfy está instalada en tu dispositivo, pero aún no tienes las notificaciones activadas. ¿Deseas activarlas?',
          confirmText: 'Activar notificaciones', cancelText: 'Más tarde',
        });
        if (wantPush) navigate('/settings?tab=app');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 font-mono">
      <div className="w-full max-w-md p-6 bg-dark-bg border-2 border-dark-border shadow-pixel relative">
        <div className="flex justify-center mb-4"><PixelLogo /></div>
        <h2 className="text-xl font-bold text-center text-white mb-1">Iniciar sesión en oomfy</h2>
        <p className="text-xs text-center text-dark-muted mb-6">Ingresa tus credenciales para acceder</p>
        {error && <div className="p-3 mb-4 text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Usuario o Correo</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Contraseña</label>
            <div className="relative flex items-center">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 pr-9 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 text-dark-muted hover:text-white p-0.5" title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs mt-1">
            <button type="button" onClick={() => setRecoveryMode('password')} className="text-brand-400 hover:underline">¿Olvidaste tu contraseña?</button>
            <button type="button" onClick={() => setRecoveryMode('username')} className="text-dark-muted hover:text-white hover:underline">¿Olvidaste tu usuario?</button>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 mt-2 font-bold text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black uppercase tracking-wider transition-colors pixel-button">
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-xs text-center text-dark-muted mt-6">
          ¿Aún no tienes cuenta? <Link to="/signup" className="text-brand-400 font-bold hover:underline">Regístrate aquí</Link>
        </p>
        <div className="flex align-center justify-center gap-4 mt-3 text-[11px] text-dark-muted">
          <Link to="/terms" className="hover:text-brand-400 hover:underline text-center">Términos y Condiciones</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-brand-400 hover:underline text-center">Política de Privacidad</Link>
        </div>
        <PasswordRecoveryModal mode={recoveryMode} onClose={() => setRecoveryMode('none')} />
      </div>
    </div>
  );
};
