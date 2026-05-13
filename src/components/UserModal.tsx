import { useState, useEffect } from 'react';
import type { User, UserRole, UserStatus } from '../types/user';

interface UserModalProps {
  user?: User | null;
  onSave: (data: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => void;
  onClose: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'cliente', label: 'Cliente' },
];

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' },
];

export function UserModal({ user, onSave, onClose }: UserModalProps) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'cliente' as UserRole,
    status: 'ativo' as UserStatus,
    bi: '',
    endereco: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        role: user.role,
        status: user.status,
        bi: user.bi || '',
        endereco: user.endereco || '',
      });
    }
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">
            {user ? 'Editar utilizador' : 'Novo utilizador'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Nome completo *</label>
              <input
                {...field('nome')}
                placeholder="Nome do utilizador"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email *</label>
              <input
                {...field('email')}
                type="email"
                placeholder="email@exemplo.com"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Telefone *</label>
              <input
                {...field('telefone')}
                placeholder="+258 84 000 0000"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone}</p>}
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Papel</label>
              <select
                {...field('role')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Estado</label>
              <select
                {...field('status')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Bilhete de identidade</label>
              <input
                {...field('bi')}
                placeholder="000000000A"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Endereço</label>
              <input
                {...field('endereco')}
                placeholder="Av. ..., Maputo"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {user ? 'Guardar alterações' : 'Criar utilizador'}
          </button>
        </div>
      </div>
    </div>
  );
}