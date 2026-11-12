import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';

export const SignupView: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', username: '', name: '', password: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('Debes aceptar la Política de Privacidad y los Términos y Condiciones para registrarte.');
      return;
    }
    setLoading(true);
    try {
      await ApiClient.post('/auth/signup', { ...formData, accepted_terms: true });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-6 font-mono">
      <div className="w-full max-w-md p-6 bg-dark-bg border-2 border-dark-border shadow-pixel">
        <div className="flex justify-center mb-4"><PixelLogo /></div>
        <h1 className="text-xl font-bold text-center text-white mb-1">Únete a oomfy</h1>
        <p className="text-xs text-center text-dark-muted mb-6">Crea tu cuenta y empieza a interactuar</p>

        {success ? (
          <div role="status" className="p-4 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-center text-xs leading-relaxed">
            ¡Cuenta creada exitosamente! Revisa tu correo electrónico para activar tu cuenta antes de iniciar sesión.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {error && <div role="alert" className="p-3 text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-400">{error}</div>}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-dark-muted mb-1">Nombre</label>
              <input id="signup-name" name="name" type="text" autoComplete="name" enterKeyHint="next" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
            </div>
            <div>
              <label htmlFor="signup-username" className="block text-xs font-semibold text-dark-muted mb-1">Nombre de Usuario (@)</label>
              <input id="signup-username" name="username" type="text" autoComplete="username" spellCheck={false} autoCapitalize="none" autoCorrect="off" enterKeyHint="next" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-dark-muted mb-1">Correo Electrónico</label>
              <input id="signup-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" autoCorrect="off" enterKeyHint="next" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-dark-muted mb-1">Contraseña</label>
              <div className="relative flex items-center">
                <input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="done" required minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 pr-9 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'} className="absolute right-2.5 text-dark-muted hover:text-white p-0.5" title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <label htmlFor="signup-terms" className="flex items-start gap-2.5 text-[11px] text-dark-text font-sans cursor-pointer select-none mt-1 leading-relaxed">
              <input id="signup-terms" name="accepted_terms" type="checkbox" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-brand-500 w-4 h-4 flex-shrink-0 cursor-pointer" />
              <span>
                Acepto los <Link to="/terms" className="text-brand-400 font-bold hover:underline">Términos y Condiciones</Link> y la{' '}
                <Link to="/privacy" className="text-brand-400 font-bold hover:underline">Política de Privacidad</Link> de Oomfy.
              </span>
            </label>

            <button type="submit" disabled={loading || !acceptedTerms} className="w-full py-2.5 mt-1 font-bold text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black uppercase tracking-wider transition-colors pixel-button">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        )}

        <p className="text-xs text-center text-dark-muted mt-6">
          ¿Ya tienes una cuenta? <Link to="/signin" className="text-brand-400 font-bold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
};
