import { useState } from 'react';
import type { ReservationStatus } from '../types/reservation';

type Step = {
  status: ReservationStatus;
  short: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    status: 'pendente',
    short: 'Criada',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="12" x2="12" y2="18"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    status: 'confirmada',
    short: 'Confirmada',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  {
    status: 'pronta_levantamento',
    short: 'Entregue',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
    ),
  },
  {
    status: 'ativa',
    short: 'Em Curso',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    status: 'devolucao_pendente',
    short: 'Devolvido',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6"/>
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
      </svg>
    ),
  },
  {
    status: 'concluida',
    short: 'Concluído',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
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

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtStepDate(dateStr: string, isCurrent: boolean): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (isCurrent) {
    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'há 1 dia';
    return `há ${diffDays} dias`;
  }
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

interface Props {
  status: ReservationStatus;
  onAdvance?: (next: ReservationStatus) => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onContract?: () => void;
  readonly?: boolean;
  stepDates?: Partial<Record<ReservationStatus, string>>;
}

export function ReservationTracker({ status, onAdvance, onCancel, onEdit, onContract, readonly, stepDates }: Props) {
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
    <div className="space-y-5">

      {/* ── Timeline ── */}
      <div className="overflow-x-auto">
        <div className="flex items-start min-w-max gap-0 pt-4 pb-3">
          {STEPS.map((step, idx) => {
            const isDone    = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const dateStr   = stepDates?.[step.status];

            return (
              <div key={step.status} className="flex items-start">

                {/* Step node */}
                <div className="flex flex-col items-center gap-1.5 w-[90px]">

                  {/* Circle + pulse rings */}
                  <div className="relative w-[56px] h-[56px] shrink-0">

                    {isCurrent && (
                      <span
                        className="absolute rounded-full border border-amber-400/25 animate-pulse"
                        style={{ inset: '-12px', animationDuration: '2s', animationDelay: '0.4s' }}
                      />
                    )}

                    {isCurrent && (
                      <span
                        className="absolute rounded-full border-2 border-amber-400/55 animate-pulse"
                        style={{ inset: '-6px', animationDuration: '2s' }}
                      />
                    )}

                    <div className={`absolute inset-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                        : isCurrent
                          ? 'bg-amber-400 border-amber-300 text-zinc-950 shadow-[0_0_28px_rgba(251,191,36,0.75)]'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                    }`}>
                      {isDone ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        step.icon
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <span className={`text-xs text-center leading-tight px-1 transition-colors duration-300 ${
                    isDone    ? 'text-emerald-400 font-semibold' :
                    isCurrent ? 'text-amber-400 font-black' :
                                'text-zinc-400 font-medium'
                  }`}>
                    {step.short}
                  </span>

                  {/* Timestamp */}
                  {dateStr && (isDone || isCurrent) && (
                    <span className={`text-[9px] text-center leading-tight tabular-nums ${
                      isDone ? 'text-emerald-400/60' : 'text-amber-300/80'
                    }`}>
                      {fmtStepDate(dateStr, isCurrent)}
                    </span>
                  )}
                </div>

                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <div className="flex items-center mt-[40px] shrink-0">
                    <div className={`h-px w-6 transition-colors duration-500 ${
                      isDone ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`} />
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke={isDone ? '#34d399' : '#52525b'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="-ml-px transition-all duration-500"
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

      {/* ── Botões (admin / non-readonly) ── */}
      {!readonly && (nextStatus || onCancel) && (
        confirming ? (
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
          <div className="flex gap-2 flex-wrap items-center">
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
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar reserva
            </button>
            <button
              onClick={onContract}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white border border-zinc-700 hover:bg-zinc-800/60 active:scale-95 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Ver contrato
            </button>
            {status !== 'devolucao_pendente' && status !== 'concluida' && onCancel && (
              <button
                onClick={() => setConfirming('cancel')}
                className="ml-auto px-4 py-2 rounded-lg text-xs font-semibold bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 active:scale-95 transition-all"
              >
                Cancelar aluguer
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
