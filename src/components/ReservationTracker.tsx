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

// Mensagens por estado — orientadas ao admin
const ADMIN_MSG: Partial<Record<ReservationStatus, { title: string; body: string; variant: 'warning' | 'info' | 'success' | 'danger' }>> = {
  pendente: {
    title: 'Aguarda Confirmação',
    body: 'Valide o pagamento do depósito e confirme a reserva para avançar para a próxima etapa.',
    variant: 'warning',
  },
  confirmada: {
    title: 'Viatura em Preparação',
    body: 'Prepare a viatura para entrega: vistoria de saída, combustível e documentação. Quando pronta, marque como entregue.',
    variant: 'info',
  },
  pronta_levantamento: {
    title: 'Aguarda Levantamento pelo Cliente',
    body: 'O cliente foi notificado. Confirme a entrega das chaves e registe a vistoria de saída antes de iniciar o aluguer.',
    variant: 'info',
  },
  ativa: {
    title: 'Aluguer em Curso — Monitorize',
    body: 'Viatura em uso. Verifique a data de devolução prevista e contacte o cliente se o prazo se aproximar sem retorno.',
    variant: 'info',
  },
  devolucao_pendente: {
    title: 'Devolução Pendente — Acção Necessária',
    body: 'O cliente devolveu a viatura. Realize a vistoria de regresso, registe eventuais danos e conclua a reserva.',
    variant: 'warning',
  },
  concluida: {
    title: 'Reserva Concluída',
    body: 'Aluguer encerrado com sucesso. Pagamento e vistoria final processados.',
    variant: 'success',
  },
  cancelada: {
    title: 'Reserva Cancelada',
    body: 'Esta reserva foi cancelada. Verifique o estado do pagamento e processe o reembolso se aplicável.',
    variant: 'danger',
  },
};

// Mensagens por estado — visíveis ao cliente
const CLIENT_MSG: Partial<Record<ReservationStatus, { title: string; body: string }>> = {
  pendente: {
    title: 'Reserva recebida com sucesso',
    body: 'Estamos a processar a sua solicitação. Em breve receberá a confirmação após validação do pagamento.',
  },
  confirmada: {
    title: 'Reserva Confirmada',
    body: 'O seu pagamento inicial foi registado. A viatura está a ser preparada para o levantamento.',
  },
  pronta_levantamento: {
    title: 'Viatura Pronta para Levantamento',
    body: 'A sua viatura encontra-se disponível nas nossas instalações. Dirija-se à receção com o seu documento de identificação.',
  },
  ativa: {
    title: 'Aluguer em Curso',
    body: 'A viatura está activa e a ser utilizada. Desfrute da viagem com segurança. Em caso de emergência, contacte-nos.',
  },
  devolucao_pendente: {
    title: 'Devolução Solicitada',
    body: 'Estamos a aguardar a devolução da viatura. Por favor dirija-se às instalações até à data acordada.',
  },
  concluida: {
    title: 'Aluguer Concluído',
    body: 'Obrigado por escolher a SOS Motors! O seu aluguer foi concluído com sucesso. Esperamos vê-lo novamente em breve.',
  },
  cancelada: {
    title: 'Reserva Cancelada',
    body: 'A sua reserva foi cancelada. Para mais informações contacte a nossa equipa.',
  },
};

interface Props {
  status: ReservationStatus;
  onAdvance?: (next: ReservationStatus) => void;
  onCancel?: (motivo: string) => void;
  onEdit?: () => void;
  onContract?: () => void;
  readonly?: boolean;
  clientView?: boolean;
  stepDates?: Partial<Record<ReservationStatus, string>>;
}

export function ReservationTracker({ status, onAdvance, onCancel, onEdit, onContract, readonly, clientView, stepDates }: Props) {
  const [confirming, setConfirming] = useState<'advance' | 'cancel' | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const currentIdx     = STEPS.findIndex(s => s.status === status);
  const nextStatus     = NEXT_STATUS[status];
  const nextLabel      = NEXT_LABEL[status];
  const nextStateLabel = NEXT_STATE_LABEL[status];

  if (currentIdx === -1) return null;

  const handleConfirm = () => {
    if (confirming === 'advance' && nextStatus && onAdvance) {
      onAdvance(nextStatus);
    } else if (confirming === 'cancel' && onCancel) {
      onCancel(cancelMotivo.trim());
    }
    setConfirming(null);
    setCancelMotivo('');
  };

  return (
    <div className="space-y-3">

      {/* ── Timeline ── */}
      <div className="overflow-x-auto">
        <div className="flex items-start min-w-max gap-0 pt-2 pb-1">
          {STEPS.map((step, idx) => {
            const isDone    = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const dateStr   = stepDates?.[step.status];

            return (
              <div key={step.status} className="flex items-start">

                {/* Step node */}
                <div className="flex flex-col items-center gap-1 w-[82px]">

                  {/* Circle + pulse rings */}
                  <div className="relative w-[48px] h-[48px] shrink-0">

                    {isCurrent && (
                      <span
                        className="absolute rounded-full border border-amber-400/25 animate-pulse"
                        style={{ inset: '-8px', animationDuration: '2s', animationDelay: '0.4s' }}
                      />
                    )}

                    {isCurrent && (
                      <span
                        className="absolute rounded-full border-2 border-amber-400/55 animate-pulse"
                        style={{ inset: '-4px', animationDuration: '2s' }}
                      />
                    )}

                    <div className={`absolute inset-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isDone
                        ? clientView
                          ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                          : 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                        : isCurrent
                          ? 'bg-amber-400 border-amber-300 text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.65)]'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                    }`}>
                      {isDone ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="[&_svg]:w-[15px] [&_svg]:h-[15px]">{step.icon}</span>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <span className={`text-xs text-center leading-tight px-0.5 transition-colors duration-300 ${
                    isDone
                      ? clientView ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'
                      : isCurrent
                        ? 'text-amber-400 font-black'
                        : 'text-zinc-500 font-medium'
                  }`}>
                    {step.short}
                  </span>

                  {/* Timestamp */}
                  {dateStr && (isDone || isCurrent) && (
                    <span className={`text-[10px] text-center leading-tight tabular-nums ${
                      isDone
                        ? clientView ? 'text-amber-400/60' : 'text-emerald-400/60'
                        : 'text-amber-300/80'
                    }`}>
                      {fmtStepDate(dateStr, isCurrent)}
                    </span>
                  )}
                </div>

                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <div className="flex items-center mt-[33px] shrink-0">
                    <div className={`h-px w-4 transition-colors duration-500 ${
                      isDone
                        ? clientView ? 'bg-amber-400' : 'bg-emerald-400'
                        : 'bg-zinc-600'
                    }`} />
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke={isDone ? (clientView ? '#fbbf24' : '#34d399') : '#52525b'}
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

      {/* ── Cartão de estado — vista admin ── */}
      {!clientView && (() => {
        const msg = ADMIN_MSG[status];
        if (!msg) return null;

        const variantCfg = {
          warning: { border: 'border-amber-500/40', bar: 'bg-amber-500',    icon: 'bg-zinc-900 border-2 border-amber-500 text-amber-400',       title: 'text-amber-300',   body: 'text-zinc-300', dot: 'bg-amber-400' },
          info:    { border: 'border-zinc-600/60',  bar: 'bg-zinc-500',     icon: 'bg-zinc-900 border-2 border-zinc-500 text-zinc-300',         title: 'text-white',       body: 'text-zinc-300', dot: null },
          success: { border: 'border-emerald-500/40', bar: 'bg-emerald-500', icon: 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400', title: 'text-emerald-300', body: 'text-zinc-300', dot: null },
          danger:  { border: 'border-red-500/40',   bar: 'bg-red-500',      icon: 'bg-zinc-900 border-2 border-red-500/60 text-red-400',        title: 'text-red-300',     body: 'text-red-200/70', dot: null },
        }[msg.variant];

        const currentStep = STEPS.find(s => s.status === status);

        return (
          <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${variantCfg.border}`}>
            <div className={`h-0.5 w-full ${variantCfg.bar} opacity-60`} />
            <div className="px-3 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4 ${variantCfg.icon}`}>
                {currentStep?.icon ?? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black leading-snug ${variantCfg.title}`}>{msg.title}</p>
                <p className={`text-[11px] leading-relaxed mt-0.5 ${variantCfg.body}`}>{msg.body}</p>
              </div>
              {(msg.variant === 'warning') && (
                <div className="shrink-0 relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-amber-400 flex" />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Cartão de estado — só na vista de cliente ── */}
      {clientView && (() => {
        const msg = CLIENT_MSG[status];
        if (!msg) return null;
        const isCancelled = status === 'cancelada';
        const isDone      = status === 'concluida';
        const currentStep = STEPS.find(s => s.status === status);

        const cardBorder = isCancelled ? 'border-red-500/40' : 'border-amber-500/40';
        const iconRing   = isCancelled
          ? 'bg-zinc-900 border-2 border-red-500/60 text-red-400'
          : isDone
            ? 'bg-amber-500 border-2 border-amber-400 text-zinc-950 shadow-lg shadow-amber-500/40'
            : 'bg-zinc-900 border-2 border-amber-500 text-amber-400';
        const titleCls   = isCancelled ? 'text-red-300' : 'text-white';
        const bodyCls    = isCancelled ? 'text-red-200/70' : 'text-white';

        return (
          <div className={`bg-zinc-900 border rounded-2xl px-6 py-5 flex items-center gap-5 ${cardBorder}`}>
            {/* Ícone */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-7 [&_svg]:h-7 ${iconRing}`}>
              {currentStep?.icon ?? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              )}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className={`text-lg font-black leading-snug ${titleCls}`}>
                {msg.title}
              </p>
              <p className={`text-sm leading-relaxed mt-1.5 ${bodyCls}`}>
                {msg.body}
              </p>
            </div>

            {/* Ponto animado — estados activos */}
            {!isCancelled && !isDone && (
              <div className="shrink-0 relative w-3 h-3">
                <span className="absolute inset-0 rounded-full bg-amber-400/50 animate-ping" />
                <span className="relative w-3 h-3 rounded-full bg-amber-400 flex" />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Botões (admin / non-readonly) ── */}
      {!readonly && (nextStatus || onCancel || onEdit || onContract) && (
        confirming === 'advance' ? (
          <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
            <span className="text-xs text-white font-semibold flex-1">{nextLabel} — Tem a certeza?</span>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-all active:scale-95"
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
        ) : confirming === 'cancel' ? (
          <div className="bg-zinc-800/60 border border-red-500/20 rounded-xl px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-white">Cancelar esta reserva — indique o motivo:</p>
            <textarea
              value={cancelMotivo}
              onChange={e => setCancelMotivo(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirming(null); setCancelMotivo(''); }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-700 text-white hover:bg-zinc-600 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!cancelMotivo.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-500 text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Botão primário — avança estado */}
            {nextStatus && nextLabel && onAdvance && (
              <button
                onClick={() => setConfirming('advance')}
                title={nextStateLabel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-95 transition-all shadow-sm shadow-amber-400/20"
              >
                Gerir
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Menu de acções secundárias */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                  menuOpen
                    ? 'bg-zinc-700 border-zinc-600 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-600'
                }`}
                aria-label="Mais opções"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-20 min-w-[190px] overflow-hidden py-1.5">
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(); setMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-zinc-800 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/50">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Editar reserva
                      </button>
                    )}
                    {onContract && (
                      <button
                        onClick={() => { onContract(); setMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-zinc-800 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/50">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Ver contrato
                      </button>
                    )}
                    {status !== 'devolucao_pendente' && status !== 'concluida' && onCancel && (
                      <>
                        <div className="mx-3 my-1 h-px bg-zinc-700/60" />
                        <button
                          onClick={() => { setConfirming('cancel'); setMenuOpen(false); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                          Cancelar aluguer
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
