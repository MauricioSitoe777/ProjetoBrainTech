import React, { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { useReservations } from '../context/ReservationsContext';
import type { Prestacao, Reservation, ReservationStatus } from '../types/reservation';
import { RegistarPagamentoModal } from '../components/reservations/RegistarPagamentoModal';


const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente:            { label: 'Aguarda Pagamento',      className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  ativa:               { label: 'Aluguer Activo',         className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
};

const FLOW_STEPS = [
  { key: 'pendente',        label: 'Ag. Pagamento' },
  { key: 'compra_aprovada', label: 'Aprovada'  },
  { key: 'entrada_paga',    label: 'Entrada'   },
  { key: 'em_prestacao',    label: 'Prestação' },
  { key: 'liquidada',       label: 'Liquidada' },
] as const;

function stepIndex(status: ReservationStatus) {
  if (status === 'prestacao_atraso') return 3;
  return FLOW_STEPS.findIndex(s => s.key === status);
}

const fmt     = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const compraVehicles = VEHICLES.filter(v => v.mode === 'compra');
const compraIds      = new Set(compraVehicles.map(v => v.id));
const vehicleName    = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
const isFinal        = (s: ReservationStatus) => s === 'cancelada' || s === 'liquidada';

// ── Modal de gestão de prestações ────────────────────────────────────────────
function PrestacoeModal({
  r, today, onClose, onToggle, onOpenPagar, isBlocked,
}: {
  r: Reservation;
  today: string;
  onClose: () => void;
  onToggle: (numero: number, paga: boolean, valorPago?: number) => void;
  onOpenPagar: (prestacao: Prestacao) => void;
  isBlocked: boolean;
}) {
  const prestacoes    = r.prestacoes ?? [];
  const pagas         = prestacoes.filter(p => p.paga).length;
  const total         = prestacoes.length;
  const pct           = total > 0 ? Math.round((pagas / total) * 100) : 0;
  const isAtraso      = r.status === 'prestacao_atraso';
  const allPaid       = pagas >= total && total > 0;
  const proximaNumero = prestacoes.find(p => !p.paga)?.numero ?? null;

  // Custom amount state for the next installment
  const proximaPrestacao = prestacoes.find(p => p.numero === proximaNumero);
  const [valorCustom, setValorCustom] = React.useState<string>(
    proximaPrestacao ? String(proximaPrestacao.valor) : ''
  );
  // Sync when modal opens with a different reservation or after recalc
  React.useEffect(() => {
    if (proximaPrestacao) setValorCustom(String(proximaPrestacao.valor));
  }, [proximaNumero, proximaPrestacao?.valor]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Cabeçalho do modal */}
        <div className={`px-6 py-4 border-b border-zinc-800 flex items-start justify-between gap-4 rounded-t-2xl ${isAtraso ? 'bg-red-500/5' : ''}`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-black text-base">{r.clientName}</p>
              <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${STATUS_CFG[r.status].className}`}>
                {STATUS_CFG[r.status].label}
              </span>
              {isAtraso && (
                <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                  ⚠ ATRASO
                </span>
              )}
            </div>
            <p className="text-white text-xs mt-0.5">{vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white transition-all shrink-0 text-lg font-black">
            ×
          </button>
        </div>

        {/* Barra de progresso global */}
        <div className={`px-6 py-3 border-b border-zinc-800 flex items-center gap-4 ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <span className={`text-2xl font-black tabular-nums ${isAtraso ? 'text-red-400' : allPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pagas}<span className="text-sm text-white font-bold">/{total}</span>
          </span>
          <div className="flex-1">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${isAtraso ? 'bg-red-500' : allPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white">
              <span>{pct}% concluído</span>
              {allPaid
                ? <span className="text-emerald-400 font-semibold">✓ Todas as prestações pagas</span>
                : <span>{total - pagas} prestação{total - pagas !== 1 ? 'ões' : ''} em falta</span>
              }
            </div>
          </div>
        </div>

        {/* Lista de prestações — scrollável */}
        <div className="overflow-y-auto flex-1">
          <div className="divide-y divide-zinc-800/60">
            {prestacoes.map(p => {
              const isOverdue = !p.paga && p.dataVencimento < today;
              const isProxima = p.numero === proximaNumero;
              const isFutura  = !p.paga && !isProxima;
              return (
                <div key={p.numero}
                  className={`px-6 py-3 flex items-center gap-3 transition-colors ${
                    p.paga                   ? 'bg-emerald-500/3'
                    : isProxima && isOverdue ? 'bg-red-500/5'
                    : isProxima              ? 'bg-amber-500/3'
                    : ''
                  }`}
                >
                  {/* Número */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                    p.paga                   ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/15 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-800/60 text-white border-zinc-700/50'
                  }`}>
                    {p.paga ? '✓' : p.numero}
                  </span>

                  {/* Data vencimento */}
                  <span className={`text-xs tabular-nums w-28 shrink-0 ${
                    p.paga                   ? 'text-white line-through'
                    : isProxima && isOverdue ? 'text-red-400 font-semibold'
                    : isProxima              ? 'text-zinc-200 font-semibold'
                    : 'text-white'
                  }`}>
                    {fmtDate(p.dataVencimento)}
                  </span>

                  {/* Valor */}
                  <span className={`text-sm font-bold tabular-nums flex-1 ${
                    p.paga ? 'text-white' : isProxima ? (isOverdue ? 'text-red-300' : 'text-white') : 'text-white'
                  }`}>
                    {fmt(p.valor)}
                  </span>

                  {/* Badge estado */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                    p.paga                   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-900 text-white border-zinc-800'
                  }`}>
                    {p.paga
                      ? (p.dataPagamento ? fmtDate(p.dataPagamento) : 'Paga')
                      : isProxima && isOverdue ? '⚠ Em Atraso'
                      : isProxima ? 'A receber'
                      : `Prestação ${p.numero}`}
                  </span>

                  {/* Botão / input acção */}
                  <div className="shrink-0 flex justify-end items-center gap-2">
                    {p.paga && !isFinal(r.status) && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {p.valorPago && p.valorPago !== p.valor
                          ? <span title={`Valor acordado: ${fmt(p.valor)}`}>{fmt(p.valorPago)}</span>
                          : 'Pago'}
                      </span>
                    )}
                    {isProxima && !isFinal(r.status) && (() => {
                      const custom = parseInt(valorCustom.replace(/\D/g, ''), 10) || 0;
                      const isAbove = custom > p.valor;
                      const unpaidAfter = prestacoes.filter(q => !q.paga && q.numero !== p.numero);
                      const novasPrestacoes = unpaidAfter.length > 0
                        ? Math.round(Math.max(0, unpaidAfter.reduce((s, q) => s + q.valor, 0) - Math.max(0, custom - p.valor)) / unpaidAfter.length)
                        : 0;
                      return (
                        <div className="flex flex-col gap-1 items-end">
                          {/* Input de valor personalizado */}
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={valorCustom.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              onChange={e => setValorCustom(e.target.value.replace(/\D/g, ''))}
                              className="w-28 text-xs text-right bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded-lg px-2 py-1 text-white outline-none tabular-nums font-bold"
                            />
                            <span className="text-[10px] text-white font-semibold">MT</span>
                          </div>
                          {/* Preview de recálculo */}
                          {isAbove && unpaidAfter.length > 0 && (
                            <p className="text-[9px] text-amber-400 font-semibold text-right leading-tight">
                              Próximas: {fmt(novasPrestacoes)}/mês
                            </p>
                          )}
                          {/* Botão Receber */}
                          <button
                            disabled={isBlocked || custom <= 0}
                            onClick={() => {
                              onOpenPagar({ ...p, valor: custom });
                              setValorCustom('');
                            }}
                            className={`text-xs px-3 py-1 rounded-lg font-black transition-all disabled:opacity-40 ${
                              isOverdue
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                            }`}>
                            {isOverdue ? '⚠ Receber' : '✓ Receber'}
                          </button>
                        </div>
                      );
                    })()}
                    {isFutura && (
                      <span className="text-xs text-zinc-700 px-3 py-1">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Registo de Pagamentos ── */}
        {(() => {
          const FORMA_MAP: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros' };
          const pagos = prestacoes.filter(p => p.paga && (p.formaPagamento || p.referenciaPagamento || p.notasPagamento || p.dataPagamento));
          if (pagos.length === 0) return null;
          return (
            <div className="px-6 py-4 border-t border-zinc-800 space-y-2">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Registo de Pagamentos</p>
              {pagos.map(p => (
                <div key={p.numero} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black text-white">{p.numero}ª Prestação</span>
                      <span className="text-sm font-black text-emerald-400 tabular-nums">{fmt(p.valorPago ?? p.valor)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white">
                      {p.dataPagamento && <span>{p.dataPagamento}{p.horaPagamento ? ` · ${p.horaPagamento}` : ''}</span>}
                      {p.formaPagamento && <span className="font-bold text-amber-400">{FORMA_MAP[p.formaPagamento] ?? p.formaPagamento}</span>}
                      {p.referenciaPagamento && <span className="font-mono text-white/70">Ref: {p.referenciaPagamento}</span>}
                    </div>
                    {p.notasPagamento && <p className="text-[11px] text-white/60 italic mt-1">{p.notasPagamento}</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Rodapé com resumo financeiro + fechar */}
        <div className={`px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-4 rounded-b-2xl ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <div className="flex gap-6 text-xs">
            <span className="text-white">
              Pago: <span className="text-emerald-400 font-black">
                {fmt(prestacoes.filter(p => p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
            <span className="text-white">
              Restante: <span className={`font-black ${isAtraso ? 'text-red-400' : 'text-amber-400'}`}>
                {fmt(prestacoes.filter(p => !p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
          </div>
          <button onClick={onClose}
            className="text-sm px-5 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 font-semibold transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = 'compras' | 'acoes';

// ── Página principal ──────────────────────────────────────────────────────────
export function CompraPage({ onExit }: { onExit?: () => void }) {
  const { reservations, updateReservation, cancelReservation, gerarPrestacoes, marcarPrestacao } = useReservations();

  const getUrlParams = () => new URLSearchParams(window.location.search);

  const [tab,            setTab]           = useState<Tab>(() =>
    getUrlParams().get('tab') === 'acoes' ? 'acoes' : 'compras'
  );
  const [highlightStatus, setHighlightStatus] = useState<string | null>(() =>
    getUrlParams().get('status')
  );
  const [selectedVehicle,  setSelectedVehicle]  = useState<number | null>(null);
  const [updating,         setUpdating]         = useState<string | null>(null);
  const [modalAberto,      setModalAberto]      = useState<string | null>(null);
  const [gerarConfig,      setGerarConfig]      = useState<{ id: string; semEntrada: boolean } | null>(null);
  const [gerarData,        setGerarData]        = useState('');
  const [gerarNum,         setGerarNum]         = useState(12);
  const [cancelConfirmId,  setCancelConfirmId]  = useState<string | null>(null);
  const [cancelMotivo,     setCancelMotivo]     = useState('');
  const [pagamentoModal,   setPagamentoModal]   = useState<{ reservationId: string; prestacao: Prestacao } | null>(null);

  // Sync tab + status with URL on navigation
  React.useEffect(() => {
    const sync = () => {
      const p = getUrlParams();
      const t = p.get('tab');
      setTab(t === 'acoes' ? 'acoes' : 'compras');
      setHighlightStatus(p.get('status'));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Scroll to first card of the highlighted status
  React.useEffect(() => {
    if (tab !== 'acoes' || !highlightStatus) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`compra-status-${highlightStatus}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [tab, highlightStatus]);

  const today = new Date().toISOString().split('T')[0];

  const advance = (id: string, toStatus: ReservationStatus) => {
    if (updating === id) return;
    setUpdating(id);
    updateReservation(id, { status: toStatus });
    setTimeout(() => setUpdating(null), 800);
  };

  const openGerarConfig = (id: string, semEntrada: boolean) => {
    const r = reservations.find(res => res.id === id);
    const n = r?.totalPrestacoes && r.totalPrestacoes > 0 ? r.totalPrestacoes : 12;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    setGerarData(nextMonth.toISOString().split('T')[0]);
    setGerarNum(n);
    setGerarConfig({ id, semEntrada });
  };

  const confirmarGerar = () => {
    if (!gerarConfig || updating === gerarConfig.id) return;
    const { id, semEntrada } = gerarConfig;
    setUpdating(id);
    gerarPrestacoes(id, semEntrada, gerarData || undefined, gerarNum);
    setGerarConfig(null);
    setTimeout(() => {
      setUpdating(null);
      setModalAberto(id);
    }, 600);
  };

  const togglePrestacao = (reservationId: string, numero: number, paga: boolean, valorPago?: number) => {
    if (updating === reservationId) return;
    setUpdating(reservationId);
    marcarPrestacao(reservationId, numero, paga, valorPago);
    setTimeout(() => setUpdating(null), 600);
  };

  const compraReservations = useMemo(() =>
    reservations
      .filter(r => compraIds.has(r.vehicleId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reservations]);

  const kpis = useMemo(() => {
    const volume = compraReservations.filter(r => r.status !== 'cancelada').reduce((s, r) => s + r.valorTotal, 0);
    return {
      pendentes:   compraReservations.filter(r => r.status === 'pendente').length,
      emPrestacao: compraReservations.filter(r => r.status === 'em_prestacao').length,
      emAtraso:    compraReservations.filter(r => r.status === 'prestacao_atraso').length,
      liquidadas:  compraReservations.filter(r => r.status === 'liquidada').length,
      canceladas:  compraReservations.filter(r => r.status === 'cancelada').length,
      volume,
    };
  }, [compraReservations]);

  // Histórico: apenas liquidadas e canceladas
  const historico = useMemo(() =>
    compraReservations
      .filter(r => r.status === 'liquidada' || r.status === 'cancelada')
      .filter(r => selectedVehicle === null || r.vehicleId === selectedVehicle)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [compraReservations, selectedVehicle]);

  const modalReservation = modalAberto ? reservations.find(r => r.id === modalAberto) : null;

  return (
    <div className="bg-zinc-950 text-white">
      {/* Modal de gestão de prestações */}
      {modalReservation && (
        <PrestacoeModal
          r={modalReservation}
          today={today}
          onClose={() => setModalAberto(null)}
          onToggle={(numero, paga, valorPago) => togglePrestacao(modalReservation.id, numero, paga, valorPago)}
          onOpenPagar={p => setPagamentoModal({ reservationId: modalReservation.id, prestacao: p })}
          isBlocked={updating === modalReservation.id}
        />
      )}
      {pagamentoModal && (
        <RegistarPagamentoModal
          reservationId={pagamentoModal.reservationId}
          prestacao={pagamentoModal.prestacao}
          onAfterSave={() => setPagamentoModal(null)}
          onClose={() => setPagamentoModal(null)}
        />
      )}

      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Pendentes',           value: kpis.pendentes,   color: 'text-amber-400',   dot: 'bg-amber-400',   hl: false },
            { label: 'Em Prestação',        value: kpis.emPrestacao, color: 'text-amber-400',   dot: 'bg-amber-400',   hl: false },
            { label: 'Prestação em Atraso', value: kpis.emAtraso,    color: 'text-red-400',     dot: 'bg-red-500',     hl: kpis.emAtraso > 0 },
            { label: 'Liquidadas',          value: kpis.liquidadas,  color: 'text-emerald-400', dot: 'bg-emerald-400', hl: false },
            { label: 'Canceladas',          value: kpis.canceladas,  color: 'text-white',       dot: 'bg-zinc-500',    hl: false },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl overflow-hidden ${k.hl ? 'border border-red-500/40 bg-red-500/5' : 'bg-zinc-900 border border-amber-500/20'}`}>
              {!k.hl && <div className="h-0.5 w-full bg-amber-500/40" />}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                  <span className="text-xs text-amber-400 uppercase font-bold tracking-wide leading-tight">{k.label}</span>
                </div>
                <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Volume */}
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-white font-bold uppercase tracking-wider">Volume Total de Vendas</span>
          <span className="text-2xl font-black text-amber-400">{fmt(kpis.volume)}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {(() => {
            const acoesCount = compraReservations.filter(r => r.status !== 'cancelada' && r.status !== 'liquidada').length;
            const acoesUrgente = kpis.pendentes > 0 || kpis.emAtraso > 0;
            return ([
              { key: 'compras', label: `Histórico (${historico.length})`,  urgent: false },
              { key: 'acoes',   label: `Ações (${acoesCount})`,            urgent: acoesUrgente },
            ] as { key: Tab; label: string; urgent: boolean }[]);
          })().map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : t.urgent
                  ? 'border-transparent text-red-400 animate-pulse hover:text-red-300'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
              {t.urgent && tab !== t.key && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: Compras */}
        {tab === 'compras' && <>

        {/* Filtro por viatura */}
        <div className="flex flex-wrap gap-3">
          <select value={selectedVehicle ?? ''} onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">Todas as viaturas</option>
            {compraVehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Histórico de contratos */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Histórico de Contratos</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/40">
                <th className="text-left px-5 py-4 text-xs text-white/40 font-black uppercase tracking-widest w-10">#</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Cliente</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden md:table-cell">Viatura</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden sm:table-cell">Valor Total</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Data</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {historico.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white text-sm">
                    Sem contratos concluídos ainda
                  </td>
                </tr>
              )}
              {historico.map((r, idx) => {
                const st = STATUS_CFG[r.status];
                const prestacoes = r.prestacoes ?? [];
                const pagas = prestacoes.filter(p => p.paga).length;
                const total = prestacoes.length || (r.totalPrestacoes ?? 0);
                return (
                  <tr key={r.id} className={`hover:bg-zinc-800/40 transition-colors ${idx % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                    <td className="px-5 py-4 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-white">{r.clientName}</p>
                      <p className="text-xs text-white">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-sm text-white">
                      {vehicleName(r.vehicleId)}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm font-bold text-amber-400">{fmt(r.valorTotal)}</p>
                      {total > 0 && (
                        <p className="text-xs text-white">{pagas}/{total} prestações</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white tabular-nums">{r.dataInicio}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {historico.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800 text-xs text-white">
              {historico.length} contrato(s) no histórico
            </div>
          )}
        </div>

        </> }

        {/* TAB: Ações */}
        {tab === 'acoes' && (() => {
          const accionaveis = compraReservations
            .filter(r => r.status !== 'cancelada' && r.status !== 'liquidada')
            .sort((a, b) => {
              const urgencia: Partial<Record<ReservationStatus, number>> = {
                prestacao_atraso: 0, em_prestacao: 1, entrada_paga: 2, compra_aprovada: 3, pendente: 4,
              };
              return (urgencia[a.status] ?? 9) - (urgencia[b.status] ?? 9);
            });

          const seenStatuses = new Set<string>();
          return (
            <div className="space-y-4">
              {accionaveis.length === 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl py-12 text-center text-white text-sm">
                  Sem compras com ações pendentes
                </div>
              )}
              {accionaveis.map(r => {
                const st              = STATUS_CFG[r.status];
                const si              = stepIndex(r.status);
                const prestacoes      = r.prestacoes ?? [];
                const pagas           = prestacoes.filter(p => p.paga).length;
                const total           = prestacoes.length;
                const allPaid         = total > 0 && pagas >= total;
                const hasOverdue      = prestacoes.some(p => !p.paga && p.dataVencimento < today);
                const isAtraso        = r.status === 'prestacao_atraso';
                const isBlocked       = updating === r.id;
                const isHighlighted   = highlightStatus === r.status;
                const isFirstOfStatus = !seenStatuses.has(r.status);
                if (isFirstOfStatus) seenStatuses.add(r.status);

                return (
                  <div
                    key={r.id}
                    id={isFirstOfStatus ? `compra-status-${r.status}` : undefined}
                    className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
                      isAtraso      ? 'border-red-500/30' :
                      isHighlighted ? 'border-amber-400/50 ring-1 ring-amber-400/20' :
                      gerarConfig?.id === r.id ? 'border-amber-500/40' :
                      'border-zinc-800'
                    }`}
                  >
                    {/* ── Cabeçalho ── */}
                    <div className={`px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-zinc-800/60 ${isAtraso ? 'bg-red-500/5' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{r.clientName}</p>
                          <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                          {isAtraso && (
                            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md animate-pulse">⚠ ATRASO</span>
                          )}
                        </div>
                        <p className="text-xs text-white mt-0.5">
                          {vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}
                          {total > 0 && ` · ${pagas}/${total} prestações`}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/30 font-mono shrink-0">#{r.id.slice(0,8).toUpperCase()}</span>
                    </div>

                    {/* ── Progress tracker ── */}
                    <div className="px-5 py-4 border-b border-zinc-800/60">
                      <div className="flex items-start">
                        {FLOW_STEPS.map((step, i) => {
                          const done   = si > i;
                          const active = si === i;
                          return (
                            <React.Fragment key={step.key}>
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                  done   ? 'bg-amber-500 border-amber-500 text-zinc-950' :
                                  active ? 'border-amber-400 bg-zinc-800 text-amber-400' :
                                           'border-zinc-700 bg-zinc-800/60 text-white'
                                }`}>
                                  {done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    : <span className="text-[9px] font-black">{i + 1}</span>
                                  }
                                </div>
                                <span className={`text-[9px] mt-1 font-semibold text-center leading-tight max-w-[50px] ${
                                  done ? 'text-amber-400' : active ? 'text-amber-300' : 'text-white'
                                }`}>{step.label}</span>
                              </div>
                              {i < FLOW_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mt-3.5 transition-all ${done ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Botões de acção com ícones ── */}
                    <div className="px-5 py-3 flex flex-wrap items-center gap-2">

                      {/* 1. Aprovar */}
                      {r.status === 'pendente' && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'compra_aprovada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Aprovar
                        </button>
                      )}

                      {/* 2. Definir Plano (determina entrada automaticamente pelo valor do depósito do simulador) */}
                      {r.status === 'compra_aprovada' && (
                        <button disabled={isBlocked} onClick={() => {
                          const temEntrada = (r.deposito ?? 0) > 0;
                          if (temEntrada) advance(r.id, 'entrada_paga');
                          openGerarConfig(r.id, !temEntrada);
                        }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Definir Plano
                        </button>
                      )}

                      {/* 4. Definir Plano */}
                      {r.status === 'entrada_paga' && gerarConfig?.id !== r.id && (
                        <button disabled={isBlocked} onClick={() => openGerarConfig(r.id, false)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Definir Plano
                        </button>
                      )}

                      {/* Liquidar (quando todas pagas) */}
                      {allPaid && (r.status === 'em_prestacao' || r.status === 'prestacao_atraso') && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'liquidada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Liquidar Contrato
                        </button>
                      )}

                      {/* Gerir Prestações */}
                      {(r.status === 'em_prestacao' || r.status === 'prestacao_atraso') && (
                        <button onClick={() => setModalAberto(r.id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                            isAtraso
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                          Gerir Prestações
                        </button>
                      )}

                      {/* Regularizar (atraso) */}
                      {isAtraso && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'em_prestacao')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                          Regularizar
                        </button>
                      )}

                      {/* Cancelar — sempre no fim, destacado */}
                      {cancelConfirmId !== r.id && (
                        <button disabled={isBlocked} onClick={() => { setCancelConfirmId(r.id); setCancelMotivo(''); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-zinc-800 text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 transition-all ml-auto">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Cancelar
                        </button>
                      )}
                    </div>

                    {/* ── Painel de confirmação de cancelamento ── */}
                    {cancelConfirmId === r.id && (
                      <div className="border-t border-red-500/20 px-5 py-4 space-y-3 bg-red-500/5">
                        <p className="text-xs font-semibold text-white">Cancelar esta compra — indique o motivo:</p>
                        <textarea
                          value={cancelMotivo}
                          onChange={e => setCancelMotivo(e.target.value)}
                          placeholder="Descreva o motivo do cancelamento..."
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setCancelConfirmId(null); setCancelMotivo(''); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all"
                          >
                            Voltar
                          </button>
                          <button
                            disabled={!cancelMotivo.trim() || isBlocked}
                            onClick={() => {
                              cancelReservation(r.id, cancelMotivo.trim());
                              setCancelConfirmId(null);
                              setCancelMotivo('');
                            }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-red-500 text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Confirmar Cancelamento
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Painel de configuração do plano ── */}
                    {gerarConfig?.id === r.id && (() => {
                      const startD = gerarData ? new Date(gerarData + 'T00:00:00') : null;
                      const preview = startD
                        ? Array.from({ length: Math.min(3, gerarNum) }, (_, i) => {
                            const d = new Date(startD.getFullYear(), startD.getMonth() + i, startD.getDate());
                            return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                          })
                        : [];
                      const entradaPaga = gerarConfig.semEntrada ? 0 : (r.deposito ?? 0);
                      const restante = Math.max(0, r.valorTotal - entradaPaga);
                      const valorPrest = gerarNum > 0 ? Math.round(restante / gerarNum) : 0;

                      return (
                        <div className="border-t border-amber-500/20 px-5 py-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Configurar Plano de Prestações</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-white font-bold block mb-1">Data da 1ª Prestação</label>
                              <input type="date" value={gerarData} min={today}
                                onChange={e => setGerarData(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 text-white rounded-lg px-3 py-2 text-xs outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-white font-bold block mb-1">Nº de Prestações</label>
                              <input type="number" min={1} max={60} value={gerarNum}
                                onChange={e => setGerarNum(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 text-white rounded-lg px-3 py-2 text-xs outline-none" />
                            </div>
                          </div>

                          <div className="bg-zinc-800/50 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs">
                            <span className="text-white">Prestação: <span className="text-amber-400 font-black">{fmt(valorPrest)}</span></span>
                            {gerarConfig.semEntrada && <span className="text-amber-400 font-bold">· Sem entrada</span>}
                            {!gerarConfig.semEntrada && r.deposito > 0 && <span className="text-white">Entrada: <span className="text-teal-400 font-black">{fmt(r.deposito)}</span></span>}
                            <span className="text-white">Total: <span className="text-white font-black">{fmt(r.valorTotal)}</span></span>
                          </div>

                          {preview.length > 0 && (
                            <div>
                              <p className="text-[10px] text-white font-bold uppercase tracking-wider mb-1.5">Primeiras datas</p>
                              <div className="flex flex-wrap gap-2">
                                {preview.map((d, i) => (
                                  <span key={i} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 text-xs">
                                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                    <span className="text-white font-bold">{d}</span>
                                    <span className="text-white tabular-nums">{fmt(valorPrest)}</span>
                                  </span>
                                ))}
                                {gerarNum > 3 && <span className="text-[10px] text-white flex items-center px-2">+{gerarNum - 3} mais</span>}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button disabled={!gerarData || gerarNum < 1 || isBlocked} onClick={confirmarGerar}
                              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-black bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Gerar Plano
                            </button>
                            <button onClick={() => setGerarConfig(null)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Fechar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
