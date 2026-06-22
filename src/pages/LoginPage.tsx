import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/user';
import { BrandLogo } from '../components/BrandLogo';

const ROLES: { id: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'cliente',
    label: 'Cliente',
    desc: 'Aceder como locatário',
    icon: <User size={18} />,
  },
  {
    id: 'admin',
    label: 'Administrador',
    desc: 'Gestão total do sistema',
    icon: <Shield size={18} />,
  },
];

export function LoginPage({ onCancel, onRecuperar }: { onCancel?: () => void; onRecuperar?: () => void }) {
  const { login, isLoading, allUsers } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const filteredAccounts = allUsers.filter(a => a.role === selectedRole);

  const handleRoleSelect = (roleId: UserRole) => {
    setSelectedRole(roleId);
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleAccountSelect = (acc: typeof allUsers[0]) => {
    setSelectedAccount(acc.id);
    setEmail(acc.email);
    setPassword('123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (!ok) setError('Credenciais incorretas. Verifique o email e a senha.');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-amber-400/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Close button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Regressar ao site"
            className="absolute -top-2 -right-2 w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-8 pt-2">
          <BrandLogo className="h-20 w-auto max-w-[240px] mx-auto" />
          <p className="text-zinc-400 text-sm mt-3">Selecione o perfil e inicie sessão</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/40">

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleSelect(role.id)}
                className={`flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all duration-200 text-left ${
                  selectedRole === role.id
                    ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  selectedRole === role.id ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {role.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none">{role.label}</p>
                  <p className="text-zinc-500 text-[11px] mt-0.5 leading-tight">{role.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Demo accounts */}
          {selectedRole && filteredAccounts.length > 0 && (
            <div className="mb-5">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Contas rápidas</p>
              <div className="flex flex-wrap gap-2">
                {filteredAccounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleAccountSelect(acc)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      selectedAccount === acc.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                      selectedAccount === acc.id ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-white'
                    }`}>
                      {acc.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                    {acc.nome.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Email ou Telemóvel</label>
              <div className={`flex items-center gap-3 border rounded-xl px-3.5 h-12 bg-zinc-950 transition-all ${
                selectedRole ? 'border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20' : 'border-zinc-800 opacity-40 pointer-events-none'
              }`}>
                <Mail size={16} className="text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@email.com ou 84XXXXXXX"
                  required
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Palavra-passe</label>
              <div className={`flex items-center gap-3 border rounded-xl px-3.5 h-12 bg-zinc-950 transition-all ${
                selectedRole ? 'border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20' : 'border-zinc-800 opacity-40 pointer-events-none'
              }`}>
                <Lock size={16} className="text-zinc-500 shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    remember ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-zinc-600'
                  }`}
                >
                  {remember && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" className="text-zinc-950">
                      <path fillRule="evenodd" clipRule="evenodd" d="M8.53547 0.62293C8.88226 0.849446 8.97976 1.3142 8.75325 1.66099L4.5083 8.1599C4.38833 8.34356 4.19397 8.4655 3.9764 8.49358C3.75883 8.52167 3.53987 8.45309 3.3772 8.30591L0.616113 5.80777C0.308959 5.52987 0.285246 5.05559 0.563148 4.74844C0.84105 4.44128 1.31533 4.41757 1.62249 4.69547L3.73256 6.60459L7.49741 0.840706C7.72393 0.493916 8.18868 0.396414 8.53547 0.62293Z"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-zinc-400">Lembrar-me</span>
              </label>
              {onRecuperar && (
                <button
                  type="button"
                  onClick={onRecuperar}
                  className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !selectedRole}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-bold rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                  A processar...
                </div>
              ) : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          &copy; 2026 SOS Motors. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
