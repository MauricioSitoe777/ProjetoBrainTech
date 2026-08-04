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
    icon: <User size={20} />,
  },
  {
    id: 'admin',
    label: 'Administrador',
    desc: 'Gestão total do sistema',
    icon: <Shield size={20} />,
  },
];

export function LoginPage({ onCancel, onRecuperar, onRegister }: { onCancel?: () => void; onRecuperar?: () => void; onRegister?: () => void }) {
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
    if (!ok) setError('Credenciais incorretas. Verifique o e-mail e a palavra-passe.');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Fundo com glows e padrão ───────────────────────────── */}
      {/* Glow central superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-400/10 rounded-full blur-[160px] pointer-events-none" />
      {/* Glow inferior esquerdo */}
      <div className="absolute bottom-0 -left-40 w-[500px] h-[400px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
      {/* Glow inferior direito */}
      <div className="absolute bottom-0 -right-40 w-[500px] h-[400px] bg-amber-400/6 rounded-full blur-[120px] pointer-events-none" />

      {/* Grade sutil */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251,191,36,1) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Conteúdo ───────────────────────────────────────────── */}
      <div className="w-full max-w-md relative z-10">

        {/* Fechar */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Regressar ao site"
            className="absolute -top-3 -right-3 w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all flex items-center justify-center shadow-lg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* ── Logo + header ──────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <BrandLogo className="h-24 w-auto max-w-[280px]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Bem-vindo de volta</h1>
          <p className="text-zinc-400 text-sm mt-1.5">Selecione o perfil e inicie sessão</p>
        </div>

        {/* ── Card principal ────────────────────────────────── */}
        {/* Wrapper com borda gradiente */}
        <div className="relative rounded-3xl p-px" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(63,63,70,0.5) 50%, rgba(251,191,36,0.1) 100%)' }}>
          <div className="bg-zinc-900 rounded-[calc(1.5rem-1px)] p-7 shadow-2xl shadow-black/60">

            {/* Seleção de role */}
            <div className="grid grid-cols-2 gap-3 mb-7">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border transition-all duration-200 text-left ${
                    selectedRole === role.id
                      ? 'bg-amber-500/12 border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.1)]'
                      : 'bg-zinc-800/60 border-zinc-700/60 hover:border-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    selectedRole === role.id
                      ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30'
                      : 'bg-zinc-700/80 text-zinc-300'
                  }`}>
                    {role.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold leading-none">{role.label}</p>
                    <p className="text-zinc-500 text-[11px] mt-1 leading-tight">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Contas rápidas — só em desenvolvimento */}
            {import.meta.env.DEV && selectedRole && filteredAccounts.length > 0 && (
              <div className="mb-6">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2.5">
                  Contas rápidas <span className="text-amber-500/60">(só em DEV)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredAccounts.map(acc => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccountSelect(acc)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        selectedAccount === acc.id
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.08)]'
                          : 'bg-zinc-800/70 border-zinc-700/50 text-zinc-300 hover:border-zinc-500 hover:text-white'
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

            {/* Separador */}
            <div className="h-px bg-zinc-800 mb-6" />

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Email ou Telemóvel</label>
                <div className={`flex items-center gap-3 border rounded-xl px-4 h-13 bg-zinc-950/80 transition-all ${
                  selectedRole
                    ? 'border-zinc-700 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15 focus-within:shadow-[0_0_20px_rgba(251,191,36,0.08)]'
                    : 'border-zinc-800 opacity-40 pointer-events-none'
                }`} style={{ height: '52px' }}>
                  <Mail size={17} className="text-zinc-500 shrink-0" />
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
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Palavra-passe</label>
                <div className={`flex items-center gap-3 border rounded-xl px-4 bg-zinc-950/80 transition-all ${
                  selectedRole
                    ? 'border-zinc-700 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15 focus-within:shadow-[0_0_20px_rgba(251,191,36,0.08)]'
                    : 'border-zinc-800 opacity-40 pointer-events-none'
                }`} style={{ height: '52px' }}>
                  <Lock size={17} className="text-zinc-500 shrink-0" />
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
                    className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Lembrar + Esqueceu */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setRemember(!remember)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                      remember ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
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
                    className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    Esqueceu a palavra-passe?
                  </button>
                )}
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2.5 text-red-400 text-xs bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Botão submit */}
              <button
                type="submit"
                disabled={isLoading || !selectedRole}
                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black rounded-xl text-sm tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-amber-500/25 hover:shadow-amber-500/35 mt-1"
                style={{ height: '52px' }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                    A processar...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar no Sistema
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                )}
              </button>
            </form>

          </div>
        </div>

        {/* Registo */}
        {onRegister && (
          <p className="text-center text-zinc-500 text-sm mt-5">
            Não tem conta?{' '}
            <button type="button" onClick={onRegister} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">
              Criar conta
            </button>
          </p>
        )}

        {/* Rodapé */}
        <p className="text-center text-zinc-600 text-xs mt-4">
          &copy; 2026 SOS Motors · Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
