import { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { AdminNav } from '../components/AdminNav';
import { useReservations } from '../context/ReservationsContext';
import type { Reservation, ReservationStatus } from '../types/reservation';


const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente:            { label: 'Compra Pendente',        className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Ativo',          className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
};

const FLOW_STEPS = [
  { key: 'pendente',        label: 'Pendente'  },
  { key: 'compra_aprovada', label: 'Aprovada'  },
  { key: 'entrada_paga',    label: 'Entrada'   },
  { key: 'em_prestacao',    label: 'Prestação' },
  { key: 'liquidada',       label: 'Liquidada' },
] as const;

function stepIndex(status: ReservationStatus) {
  if (status === 'prestacao_atraso') return 3;
  return FLOW_STEPS.findIndex(s => s.key === status);
}

const fmt     = (n: number) => new Intl.NumberFormat('pt-PT').format(Math.round(n)) + ' MT';
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const compraVehicles = VEHICLES.filter(v => v.mode === 'compra');
const compraIds      = new Set(compraVehicles.map(v => v.id));
const vehicleName    = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
const isFinal        = (s: ReservationStatus) => s === 'cancelada' || s === 'liquidada';

// ── Modal de gestão de prestações ────────────────────────────────────────────
function PrestacoeModal({
  r, today, onClose, onToggle, isBlocked,
}: {
  r: Reservation;
  today: string;
  onClose: () => void;
  onToggle: (numero: number, paga: boolean) => void;
  isBlocked: boolean;
}) {
  const prestacoes    = r.prestacoes ?? [];
  const pagas         = prestacoes.filter(p => p.paga).length;
  const total         = prestacoes.length;
  const pct           = total > 0 ? Math.round((pagas / total) * 100) : 0;
  const isAtraso      = r.status === 'prestacao_atraso';
  const allPaid       = pagas >= total && total > 0;
  const proximaNumero = prestacoes.find(p => !p.paga)?.numero ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        style={{ fontFamily: "'Archivo', sans-serif" }}>

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
            <p className="text-zinc-400 text-xs mt-0.5">{vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all shrink-0 text-lg font-black">
            ×
          </button>
        </div>

        {/* Barra de progresso global */}
        <div className={`px-6 py-3 border-b border-zinc-800 flex items-center gap-4 ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <span className={`text-2xl font-black tabular-nums ${isAtraso ? 'text-red-400' : allPaid ? 'text-emerald-400' : 'text-blue-400'}`}>
            {pagas}<span className="text-sm text-zinc-500 font-bold">/{total}</span>
          </span>
          <div className="flex-1">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${isAtraso ? 'bg-red-500' : allPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
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
                    : isProxima              ? 'bg-blue-500/3'
                    : ''
                  }`}
                >
                  {/* Número */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                    p.paga                   ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/15 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                    : 'bg-zinc-800/60 text-zinc-600 border-zinc-700/50'
                  }`}>
                    {p.paga ? '✓' : p.numero}
                  </span>

                  {/* Data vencimento */}
                  <span className={`text-xs tabular-nums w-28 shrink-0 ${
                    p.paga                   ? 'text-zinc-500 line-through'
                    : isProxima && isOverdue ? 'text-red-400 font-semibold'
                    : isProxima              ? 'text-zinc-200 font-semibold'
                    : 'text-zinc-600'
                  }`}>
                    {fmtDate(p.dataVencimento)}
                  </span>

                  {/* Valor */}
                  <span className={`text-sm font-bold tabular-nums flex-1 ${
                    p.paga ? 'text-zinc-600' : isProxima ? (isOverdue ? 'text-red-300' : 'text-white') : 'text-zinc-600'
                  }`}>
                    {fmt(p.valor)}
                  </span>

                  {/* Badge estado */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                    p.paga                   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                  }`}>
                    {p.paga
                      ? (p.dataPagamento ? fmtDate(p.dataPagamento) : 'Paga')
                      : isProxima && isOverdue ? '⚠ Em Atraso'
                      : isProxima ? 'A receber'
                      : `Prestação ${p.numero}`}
                  </span>

                  {/* Botão acção */}
                  <div className="shrink-0 w-24 flex justify-end">
                    {p.paga && !isFinal(r.status) && (
                      <button disabled={isBlocked} onClick={() => onToggle(p.numero, false)}
                        className="text-xs px-3 py-1 rounded-lg font-semibold bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-40">
                        Reverter
                      </button>
                    )}
                    {isProxima && !isFinal(r.status) && (
                      <button disabled={isBlocked} onClick={() => onToggle(p.numero, true)}
                        className={`text-xs px-3 py-1 rounded-lg font-black transition-all disabled:opacity-40 ${
                          isOverdue
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}>
                        {isOverdue ? '⚠ Receber' : '✓ Receber'}
                      </button>
                    )}
                    {isFutura && (
                      <span className="text-xs text-zinc-700 px-3 py-1">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé com resumo financeiro + fechar */}
        <div className={`px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-4 rounded-b-2xl ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <div className="flex gap-6 text-xs">
            <span className="text-zinc-500">
              Pago: <span className="text-emerald-400 font-black">
                {fmt(prestacoes.filter(p => p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
            <span className="text-zinc-500">
              Restante: <span className={`font-black ${isAtraso ? 'text-red-400' : 'text-amber-400'}`}>
                {fmt(prestacoes.filter(p => !p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
          </div>
          <button onClick={onClose}
            className="text-sm px-5 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-semibold transition-all">
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
  const [tab,         setTab]          = useState<Tab>('compras');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [updating,       setUpdating]       = useState<string | null>(null);
  const [modalAberto,    setModalAberto]    = useState<string | null>(null); // id da reserva

  const today = new Date().toISOString().split('T')[0];

  const advance = (id: string, toStatus: ReservationStatus) => {
    if (updating === id) return;
    setUpdating(id);
    updateReservation(id, { status: toStatus });
    setTimeout(() => setUpdating(null), 800);
  };

  const iniciarPrestacoes = (id: string, semEntrada = false) => {
    if (updating === id) return;
    setUpdating(id);
    gerarPrestacoes(id, semEntrada);
    setTimeout(() => {
      setUpdating(null);
      setModalAberto(id); // abre o modal logo após gerar
    }, 600);
  };

  const togglePrestacao = (reservationId: string, numero: number, paga: boolean) => {
    if (updating === reservationId) return;
    setUpdating(reservationId);
    marcarPrestacao(reservationId, numero, paga);
    setTimeout(() => setUpdating(null), 600);
  };

  const compraReservations = useMemo(() =>
    reservations.filter(r => compraIds.has(r.vehicleId)), [reservations]);

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
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <AdminNav subtitle="Compra" onExit={onExit} />

      {/* Modal de gestão de prestações */}
      {modalReservation && (
        <PrestacoeModal
          r={modalReservation}
          today={today}
          onClose={() => setModalAberto(null)}
          onToggle={(numero, paga) => togglePrestacao(modalReservation.id, numero, paga)}
          isBlocked={updating === modalReservation.id}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Pendentes',           value: kpis.pendentes,   color: 'text-amber-400',   dot: 'bg-amber-400',   hl: false },
            { label: 'Em Prestação',        value: kpis.emPrestacao, color: 'text-blue-400',    dot: 'bg-blue-400',    hl: false },
            { label: 'Prestação em Atraso', value: kpis.emAtraso,    color: 'text-red-400',     dot: 'bg-red-500',     hl: kpis.emAtraso > 0 },
            { label: 'Liquidadas',          value: kpis.liquidadas,  color: 'text-emerald-400', dot: 'bg-emerald-400', hl: false },
            { label: 'Canceladas',          value: kpis.canceladas,  color: 'text-zinc-400',    dot: 'bg-zinc-500',    hl: false },
          ].map(k => (
            <div key={k.label} className={`border rounded-2xl p-4 flex flex-col gap-2 ${k.hl ? 'border-red-500/40 bg-red-500/5' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                <span className="text-xs text-white uppercase font-bold tracking-wide leading-tight">{k.label}</span>
              </div>
              <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Volume */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-white font-bold uppercase tracking-wider">Volume Total de Vendas</span>
          <span className="text-2xl font-black text-amber-400">{fmt(kpis.volume)}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {([
            { key: 'compras', label: `Histórico (${historico.length})` },
            { key: 'acoes',   label: `Ações (${compraReservations.filter(r => r.status !== 'cancelada' && r.status !== 'liquidada').length})` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/40">
                <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden md:table-cell">Viatura</th>
                <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden sm:table-cell">Valor Total</th>
                <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {historico.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">
                    Sem contratos concluídos ainda
                  </td>
                </tr>
              )}
              {historico.map(r => {
                const st = STATUS_CFG[r.status];
                const prestacoes = r.prestacoes ?? [];
                const pagas = prestacoes.filter(p => p.paga).length;
                const total = prestacoes.length || (r.totalPrestacoes ?? 0);
                return (
                  <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-white">{r.clientName}</p>
                      <p className="text-xs text-zinc-500">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-sm text-zinc-300">
                      {vehicleName(r.vehicleId)}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-sm font-bold text-amber-400">{fmt(r.valorTotal)}</p>
                      {total > 0 && (
                        <p className="text-xs text-zinc-500">{pagas}/{total} prestações</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-zinc-300 tabular-nums">{r.dataInicio}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {historico.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
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

          return (
            <div className="space-y-3">
              {accionaveis.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-12 text-center text-zinc-500 text-sm">
                  Sem compras com acções pendentes
                </div>
              )}
              {accionaveis.map(r => {
                const st         = STATUS_CFG[r.status];
                const prestacoes = r.prestacoes ?? [];
                const pagas      = prestacoes.filter(p => p.paga).length;
                const total      = prestacoes.length;
                const allPaid    = total > 0 && pagas >= total;
                const hasOverdue = prestacoes.some(p => !p.paga && p.dataVencimento < today);
                const isAtraso   = r.status === 'prestacao_atraso';
                const isBlocked  = updating === r.id;

                return (
                  <div key={r.id} className={`bg-zinc-900 border rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${
                    isAtraso ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800'
                  }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-black text-sm">{r.clientName}</p>
                        <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                        {isAtraso && (
                          <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md animate-pulse">
                            ⚠ ATRASO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}
                        {total > 0 && ` · Prestações ${pagas}/${total}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {r.status === 'pendente' && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'compra_aprovada')}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 disabled:opacity-50 transition-all">
                          Aprovar Compra
                        </button>
                      )}
                      {r.status === 'compra_aprovada' && (<>
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'entrada_paga')}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-teal-400/10 text-teal-400 border border-teal-400/20 hover:bg-teal-400/20 disabled:opacity-50 transition-all">
                          Entrada Recebida
                        </button>
                        <button disabled={isBlocked} onClick={() => iniciarPrestacoes(r.id, true)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-zinc-700 text-zinc-300 border border-zinc-600 hover:bg-zinc-600 disabled:opacity-50 transition-all"
                          title="Funcionário público — sem entrada">
                          Sem Entrada
                        </button>
                      </>)}
                      {r.status === 'entrada_paga' && (
                        <button disabled={isBlocked} onClick={() => iniciarPrestacoes(r.id, false)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 disabled:opacity-50 transition-all">
                          Gerar Plano de Prestações
                        </button>
                      )}
                      {(r.status === 'em_prestacao' || r.status === 'prestacao_atraso') && (<>
                        {allPaid && (
                          <button disabled={isBlocked} onClick={() => advance(r.id, 'liquidada')}
                            className="text-xs px-3 py-1.5 rounded-lg font-black bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all">
                            ✓ Liquidar Contrato
                          </button>
                        )}
                        <button onClick={() => setModalAberto(r.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            isAtraso
                              ? 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                          }`}>
                          Gerir Prestações
                        </button>
                        {isAtraso && (
                          <button disabled={isBlocked} onClick={() => advance(r.id, 'em_prestacao')}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 disabled:opacity-50 transition-all">
                            Regularizar
                          </button>
                        )}
                        {!isAtraso && hasOverdue && (
                          <button disabled={isBlocked} onClick={() => advance(r.id, 'prestacao_atraso')}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all">
                            ⚠ Marcar Atraso
                          </button>
                        )}
                      </>)}
                      <button disabled={isBlocked} onClick={() => cancelReservation(r.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 transition-all">
                        Cancelar
                      </button>
                    </div>
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
