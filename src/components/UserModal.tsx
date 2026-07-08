import { useState, useEffect } from 'react';
import type { User, UserRole, UserStatus, UserCategory, UserRegularity, UserRestriction } from '../types/user';
import { CATEGORY_LABEL, DOC_LABEL } from '../data/constants';

interface UserModalProps {
  user?: User | null;
  onSave: (data: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => void;
  onClose: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cliente', label: 'Cliente' },
];

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'pendente', label: 'Pendente' },
];

const REGULARITY_STATES: { value: UserRegularity; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'inadimplente', label: 'Inadimplente' },
];

const RESTRICTION_STATES: { value: UserRestriction; label: string }[] = [
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'blacklisted', label: 'Lista Negra (Blacklisted)' },
];

const EXTRA_DOCS_BY_CATEGORY: Record<UserCategory, string[]> = {
  func_publico: ['declaracao_rendimento', 'carta_conducao'],
  func_privado: ['declaracao_rendimento', 'contrato_trabalho', 'declaracao_bairro', 'carta_conducao'],
  empreendedor: ['declaracao_bairro', 'carta_conducao'],
};

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

export function UserModal({ user, onSave, onClose }: UserModalProps) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'cliente' as UserRole,
    status: 'ativo' as UserStatus,
    regularity: 'regular' as UserRegularity,
    restriction: 'nenhuma' as UserRestriction,
    category: 'func_publico' as UserCategory,
    bi: '',
    nuit: '',
    endereco: '',
    motivoSuspensao: '',
  });
  const [docFiles, setDocFiles] = useState<Partial<Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        role: user.role,
        status: user.status,
        regularity: user.regularity || 'regular',
        restriction: user.restriction || 'nenhuma',
        category: user.category || 'func_publico',
        bi: user.bi || '',
        nuit: user.nuit || '',
        endereco: user.endereco || '',
        motivoSuspensao: user.motivoSuspensao || '',
      });
      // Restore file names from existing documentos
      if (user.documentos) {
        const files: Partial<Record<string, string>> = {};
        Object.entries(user.documentos).forEach(([k, v]) => {
          if (typeof v === 'string') files[k] = v;
        });
        setDocFiles(files);
      }
    }
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (form.status === 'suspenso' && !form.motivoSuspensao.trim())
      e.motivoSuspensao = 'Obrigatório indicar o motivo da suspensão';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // Build documentos: file names take priority, then existing values
    const documentos: User['documentos'] = { ...(user?.documentos || {}) };
    Object.entries(docFiles).forEach(([k, v]) => {
      if (v) (documentos as Record<string, string | boolean>)[k] = v;
    });
    onSave({ ...form, documentos });
  };

  const handleDocFile = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFiles(prev => ({ ...prev, [key]: file.name }));
      e.target.value = '';
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let val = e.target.value;
      if (key === 'telefone' && !user) {
        if (val && !val.startsWith('+') && /^\d/.test(val)) {
          val = '+258 ' + val;
        }
      }
      setForm(prev => ({ ...prev, [key]: val }));
    }
  });

  const categoryDocs = EXTRA_DOCS_BY_CATEGORY[form.category] ?? [];

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors';

  const InlineUpload = ({ docKey, existingValue }: { docKey: string; existingValue?: string | boolean }) => {
    const fileName = docFiles[docKey];
    const hasFile = !!fileName || !!existingValue;
    return (
      <>
        <input
          type="file"
          id={`modal-file-${docKey}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleDocFile(docKey)}
        />
        <label
          htmlFor={`modal-file-${docKey}`}
          title={fileName || (typeof existingValue === 'string' ? existingValue : '') || 'Fazer upload'}
          className={`flex items-center justify-center w-9 shrink-0 rounded-lg border cursor-pointer transition-colors ${
            hasFile
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              : 'border-zinc-700 bg-zinc-800 text-white hover:border-amber-500 hover:text-amber-500'
          }`}
        >
          <UploadIcon />
        </label>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">
            {user ? 'Editar utilizador' : 'Novo utilizador'}
          </h2>
          <button onClick={onClose} className="text-white hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">Nome completo *</label>
              <input {...field('nome')} placeholder="Nome do utilizador" className={inputClass} />
              {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Email *</label>
              <input {...field('email')} type="email" placeholder="email@exemplo.com" className={inputClass} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Telefone *</label>
              <input {...field('telefone')} placeholder="+258 84 000 0000" className={inputClass} />
              {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Papel</label>
              <select {...field('role')} className={inputClass}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Estado</label>
              <select {...field('status')} className={inputClass}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {form.status === 'suspenso' && (
              <div className="col-span-2">
                <label className="block text-xs text-white mb-1 flex items-center gap-2">
                  Motivo da suspensão
                  <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Obrigatório</span>
                </label>
                <textarea
                  {...field('motivoSuspensao')}
                  placeholder="Ex: Incumprimento de pagamento, comportamento inadequado..."
                  rows={3}
                  className={`${inputClass} resize-none ${errors.motivoSuspensao ? 'border-red-500' : ''}`}
                />
                {errors.motivoSuspensao && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/></svg>
                    {errors.motivoSuspensao}
                  </p>
                )}
              </div>
            )}

            {/* BI + inline upload */}
            <div>
              <label className="block text-xs text-white mb-1">Bilhete de identidade</label>
              <div className="flex gap-2">
                <input {...field('bi')} placeholder="000000000A" className={inputClass} />
                <InlineUpload docKey="bi" existingValue={user?.documentos?.bi} />
              </div>
              {docFiles.bi && <p className="text-[11px] text-emerald-400 mt-1 truncate">{docFiles.bi}</p>}
            </div>

            {/* NUIT + inline upload */}
            <div>
              <label className="block text-xs text-white mb-1">NUIT</label>
              <div className="flex gap-2">
                <input {...field('nuit')} placeholder="123456789" className={inputClass} />
                <InlineUpload docKey="nuit" existingValue={user?.documentos?.nuit} />
              </div>
              {docFiles.nuit && <p className="text-[11px] text-emerald-400 mt-1 truncate">{docFiles.nuit}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Regularidade (Financeira/Doc)</label>
              <select {...field('regularity')} className={inputClass}>
                {REGULARITY_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Restrição (Segurança)</label>
              <select {...field('restriction')} className={inputClass}>
                {RESTRICTION_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">Categoria de Funcionário</label>
              <select {...field('category')} className={inputClass}>
                {(Object.entries(CATEGORY_LABEL) as [UserCategory, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">Morada</label>
              <input {...field('endereco')} placeholder="Av. ..., Maputo" className={inputClass} />
            </div>

            {/* Documentos Anexos (per category) */}
            {categoryDocs.length > 0 && (
              <div className="col-span-2 space-y-2">
                <p className="text-xs text-white font-semibold uppercase tracking-wider mb-1">Documentos Anexos</p>
                {categoryDocs.map(key => {
                  const existingValue = user?.documentos?.[key as keyof typeof user.documentos];
                  const fileName = docFiles[key];
                  const isArchived = !!existingValue && !fileName;
                  const hasNew = !!fileName;
                  return (
                    <div key={key}>
                      <input
                        type="file"
                        id={`modal-file-${key}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocFile(key)}
                      />
                      <label
                        htmlFor={`modal-file-${key}`}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          hasNew
                            ? 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15'
                            : isArchived
                            ? 'border-zinc-600 bg-zinc-800/60 hover:border-amber-500/50'
                            : 'border-zinc-700 bg-zinc-800 hover:border-amber-500'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium">{DOC_LABEL[key]}</p>
                          <p className={`text-[11px] truncate ${hasNew ? 'text-emerald-400' : isArchived ? 'text-white' : 'text-white'}`}>
                            {hasNew
                              ? fileName
                              : isArchived
                              ? typeof existingValue === 'string' ? existingValue : 'Arquivado ✓'
                              : 'Nenhum ficheiro anexado'}
                          </p>
                        </div>
                        <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          hasNew || isArchived
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-700 text-white hover:bg-amber-500/20 hover:text-amber-400'
                        }`}>
                          <UploadIcon />
                          {hasNew || isArchived ? 'Substituir' : 'Upload'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm transition-colors"
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
