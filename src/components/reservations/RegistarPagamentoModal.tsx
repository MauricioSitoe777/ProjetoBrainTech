import { useState } from 'react';
import type { Prestacao } from '../../types/reservation';
import { useReservations } from '../../context/ReservationsContext';

interface Props {
  reservationId: string;
  prestacao: Prestacao;
  onClose: () => void;
  onAfterSave?: () => void;
  titulo?: string;
}

const FORMAS = [
  { value: 'mpesa',         label: 'M-Pesa' },
  { value: 'emola',         label: 'e-Mola' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'outros',        label: 'Outros' },
];

const fmtNum = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function fmtDateDisplay(d: string, h: string): string {
  if (!d) return '';
  const [year, month, day] = d.split('-');
  const [hh, mm] = h.split(':');
  const hNum = parseInt(hh);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = String(hNum % 12 || 12).padStart(2, '0');
  return `${day}/${month}/${year} • ${h12}:${mm} ${ampm}`;
}

export function RegistarPagamentoModal({ reservationId, prestacao: p, onClose, onAfterSave, titulo }: Props) {
  const { marcarPrestacao } = useReservations();

  const now    = new Date();
  const nowDate = now.toISOString().split('T')[0];
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [valorStr, setValorStr]           = useState(String(p.valor));
  const [editingValor, setEditingValor]   = useState(false);
  const [forma, setForma]                 = useState('mpesa');
  const [showFormaPicker, setShowFormaPicker] = useState(false);
  const [data, setData]                   = useState(nowDate);
  const [hora, setHora]                   = useState(nowTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [referencia, setReferencia]       = useState('');
  const [notas, setNotas]                 = useState('');
  const [error, setError]                 = useState('');
  const [saved, setSaved]                 = useState(false);

  const valorNum   = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
  const valorValido = !isNaN(valorNum) && valorNum > 0;
  const diferenca  = valorValido ? valorNum - p.valor : 0;
  const formaLabel = FORMAS.find(f => f.value === forma)?.label ?? 'M-Pesa';

  const handleSave = () => {
    if (!valorValido) { setError('Introduza um valor válido.'); return; }
    marcarPrestacao(reservationId, p.numero, true, valorNum, {
      formaPagamento:      forma,
      horaPagamento:       hora,
      dataPagamento:       data,
      referenciaPagamento: referencia.trim() || undefined,
      notasPagamento:      notas.trim() || undefined,
    });
    onAfterSave?.();
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <p className="text-white font-black text-base">{titulo ?? 'Detalhes do Pagamento'}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Valor recebido ── */}
        <div className="px-5 pb-5">
          <p className="text-[11px] text-white mb-1.5">Valor recebido</p>
          <div className="flex items-center gap-3">
            {editingValor ? (
              <input
                autoFocus
                value={valorStr}
                onChange={e => { setValorStr(e.target.value); setError(''); }}
                onBlur={() => setEditingValor(false)}
                className="flex-1 text-[28px] font-black text-amber-400 bg-transparent border-b border-amber-500/50 outline-none tabular-nums"
              />
            ) : (
              <p className="flex-1 text-[28px] font-black text-amber-400 tabular-nums leading-none">
                {valorStr} MT
              </p>
            )}
            <button
              onClick={() => setEditingValor(true)}
              className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 hover:bg-amber-500/25 transition shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
              </svg>
            </button>
          </div>
          {valorValido && diferenca !== 0 && (
            <p className={`text-[10px] mt-2 font-semibold ${diferenca > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {diferenca > 0
                ? `+${fmtNum(diferenca)} MT acima do previsto — excedente distribuído pelas restantes`
                : `${fmtNum(-diferenca)} MT abaixo do previsto`}
            </p>
          )}
          {error && <p className="text-[10px] text-red-400 mt-1.5">{error}</p>}
        </div>

        {/* ── Rows ── */}
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">

          {/* Forma de pagamento */}
          <div>
            <button
              type="button"
              onClick={() => { setShowFormaPicker(v => !v); setShowDatePicker(false); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/40 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <span className="flex-1 text-left text-sm text-white">Forma de pagamento</span>
              <span className="text-sm text-white mr-1">{formaLabel}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-white/30 transition-transform duration-200 ${showFormaPicker ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            {showFormaPicker && (
              <div className="px-5 py-3 bg-zinc-800/30 grid grid-cols-3 gap-2">
                {FORMAS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => { setForma(f.value); setShowFormaPicker(false); }}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      forma === f.value
                        ? 'bg-amber-400/20 border-amber-500 text-amber-400'
                        : 'bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data e hora */}
          <div>
            <button
              type="button"
              onClick={() => { setShowDatePicker(v => !v); setShowFormaPicker(false); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/40 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="flex-1 text-left text-sm text-white">Data e hora</span>
              <span className="text-sm text-white mr-1">{fmtDateDisplay(data, hora)}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-white/30 transition-transform duration-200 ${showDatePicker ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            {showDatePicker && (
              <div className="px-5 py-3 bg-zinc-800/30 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition"
                />
                <input
                  type="time"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            )}
          </div>

          {/* Referência / Comprovativo */}
          <div className="flex items-start gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5 text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
                <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white mb-1.5">Referência / Comprovativo</p>
              <input
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="N.º transacção, ref. bancária, ID M-Pesa..."
                className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => referencia && navigator.clipboard?.writeText(referencia)}
              className="mt-1 text-white/30 hover:text-white/60 transition shrink-0"
              title="Copiar referência"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>

          {/* Notas */}
          <div className="flex items-start gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5 text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white mb-1.5">Notas (opcional)</p>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={2}
                placeholder="Observações adicionais sobre este pagamento..."
                className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none resize-none"
              />
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-5 pt-4 flex gap-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition active:scale-[0.98] ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
            }`}
          >
            {saved ? '✓ Registado' : (
              <>
                Ver comprovativo
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
