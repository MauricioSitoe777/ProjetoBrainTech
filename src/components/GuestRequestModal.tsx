import { useState } from 'react';
import { useGuests } from '../context/GuestsContext';
import type { GuestCategory, GuestIntent } from '../types/guest';
import { IconKey, IconCar } from './Icons';

interface Props {
  intent?: GuestIntent;
  vehicleName?: string;
  prefill?: { nome?: string; telefone?: string };
  preCategory?: GuestCategory;
  withDriver?: boolean;
  onClose: () => void;
}

const inputClass = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-500';

export function GuestRequestModal({ intent: initialIntent = 'aluguer', vehicleName, prefill, preCategory, onClose }: Props) {
  const { addGuest } = useGuests();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    nome: prefill?.nome ?? '',
    email: '',
    telefone: prefill?.telefone ?? '',
    intent: initialIntent,
    category: (preCategory ?? 'func_publico') as GuestCategory,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim() || form.nome.length < 2) e.nome = 'Nome obrigatório';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addGuest({
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      intent: form.intent,
      category: form.intent === 'compra' ? form.category : undefined,
      documentos: {},
      vehicleName,
    });
    setDone(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-black text-base">Registar Interesse</h2>
            <p className="text-white text-xs mt-0.5">
              {done ? 'Pedido enviado com sucesso' : 'Preencha os seus dados de contacto'}
            </p>
          </div>
          {!done && (
            <button onClick={onClose} className="text-white hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="p-5">
          {!done ? (
            <div className="space-y-3">
              {vehicleName && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 font-bold">
                  Viatura: {vehicleName}
                </div>
              )}

              <div>
                <label className="block text-xs text-white font-bold mb-1">Nome completo *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Ana Mussa" className={inputClass} />
                {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
              </div>

              <div>
                <label className="block text-xs text-white font-bold mb-1">Email *</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  type="email" placeholder="email@exemplo.com" className={inputClass} />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs text-white font-bold mb-1">Telefone *</label>
                <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="+258 84 000 0000" className={inputClass} />
                {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone}</p>}
              </div>

              <div>
                <label className="block text-xs text-white font-bold mb-1">Tipo de pedido</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['aluguer', 'compra'] as GuestIntent[]).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, intent: t }))}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                        form.intent === t
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-800 text-white border-zinc-700 hover:border-amber-500/50'
                      }`}>
                      <span className="flex items-center justify-center gap-1.5">
                        {t === 'aluguer' ? <><IconKey size={13} /> Aluguer</> : <><IconCar size={13} /> Compra</>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.intent === 'compra' && (
                <div>
                  <label className="block text-xs text-white font-bold mb-1">Categoria</label>
                  <select value={form.category}
                    onChange={e => !preCategory && setForm(p => ({ ...p, category: e.target.value as GuestCategory }))}
                    className={`${inputClass} ${preCategory ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={!!preCategory}>
                    <option value="func_publico">Funcionário Público</option>
                    <option value="func_privado">Funcionário Privado</option>
                    <option value="empreendedor">Empreendedor</option>
                  </select>
                </div>
              )}

              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white leading-relaxed">
                ℹ️ Após o envio, a nossa equipa entrará em contacto consigo para dar seguimento ao processo.
              </div>

              <button onClick={handleSubmit}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg py-2.5 text-sm transition-colors mt-1">
                Enviar Pedido
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <div>
                <h3 className="text-white font-black text-lg">Pedido enviado!</h3>
                <p className="text-white text-sm mt-1 leading-relaxed">
                  Os seus dados foram recebidos. A nossa equipa entrará em contacto para dar seguimento.
                </p>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left space-y-1.5">
                <p className="text-amber-400 text-xs font-black uppercase tracking-wider mb-2">O que acontece agora?</p>
                <p className="text-xs text-white">1. A nossa equipa analisa o seu pedido</p>
                <p className="text-xs text-white">2. Entraremos em contacto por telefone ou email</p>
                <p className="text-xs text-white">3. Vamos juntos tratar dos documentos necessários</p>
                <p className="text-xs text-white">4. Recebe as credenciais de acesso ao sistema</p>
              </div>

              <button onClick={onClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-bold transition-colors">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
