import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';

export const ResetPasswordView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El token de restablecimiento es inválido o no está presente en el enlace.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await ApiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 font-mono">
      <div className="w-full max-w-md p-6 bg-dark-bg border-2 border-dark-border shadow-pixel">
        <div className="flex justify-center mb-4">
          <PixelLogo />
        </div>
        <h2 className="text-xl font-bold text-center text-white mb-1">Restablecer Contraseña</h2>
        <p className="text-xs text-center text-dark-muted mb-6">Ingresa tu nueva contraseña para tu cuenta de oomfy</p>

        {success ? (
          <div className="flex flex-col items-center text-center gap-3 p-4 bg-brand-950/30 border border-brand-500/40">
            <CheckCircle className="w-8 h-8 text-brand-400" />
            <p className="text-xs text-brand-400 font-bold leading-relaxed">
              ¡Tu contraseña ha sido restablecida exitosamente!
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-2 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase pixel-button transition-colors"
            >
              Iniciar sesión ahora
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Nueva Contraseña</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Confirmar Nueva Contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-2.5 mt-2 font-bold text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black uppercase tracking-wider transition-colors pixel-button"
            >
              {loading ? 'Restableciendo...' : 'Guardar nueva contraseña'}
            </button>

            <p className="text-xs text-center text-dark-muted mt-2">
              <Link to="/signin" className="text-brand-400 hover:underline">
                Volver a Iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

