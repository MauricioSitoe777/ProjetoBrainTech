import { useState } from 'react';
import { useGuests } from '../context/GuestsContext';
import type { GuestCategory, GuestIntent } from '../types/guest';

interface Props {
  intent?: GuestIntent;
  vehicleName?: string;
  prefill?: { nome?: string; telefone?: string };
  preCategory?: GuestCategory;
  withDriver?: boolean;
  onClose: () => void;
}

const DOC_LABELS: Record<string, string> = {
  bi: 'Bilhete de Identidade (BI)',
  nuit: 'NUIT',
  declaracao_rendimento: 'Declaração de Rendimento',
  contrato_trabalho: 'Contrato de Trabalho',
  declaracao_bairro: 'Declaração de Bairro',
  carta_conducao: 'Carta de Condução',
};

const DOCS_ALUGUER_SEM_MOTORISTA = ['bi', 'carta_conducao'];
const DOCS_ALUGUER_COM_MOTORISTA = ['bi'];

const DOCS_COMPRA: Record<GuestCategory, string[]> = {
  func_publico:  ['bi', 'nuit', 'declaracao_rendimento'],
  func_privado:  ['bi', 'nuit', 'declaracao_rendimento', 'contrato_trabalho', 'declaracao_bairro'],
  empreendedor:  ['bi', 'nuit', 'declaracao_bairro'],
};

function getRequiredDocs(intent: GuestIntent, category?: GuestCategory, withDriver?: boolean): string[] {
  if (intent === 'aluguer') return withDriver ? DOCS_ALUGUER_COM_MOTORISTA : DOCS_ALUGUER_SEM_MOTORISTA;
  if (!category) return [];
  return DOCS_COMPRA[category];
}

const inputClass = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-500';

export function GuestRequestModal({ intent: initialIntent = 'aluguer', vehicleName, prefill, preCategory, withDriver, onClose }: Props) {
  const { addGuest } = useGuests();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    nome: prefill?.nome ?? '',
    email: '',
    telefone: prefill?.telefone ?? '',
    intent: initialIntent,
    category: (preCategory ?? 'func_publico') as GuestCategory,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});

  const requiredDocs = getRequiredDocs(form.intent, form.intent === 'compra' ? form.category : undefined, withDriver);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim() || form.nome.length < 2) e.nome = 'Nome obrigatório';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDoc = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setDocs(prev => ({ ...prev, [key]: file.name })); e.target.value = ''; }
  };

  const handleSubmit = () => {
    addGuest({
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      intent: form.intent,
      category: form.intent === 'compra' ? form.category : undefined,
      documentos: docs,
      vehicleName,
    });
    setStep(3);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-black text-base">Registar Interesse</h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              {step === 1 ? 'Informações pessoais' : step === 2 ? 'Documentos necessários' : 'Pedido enviado'}
            </p>
          </div>
          {step !== 3 && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Progress */}
        {step !== 3 && (
          <div className="flex gap-1.5 px-5 pt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-amber-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        )}

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* ── Step 1: Info pessoal ── */}
          {step === 1 && (
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
                      {t === 'aluguer' ? 'Aluguer' : 'Compra'}
                    </button>
                  ))}
                </div>
              </div>

              {form.intent === 'compra' && (
                <div>
                  <label className="block text-xs text-white font-bold mb-1">Categoria de funcionário</label>
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

              <button onClick={() => validateStep1() && setStep(2)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg py-2.5 text-sm transition-colors mt-2">
                Continuar →
              </button>
            </div>
          )}

          {/* ── Step 2: Documentos ── */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs leading-relaxed">
                Para {form.intent === 'aluguer' ? 'aluguer de viatura' : `compra de viatura (${form.category === 'func_publico' ? 'Func. Público' : form.category === 'func_privado' ? 'Func. Privado' : 'Empreendedor'})`} são necessários:
              </p>

              <div className="space-y-2">
                {requiredDocs.map(key => {
                  const fileName = docs[key];
                  return (
                    <div key={key}>
                      <input type="file" id={`gdoc-${key}`} className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png" onChange={handleDoc(key)} />
                      <label htmlFor={`gdoc-${key}`}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          fileName
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-700 bg-zinc-800 hover:border-amber-500/40'
                        }`}>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-semibold">{DOC_LABELS[key]}</p>
                          <p className={`text-[11px] truncate ${fileName ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {fileName ?? 'Clique para anexar ficheiro'}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          fileName ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400 hover:text-white'
                        }`}>
                          {fileName ? '✓' : 'Anexar'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <p className="text-zinc-600 text-[10px]">Documentos opcionais — pode submeter sem todos os ficheiros e completar depois.</p>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-bold transition-colors">
                  ← Voltar
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg py-2.5 text-sm transition-colors">
                  Enviar Pedido
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Sucesso ── */}
          {step === 3 && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <div>
                <h3 className="text-white font-black text-lg">Pedido enviado!</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Os seus dados foram recebidos e serão analisados pela nossa equipa.
                </p>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left space-y-2">
                <p className="text-amber-400 text-xs font-black uppercase tracking-wider">Próximos passos</p>
                <div className="space-y-1.5 text-xs text-zinc-400">
                  <p>1. Análise dos documentos pela equipa</p>
                  <p>2. Contacto por email ou telefone</p>
                  <p>3. Recebe as credenciais de acesso ao sistema</p>
                  <p>4. A partir daí faz parte do sistema</p>
                </div>
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
