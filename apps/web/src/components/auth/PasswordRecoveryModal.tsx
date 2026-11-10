import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ApiClient } from '../../services/api.js';

interface Props {
  mode: 'none' | 'password' | 'username';
  onClose: () => void;
}

export const PasswordRecoveryModal: React.FC<Props> = ({ mode, onClose }) => {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput('');
    setMsg('');
    setError('');
  }, [mode]);

  if (mode === 'none') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const endpoint = mode === 'password' ? '/auth/forgot-password' : '/auth/forgot-username';
      const body = mode === 'password' ? { username: input.trim() } : { email: input.trim() };
      const res = await ApiClient.post<any>(endpoint, body);
      setMsg(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-dark-bg border-2 border-dark-border shadow-pixel p-5 relative font-mono">
        <button onClick={onClose} className="absolute top-3 right-3 text-dark-muted hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-white mb-1">
          {mode === 'password' ? 'Recuperar Contraseña' : 'Recordar Nombre de Usuario'}
        </h3>
        <p className="text-xs text-dark-muted font-sans mb-4">
          {mode === 'password'
            ? 'Ingresa tu nombre de usuario para recibir un enlace de restablecimiento en tu correo.'
            : 'Ingresa tu correo electrónico registrado para enviarte tu nombre de usuario.'}
        </p>

        {msg ? (
          <div className="p-3 bg-brand-950/30 border border-brand-500/40 text-brand-400 text-xs leading-relaxed mb-4">
            {msg}
            <button onClick={onClose} className="block mt-3 w-full py-2 bg-brand-500 text-black font-bold text-xs uppercase pixel-button">
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && <div className="p-2.5 text-xs bg-red-950/40 border border-red-500/40 text-red-400">{error}</div>}
            <div>
              <label className="block text-xs text-dark-muted mb-1 font-semibold">
                {mode === 'password' ? 'Nombre de Usuario' : 'Correo Electrónico'}
              </label>
              <input
                type={mode === 'password' ? 'text' : 'email'}
                required
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'password' ? 'tu_usuario' : 'ejemplo@correo.com'}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-dark-muted hover:text-white">Cancelar</button>
              <button type="submit" disabled={loading || !input.trim()} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors">
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

