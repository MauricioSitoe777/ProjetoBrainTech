import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, UserCategory } from '../types/user';
import { CATEGORY_LABEL } from '../data/constants';
import { BrandLogo } from '../components/BrandLogo';

const ROLES: { id: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'cliente',
    label: 'Cliente',
    desc: 'Aceder como locatário',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )
  },
  {
    id: 'admin',
    label: 'Administrador',
    desc: 'Gestão total do sistema e frota',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
  }
];

export function LoginPage({ onCancel }: { onCancel?: () => void }) {
  const { login, register, isLoading, allUsers } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState<UserCategory>('func_publico');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

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
    setPassword('123'); // Password padrão para o demo
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!nome.trim() || !email.trim() || !password.trim()) {
        setError('Por favor preencha todos os campos.');
        return;
      }
      
      const exists = allUsers.some(u => u.email === email);
      if (exists) {
        setError('Este email já está registado.');
        return;
      }

      const ok = await register({
        nome,
        email,
        role: 'cliente',
        status: 'ativo',
        category,
        telefone: '',
      });

      if (!ok) setError('Erro ao criar conta.');
    } else {
      const ok = await login(email, password);
      if (!ok) setError('Email ou palavra-passe incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-400/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-xl relative z-10">
        {/* Close/Back button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Regressar ao site"
            className="absolute top-0 right-0 sm:-right-4 w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/80 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-10 pt-4">
          <div className="inline-flex items-center justify-center mb-3">
            <BrandLogo className="h-24 w-auto max-w-[280px]" />
          </div>
          <p className="text-zinc-200 text-sm font-medium">
            {isRegister ? 'Crie a sua conta de cliente' : 'Selecione o seu perfil para aceder ao sistema'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 mb-6 max-w-[300px] mx-auto">
          <button
            onClick={() => { setIsRegister(false); setSelectedRole(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isRegister ? 'bg-amber-400 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setIsRegister(true); setSelectedRole('cliente'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isRegister ? 'bg-amber-400 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Registar
          </button>
        </div>

        {/* Selection Grid (Only in Login mode) */}
        {!isRegister && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 text-left ${
                  selectedRole === role.id 
                  ? 'bg-zinc-900 border-amber-400/50 ring-1 ring-amber-400/20' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                  selectedRole === role.id ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {role.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{role.label}</h3>
                <p className="text-zinc-300 text-xs leading-relaxed">{role.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Account selection (Only in Login mode) */}
        {!isRegister && selectedRole && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500 max-w-md mx-auto">
            <p className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-3 ml-1">Contas demo disponíveis</p>
            <div className="grid grid-cols-1 gap-2">
              {filteredAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleAccountSelect(acc)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedAccount === acc.id
                    ? 'bg-amber-400/10 border-amber-400/30 text-white'
                    : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    selectedAccount === acc.id ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {acc.nome.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">{acc.nome}</p>
                    <p className="text-[10px] opacity-60">{acc.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl p-8 transition-all duration-500 transform mx-auto max-w-md ${
          isRegister || selectedRole ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-white">{isRegister ? 'Criar Conta' : 'Iniciar Sessão'}</h2>
              <p className="text-zinc-300 text-xs mt-1">
                {isRegister ? 'Preencha os seus dados abaixo' : (selectedAccount ? 'Credenciais pré-preenchidas' : 'Selecione uma conta ou insira os dados')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-200 ml-1">Nome Completo</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm placeholder-zinc-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-200 ml-1">Tipo de Funcionário</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as UserCategory)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm appearance-none focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all shadow-inner cursor-pointer"
                  >
                    {(Object.entries(CATEGORY_LABEL) as [UserCategory, string][]).map(([val, label]) => (
                      <option key={val} value={val} className="bg-zinc-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-200 ml-1">Endereço de Email</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm placeholder-zinc-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-200 ml-1">Palavra-passe</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-12 py-3 text-sm placeholder-zinc-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {isRegister && (
                <p className="text-[10px] text-zinc-500 mt-1 ml-1 italic">Dica: Utilize '123' para facilitar o teste neste demo.</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isRegister && !selectedRole)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-xl py-3.5 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4 shadow-lg shadow-amber-400/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                  A processar...
                </div>
              ) : (isRegister ? 'Criar Minha Conta' : 'Entrar no Sistema')}
            </button>
          </form>
        </div>
        
        <p className="text-center text-zinc-400 text-xs mt-8">
          &copy; 2026 RentCar Mozambique. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

