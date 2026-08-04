import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Phone, UserPlus } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
  onLoginInstead: () => void;
}

export function RegisterModal({ onClose, onLoginInstead }: Props) {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', password: '', confirmar: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirmar) e.confirmar = 'As senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/users', {
        name:     form.nome,
        nome:     form.nome,
        email:    form.email,
        telefone: form.telefone,
        password: form.password,
        role:     'cliente',
        status:   'pendente',
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta';
      setErrors({ geral: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputBase = (err?: string) =>
    `flex items-center gap-3 border rounded-xl px-4 bg-zinc-950/80 transition-all h-[52px] ${
      err
        ? 'border-red-500/60 focus-within:border-red-500'
        : 'border-zinc-700 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15'
    }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md relative">

        {/* close */}
        <button onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-500 z-10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="relative rounded-3xl p-px" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,.25) 0%,rgba(63,63,70,.5) 50%,rgba(251,191,36,.1) 100%)' }}>
          <div className="bg-zinc-900 rounded-[calc(1.5rem-1px)] p-7 shadow-2xl shadow-black/60">

            {/* logo */}
            <div className="text-center mb-6">
              <BrandLogo className="h-16 w-auto max-w-[200px] mx-auto mb-4" />
              {!success && (
                <>
                  <h2 className="text-xl font-black text-white">Criar Conta</h2>
                  <p className="text-zinc-400 text-sm mt-1">Preencha os dados para se registar</p>
                </>
              )}
            </div>

            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <p className="text-white font-black text-lg">Conta criada com sucesso!</p>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                  A sua conta foi registada e está pendente de activação pelo administrador.
                  Receberá uma notificação quando for activada.
                </p>
                <button onClick={onLoginInstead}
                  className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-sm h-[52px] transition-all shadow-xl shadow-amber-500/25">
                  Ir para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">

                {/* Nome */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Nome completo</label>
                  <div className={inputBase(errors.nome)}>
                    <UserPlus size={16} className="text-zinc-500 shrink-0" />
                    <input value={form.nome} onChange={set('nome')} placeholder="O seu nome completo"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600" />
                  </div>
                  {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Email</label>
                  <div className={inputBase(errors.email)}>
                    <Mail size={16} className="text-zinc-500 shrink-0" />
                    <input type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600" />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Telefone */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Telefone</label>
                  <div className={inputBase(errors.telefone)}>
                    <Phone size={16} className="text-zinc-500 shrink-0" />
                    <input value={form.telefone} onChange={set('telefone')} placeholder="+258 84 000 0000"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600" />
                  </div>
                  {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone}</p>}
                </div>

                {/* Senha */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Palavra-passe</label>
                  <div className={inputBase(errors.password)}>
                    <Lock size={16} className="text-zinc-500 shrink-0" />
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600" />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="text-zinc-500 hover:text-zinc-200 shrink-0">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirmar */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Confirmar palavra-passe</label>
                  <div className={inputBase(errors.confirmar)}>
                    <Lock size={16} className="text-zinc-500 shrink-0" />
                    <input type={showPass ? 'text' : 'password'} value={form.confirmar} onChange={set('confirmar')} placeholder="Repetir a senha"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600" />
                  </div>
                  {errors.confirmar && <p className="text-red-400 text-xs mt-1">{errors.confirmar}</p>}
                </div>

                {/* Erro geral */}
                {errors.geral && (
                  <div className="flex items-center gap-2.5 text-red-400 text-xs bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {errors.geral}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black rounded-xl text-sm h-[52px] transition-all disabled:opacity-30 shadow-xl shadow-amber-500/25 mt-1">
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin"/>A criar conta...</span>
                    : 'Criar Conta'}
                </button>

                <p className="text-center text-zinc-500 text-xs pt-1">
                  Já tem conta?{' '}
                  <button type="button" onClick={onLoginInstead} className="text-amber-500 hover:text-amber-400 font-bold">
                    Iniciar sessão
                  </button>
                </p>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
