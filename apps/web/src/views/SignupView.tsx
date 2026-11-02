import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';

export const SignupView: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', username: '', name: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await ApiClient.post('/auth/signup', formData);
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
        <h2 className="text-xl font-bold text-center text-white mb-1">Únete a oomfy</h2>
        <p className="text-xs text-center text-dark-muted mb-6">Crea tu cuenta y empieza a interactuar</p>

        {success ? (
          <div className="p-4 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-center text-xs leading-relaxed">
            ¡Cuenta creada exitosamente! Revisa tu correo electrónico para activar tu cuenta antes de iniciar sesión.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {error && (
              <div className="p-3 text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Nombre</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Nombre de Usuario (@)</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Contraseña</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 font-bold text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black uppercase tracking-wider transition-colors pixel-button"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        )}

        <p className="text-xs text-center text-dark-muted mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/signin" className="text-brand-400 font-bold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
