import { useState } from 'react';

interface Props {
  clienteName: string;
  vehicleName: string;
  multaAtraso?: number;
  caucaoDefault: number;
  taxaLimpezaDefault: number;
  onClose: () => void;
  onSave: (estadoViatura: string, reembolso?: { valor: number; descricao: string }) => void;
}

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';

const SUGESTOES = ['Bom estado geral', 'Riscos ligeiros', 'Danos na carroçaria', 'Interior sujo', 'Combustível abaixo do acordado'];

export function RegistarDevolucaoModal({ clienteName, vehicleName, multaAtraso, caucaoDefault, taxaLimpezaDefault, onClose, onSave }: Props) {
  const [estado, setEstado] = useState('');
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);

  const [boaCondicao, setBoaCondicao] = useState(false);
  const [reembolsarCaucao,  setReembolsarCaucao]  = useState(true);
  const [caucaoValor,       setCaucaoValor]       = useState(caucaoDefault);
  const [reembolsarLimpeza, setReembolsarLimpeza] = useState(true);
  const [limpezaValor,      setLimpezaValor]      = useState(taxaLimpezaDefault);

  const totalReembolso =
    (reembolsarCaucao ? caucaoValor : 0) +
    (reembolsarLimpeza ? limpezaValor : 0);

  const handleSave = () => {
    if (!estado.trim()) { setError('Descreva o estado da viatura na devolução.'); return; }

    let reembolso: { valor: number; descricao: string } | undefined;
    if (boaCondicao && totalReembolso > 0) {
      const itens = [
        reembolsarCaucao  && 'Caução',
        reembolsarLimpeza && 'Taxa de limpeza',
      ].filter(Boolean).join(' + ');
      reembolso = { valor: totalReembolso, descricao: itens };
    }

    onSave(estado.trim(), reembolso);
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const addSugestao = (s: string) =>
    setEstado(prev => (prev.trim() ? `${prev.trim()}; ${s}` : s));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div>
            <p className="text-white font-black text-base">Vistoria de Devolução</p>
            <p className="text-[11px] text-white mt-0.5">{vehicleName} · {clienteName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {multaAtraso !== undefined && multaAtraso > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Multa por Atraso</p>
              <p className="text-sm font-black text-red-400">{fmt(multaAtraso)}</p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-widest mb-1.5">
              Estado da viatura na devolução
            </label>
            <textarea
              autoFocus
              value={estado}
              onChange={e => { setEstado(e.target.value); setError(''); }}
              rows={4}
              placeholder="Descreva o estado da viatura: carroçaria, interior, combustível, danos observados..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500 transition resize-none"
            />
            {error && <p className="text-[10px] text-red-400 mt-1.5">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => addSugestao(s)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:border-amber-500/50 hover:text-amber-400 transition"
              >
                + {s}
              </button>
            ))}
          </div>

          {/* ── Reembolso ── */}
          <div className="border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => setBoaCondicao(v => !v)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${boaCondicao ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${boaCondicao ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
              <span className="text-xs font-bold text-white">Viatura em bom estado — reembolsar cliente</span>
            </button>

            {boaCondicao && (
              <div className="mt-3 space-y-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={reembolsarCaucao}
                    onChange={e => setReembolsarCaucao(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                  />
                  <span className="text-xs text-white flex-1">Caução</span>
                  <input
                    type="number"
                    value={caucaoValor}
                    onChange={e => setCaucaoValor(Math.max(0, Number(e.target.value) || 0))}
                    disabled={!reembolsarCaucao}
                    className="w-24 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-emerald-500 disabled:opacity-40 transition"
                  />
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={reembolsarLimpeza}
                    onChange={e => setReembolsarLimpeza(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                  />
                  <span className="text-xs text-white flex-1">Taxa de limpeza</span>
                  <input
                    type="number"
                    value={limpezaValor}
                    onChange={e => setLimpezaValor(Math.max(0, Number(e.target.value) || 0))}
                    disabled={!reembolsarLimpeza}
                    className="w-24 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-emerald-500 disabled:opacity-40 transition"
                  />
                </label>
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">Total a reembolsar</span>
                  <span className="text-sm font-black text-emerald-400">{fmt(totalReembolso)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition active:scale-[0.98] ${
              saved ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
            }`}
          >
            {saved ? '✓ Registado' : 'Registar Devolução'}
          </button>
        </div>

      </div>
    </div>
  );
}
