import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { PixelLogo } from '../components/icons/PixelLogo.js';

export const SigninView: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await ApiClient.post<any>('/auth/signin', { username, password });
      setAuth(res.user, res.accessToken);
      navigate('/');
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
            />
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
      </div>
    </div>
  );
};
