import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ onCancel }: { onCancel?: () => void }) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (!ok) setError('Email ou palavra-passe incorretos.');
  };

  const demoLogin = (type: 'admin' | 'gestor' | 'cliente') => {
    const accounts = {
      admin: { email: 'admin@rentcar.mz', password: 'admin123' },
      gestor: { email: 'gestor@rentcar.mz', password: 'gestor123' },
      cliente: { email: 'cliente@rentcar.mz', password: 'cliente123' },
    };
    setEmail(accounts[type].email);
    setPassword(accounts[type].password);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
                <rect x="9" y="11" width="14" height="10" rx="2"/>
                <circle cx="12" cy="16" r="1"/>
                <circle cx="20" cy="16" r="1"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">RentCar</span>
          </div>
          <p className="text-zinc-400 text-sm">Sistema de Gestão de Aluguer de Viaturas</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-white">Entrar na conta</h1>
            {onCancel && (
              <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Voltar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Palavra-passe</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-3">Contas de demonstração:</p>
            <div className="flex gap-2">
              {(['admin', 'gestor', 'cliente'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => demoLogin(type)}
                  className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 capitalize transition-colors border border-zinc-700"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
