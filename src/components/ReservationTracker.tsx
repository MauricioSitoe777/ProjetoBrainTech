import { useState } from 'react';
import type { ReservationStatus } from '../types/reservation';

const STEPS: Array<{ status: ReservationStatus; label: string; short: string }> = [
  { status: 'pendente',            label: 'Reserva Criada',   short: 'Criada' },
  { status: 'confirmada',          label: 'Confirmada',       short: 'Confirmada' },
  { status: 'pronta_levantamento', label: 'Veículo Entregue', short: 'Entregue' },
  { status: 'ativa',               label: 'Em Curso',         short: 'Em Curso' },
  { status: 'devolucao_pendente',  label: 'Devolvido',        short: 'Devolvido' },
  { status: 'concluida',           label: 'Concluído',        short: 'Concluído' },
];

const NEXT_STATUS: Partial<Record<ReservationStatus, ReservationStatus>> = {
  pendente:            'confirmada',
  confirmada:          'pronta_levantamento',
  pronta_levantamento: 'ativa',
  ativa:               'devolucao_pendente',
  devolucao_pendente:  'concluida',
};

const NEXT_LABEL: Partial<Record<ReservationStatus, string>> = {
  pendente:            'Confirmar Reserva',
  confirmada:          'Marcar Entrega',
  pronta_levantamento: 'Iniciar Aluguer',
  ativa:               'Marcar Devolução',
  devolucao_pendente:  'Concluir',
};

const NEXT_STATE_LABEL: Partial<Record<ReservationStatus, string>> = {
  pendente:            'Avança para → Confirmada',
  confirmada:          'Avança para → Veículo Entregue',
  pronta_levantamento: 'Avança para → Em Curso',
  ativa:               'Avança para → Devolvido',
  devolucao_pendente:  'Avança para → Concluído',
};

interface Props {
  status: ReservationStatus;
  onAdvance?: (next: ReservationStatus) => void;
  onCancel?: () => void;
  readonly?: boolean;
}

export function ReservationTracker({ status, onAdvance, onCancel, readonly }: Props) {
  const [confirming, setConfirming] = useState<'advance' | 'cancel' | null>(null);

  const currentIdx     = STEPS.findIndex(s => s.status === status);
  const nextStatus     = NEXT_STATUS[status];
  const nextLabel      = NEXT_LABEL[status];
  const nextStateLabel = NEXT_STATE_LABEL[status];

  if (currentIdx === -1) return null;

  const handleConfirm = () => {
    if (confirming === 'advance' && nextStatus && onAdvance) {
      onAdvance(nextStatus);
    } else if (confirming === 'cancel' && onCancel) {
      onCancel();
    }
    setConfirming(null);
  };

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="flex items-start min-w-max py-1">
          {STEPS.map((step, idx) => {
            const isDone    = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={step.status} className="flex items-start">
                <div className="flex flex-col items-center gap-1.5 w-16">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all shrink-0 ${
                    isDone    ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400' :
                    isCurrent ? 'bg-amber-400 border-amber-400 text-zinc-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]' :
                                'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`text-[9px] font-bold text-center leading-tight px-0.5 ${
                    isDone    ? 'text-emerald-400' :
                    isCurrent ? 'text-amber-400' :
                                'text-zinc-500'
                  }`}>
                    {step.short}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div className="flex items-center mt-3 shrink-0">
                    <div className={`h-0.5 w-6 ${isDone ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke={isDone ? '#34d399' : '#3f3f46'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="-ml-0.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botões / Confirmação */}
      {!readonly && (nextStatus || onCancel) && (
        confirming ? (
          /* ── Confirmação inline ── */
          <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
            <span className="text-xs text-white font-semibold flex-1">
              {confirming === 'cancel'
                ? 'Cancelar esta reserva. Tem a certeza?'
                : `${nextLabel} — Tem a certeza?`}
            </span>
            <button
              onClick={handleConfirm}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                confirming === 'cancel'
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
              }`}
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-700 text-white hover:bg-zinc-600 transition-all active:scale-95"
            >
              Voltar
            </button>
          </div>
        ) : (
          /* ── Botões normais ── */
          <div className="flex gap-2 flex-wrap">
            {nextStatus && nextLabel && onAdvance && (
              <button
                onClick={() => setConfirming('advance')}
                title={nextStateLabel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-95 transition-all"
              >
                {nextLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
            {status !== 'devolucao_pendente' && status !== 'concluida' && onCancel && (
              <button
                onClick={() => setConfirming('cancel')}
                title="Avança para → Cancelado"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
