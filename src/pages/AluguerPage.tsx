import { useMemo, useState, useEffect } from 'react';
import { VEHICLES } from '../data/constants';
import { useReservations } from '../context/ReservationsContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useVehicles } from '../context/VehiclesContext';
import { useNotifications } from '../context/NotificationsContext';
import { AvailabilityCalendar } from '../components/reservations/AvailabilityCalendar';
import { BlockPeriodModal } from '../components/reservations/BlockPeriodModal';
import { BusinessRulesPanel } from '../components/reservations/BusinessRulesPanel';
import { EditReservationModal } from '../components/reservations/EditReservationModal';
import { ContratoModal } from '../components/reservations/ContratoModal';
import { RegistarPagamentoModal } from '../components/reservations/RegistarPagamentoModal';
import { ReservationTracker } from '../components/ReservationTracker';
import { ViaturaEmUsoPage } from './ViaturaEmUsoPage';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { Prestacao, Reservation, ReservationStatus } from '../types/reservation';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';

const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente:            { label: 'Aguarda Pagamento',      className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Activo',         className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

type Tab = 'reservas' | 'acoes' | 'em_uso' | 'calendario' | 'bloqueios' | 'regras';

const GRUPOS: Array<{
  status: ReservationStatus;
  title: string;
  dot: string;
  badge: string;
  textColor: string;
}> = [
  { status: 'pendente',            title: 'Aguarda Pagamento',       dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',     textColor: 'text-amber-400'   },
  { status: 'confirmada',          title: 'Reservas Confirmadas',    dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',textColor: 'text-emerald-400' },
  { status: 'pronta_levantamento', title: 'Prontas p/ Levantamento', dot: 'bg-sky-400',     badge: 'bg-sky-400/10 text-sky-400 border-sky-400/20',           textColor: 'text-sky-400'     },
  { status: 'ativa',               title: 'Alugueres Activos',        dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',        textColor: 'text-blue-400'    },
  { status: 'devolucao_pendente',  title: 'Devolução Pendente',      dot: 'bg-orange-400',  badge: 'bg-orange-400/10 text-orange-400 border-orange-400/20',  textColor: 'text-orange-400'  },
];

export function AluguerPage({ onExit }: { onExit?: () => void }) {
  const { reservations, blocks, updateReservation, cancelReservation, removeBlock, marcarPrestacao } = useReservations();
  const { motoristas } = useMotoristas();
  const { vehicles: allVehicles } = useVehicles();
  const { addNotification } = useNotifications();

  const aluguerVehicles = useMemo(() => allVehicles.filter(v => v.mode === 'aluguer'), [allVehicles]);
  const aluguerIds = useMemo(() => new Set(aluguerVehicles.map(v => v.id)), [aluguerVehicles]);

  const getUrlParams = () => new URLSearchParams(window.location.search);

  const [tab, setTab] = useState<Tab>(() => {
    const t = getUrlParams().get('tab');
    if (t === 'acoes') return 'acoes';
    if (t === 'em_uso') return 'em_uso';
    return 'reservas';
  });
  const [highlightStatus, setHighlightStatus] = useState<string | null>(() =>
    getUrlParams().get('status')
  );
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [contractReservation, setContractReservation] = useState<Reservation | null>(null);
  const [lastActedId, setLastActedId] = useState<string | null>(null);
  const [acoesFilter, setAcoesFilter] = useState<ReservationStatus | 'todos'>('todos');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [pagamentoModal, setPagamentoModal] = useState<{
    reservationId: string;
    prestacao: Prestacao;
    onAfterSave?: () => void;
    titulo?: string;
  } | null>(null);
  const [extensaoRespostaId, setExtensaoRespostaId]       = useState<string | null>(null);
  const [extensaoRespostaTipo, setExtensaoRespostaTipo]   = useState<'aprovado' | 'rejeitado' | null>(null);
  const [extensaoRespostaTexto, setExtensaoRespostaTexto] = useState('');

  // Sync tab + status with URL on navigation
  useEffect(() => {
    const sync = () => {
      const p = getUrlParams();
      const t = p.get('tab');
      setTab(t === 'acoes' ? 'acoes' : t === 'em_uso' ? 'em_uso' : 'reservas');
      setHighlightStatus(p.get('status'));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Scroll to the highlighted group after rendering
  useEffect(() => {
    if (tab !== 'acoes' || !highlightStatus) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`aluguer-grupo-${highlightStatus}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [tab, highlightStatus]);

  // After an action, scroll to the card's new position and briefly highlight it
  useEffect(() => {
    if (!lastActedId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`res-card-${lastActedId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    const clear = setTimeout(() => setLastActedId(null), 3500);
    return () => { clearTimeout(timer); clearTimeout(clear); };
  }, [lastActedId]);

  const aluguerReservations = useMemo(() =>
    reservations
      .filter(r => aluguerIds.has(r.vehicleId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reservations, aluguerIds]
  );

  const historico = useMemo(() =>
    aluguerReservations
      .filter(r => r.status === 'concluida' || r.status === 'cancelada')
      .filter(r => selectedVehicle === null || r.vehicleId === selectedVehicle)
      .sort((a, b) => b.dataFim.localeCompare(a.dataFim)),
    [aluguerReservations, selectedVehicle]
  );

  const kpis = useMemo(() => ({
    pendentes:         aluguerReservations.filter(r => r.status === 'pendente').length,
    prontas:           aluguerReservations.filter(r => r.status === 'pronta_levantamento').length,
    ativas:            aluguerReservations.filter(r => r.status === 'ativa').length,
    devolucaoPendente: aluguerReservations.filter(r => r.status === 'devolucao_pendente').length,
    cancelamentos:     aluguerReservations.filter(r => r.status === 'cancelada').length,
  }), [aluguerReservations]);

  const vehicleName = (id: number) => allVehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const accionaveisCount = aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length;

  const acoesUrgente = kpis.pendentes > 0 || kpis.devolucaoPendente > 0;

  const emUsoCount = useMemo(
    () => reservations.filter(r => aluguerIds.has(r.vehicleId) && ['confirmada','pronta_levantamento','ativa','devolucao_pendente'].includes(r.status)).length,
    [reservations, aluguerIds],
  );

  const tabList: { key: Tab; label: string; urgent?: boolean }[] = [
    { key: 'reservas',   label: `Histórico (${historico.length})` },
    { key: 'acoes',      label: `Ações (${accionaveisCount})`,     urgent: acoesUrgente },
    { key: 'em_uso',     label: `Em Uso (${emUsoCount})` },
    { key: 'calendario', label: 'Calendário' },
    { key: 'bloqueios',  label: `Bloqueios (${blocks.length})` },
    { key: 'regras',     label: 'Regras' },
  ];

  return (
    <div className="bg-zinc-950 text-white">
      {showBlockModal && (
        <BlockPeriodModal
          defaultVehicleId={selectedVehicle}
          onClose={() => setShowBlockModal(false)}
        />
      )}
      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
        />
      )}
      {contractReservation && (
        <ContratoModal
          reservation={contractReservation}
          onClose={() => setContractReservation(null)}
        />
      )}
      {pagamentoModal && (
        <RegistarPagamentoModal
          reservationId={pagamentoModal.reservationId}
          prestacao={pagamentoModal.prestacao}
          titulo={pagamentoModal.titulo}
          onAfterSave={pagamentoModal.onAfterSave}
          onClose={() => setPagamentoModal(null)}
        />
      )}

      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            {
              label: 'Reservas Pendentes', sub: 'Aguarda pagamento',
              value: kpis.pendentes,
              numCol: kpis.pendentes > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
            },
            {
              label: 'Prontas p/ Levantar', sub: 'Prontas para entrega',
              value: kpis.prontas,
              numCol: kpis.prontas > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
            },
            {
              label: 'Alugueres Activos', sub: 'Em curso agora',
              value: kpis.ativas,
              numCol: kpis.ativas > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M17 14l2 2 4-4"/></svg>,
            },
            {
              label: 'Devoluções Pendentes', sub: 'Aguarda devolução',
              value: kpis.devolucaoPendente,
              numCol: kpis.devolucaoPendente > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M9 14H5v4"/><path d="M5 14a7 7 0 0 0 7 7"/></svg>,
            },
            {
              label: 'Cancelamentos', sub: 'Total cancelado',
              value: kpis.cancelamentos,
              numCol: kpis.cancelamentos > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/></svg>,
            },
          ] as const).map(k => (
            <div key={k.label} className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className={`h-0.5 w-full ${k.bar}`} />
              <div className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${k.iconBg} ${k.iconCol}`}>
                  {k.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-2xl font-black leading-none tabular-nums ${k.numCol}`}>{k.value}</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5 leading-tight">{k.label}</p>
                  <p className="text-xs text-white">{k.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
          {tabList.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'acoes') setAcoesFilter('todos'); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-lg border-b-2 transition ${
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

        {/* TAB: Histórico */}
        {tab === 'reservas' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select value={selectedVehicle ?? ''} onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Todas as viaturas</option>
                {aluguerVehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Histórico de Alugueres</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-5 py-4 text-xs text-white/40 font-black uppercase tracking-widest w-10">#</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Cliente</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden md:table-cell">Viatura</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Período</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden sm:table-cell">Devolução</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {historico.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-white text-sm">Sem histórico de alugueres ainda</td></tr>
                  )}
                  {historico.map((r, idx) => {
                    const st = STATUS_CFG[r.status];
                    return (
                      <tr key={r.id} className={`hover:bg-zinc-800/40 transition-colors ${idx % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                        <td className="px-5 py-4 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white">{r.clientName}</p>
                          <p className="text-xs text-white">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-sm text-white">{vehicleName(r.vehicleId)}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-white tabular-nums">{r.dataInicio} → {r.dataFim}</p>
                          {r.motivoViagem && <p className="text-[10px] text-white mt-0.5 italic">{r.motivoViagem}</p>}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <p className="text-sm text-white tabular-nums">{r.dataFim}</p>
                          <p className="text-xs text-white">{r.horaDevolucao}</p>
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
                  {historico.length} registo(s) no histórico
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Ações — separado por estado */}
        {tab === 'acoes' && (() => {
          const totalAcionaveis = aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length;
          const gruposVisiveis = GRUPOS.filter(g => acoesFilter === 'todos' || g.status === acoesFilter);
          return (
            <div className="space-y-6">

              {/* Barra de filtros */}
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-amber-500/20 rounded-2xl">
                <button
                  onClick={() => setAcoesFilter('todos')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    acoesFilter === 'todos'
                      ? 'bg-zinc-700 text-white border border-zinc-500'
                      : 'text-white border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  Todos
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${acoesFilter === 'todos' ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-white'}`}>
                    {totalAcionaveis}
                  </span>
                </button>
                {GRUPOS.map(g => {
                  const count = aluguerReservations.filter(r => r.status === g.status).length;
                  if (count === 0) return null;
                  const isActive = acoesFilter === g.status;
                  return (
                    <button
                      key={g.status}
                      onClick={() => setAcoesFilter(isActive ? 'todos' : g.status)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        isActive
                          ? `${g.badge} border-current`
                          : 'text-white border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                      {g.title}
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isActive ? 'bg-black/25 text-current' : 'bg-zinc-800 text-white'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Pedidos de extensão pendentes ── */}
              {(() => {
                const comExtensao = aluguerReservations.filter(r => r.pedidoExtensao?.status === 'pendente');
                if (comExtensao.length === 0) return null;
                return (
                  <div className="bg-amber-500/5 border-2 border-amber-500/40 rounded-2xl overflow-hidden">
                    {/* cabeçalho da secção */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-500/20 bg-amber-500/10">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        Pedidos de Extensão Pendentes
                      </p>
                      <span className="text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-md px-2 py-0.5">
                        {comExtensao.length}
                      </span>
                    </div>

                    <div className="divide-y divide-amber-500/10">
                      {comExtensao.map(r => {
                        const veh = vehicleName(r.vehicleId);
                        const ext = r.pedidoExtensao!;
                        const isResponding = extensaoRespostaId === r.id;
                        return (
                          <div key={r.id} className="px-5 py-4 space-y-3">
                            {/* Info do pedido */}
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-black text-white">{r.clientName}
                                  <span className="text-white/40 font-mono text-[10px] ml-2">#{r.id.slice(0,8).toUpperCase()}</span>
                                </p>
                                <p className="text-xs text-white/60">{veh}</p>
                              </div>
                              <div className="flex gap-2 shrink-0 flex-wrap">
                                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-center">
                                  <p className="text-[10px] text-white/40">Data fim actual</p>
                                  <p className="text-xs font-black text-white">{r.dataFim}</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 text-center">
                                  <p className="text-[10px] text-amber-400/70">Nova data sugerida</p>
                                  <p className="text-xs font-black text-amber-400">{ext.novaDataFim}</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-center">
                                  <p className="text-[10px] text-white/40">Extensão</p>
                                  <p className="text-xs font-black text-white">+{ext.dias} dia(s)</p>
                                </div>
                              </div>
                            </div>

                            {/* Motivo do cliente */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Motivo do cliente</p>
                              <p className="text-sm text-white leading-snug">{ext.motivo}</p>
                            </div>

                            {/* Área de resposta */}
                            {isResponding ? (
                              <div className={`rounded-xl border p-4 space-y-3 ${
                                extensaoRespostaTipo === 'aprovado'
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-red-500/10 border-red-500/30'
                              }`}>
                                <p className={`text-xs font-black uppercase tracking-wider ${
                                  extensaoRespostaTipo === 'aprovado' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {extensaoRespostaTipo === 'aprovado' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                                </p>
                                <div>
                                  <label className="text-[10px] text-white font-bold block mb-1">
                                    Mensagem ao cliente <span className="text-amber-400">*</span>
                                  </label>
                                  <textarea
                                    value={extensaoRespostaTexto}
                                    onChange={e => setExtensaoRespostaTexto(e.target.value)}
                                    placeholder={extensaoRespostaTipo === 'aprovado'
                                      ? 'Ex: Extensão aprovada. A nova data de devolução é confirmada.'
                                      : 'Ex: Não é possível estender porque a viatura já está reservada nesse período.'}
                                    rows={3}
                                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none outline-none transition-colors"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    disabled={!extensaoRespostaTexto.trim()}
                                    onClick={() => {
                                      const tipo     = extensaoRespostaTipo!;
                                      const resposta = extensaoRespostaTexto.trim();
                                      const novaData = tipo === 'aprovado' ? ext.novaDataFim : r.dataFim;
                                      updateReservation(r.id, {
                                        ...(tipo === 'aprovado' ? { dataFim: novaData } : {}),
                                        pedidoExtensao: {
                                          ...ext,
                                          status: tipo,
                                          respostaAdmin: resposta,
                                          dataResposta: new Date().toISOString(),
                                        },
                                      });
                                      if (r.userId) {
                                        addNotification(
                                          r.userId,
                                          tipo === 'aprovado'
                                            ? `Extensão aprovada — ${veh}`
                                            : `Extensão não aprovada — ${veh}`,
                                          tipo === 'aprovado'
                                            ? `A sua extensão de ${ext.dias} dia(s) foi aprovada. Nova data de devolução: ${novaData}. ${resposta}`
                                            : `A sua extensão não foi aprovada. ${resposta}`,
                                          tipo === 'aprovado' ? 'success' : 'alert',
                                          r.id,
                                          '/perfil?section=reservas',
                                        );
                                      }
                                      setExtensaoRespostaId(null);
                                      setExtensaoRespostaTipo(null);
                                      setExtensaoRespostaTexto('');
                                      setLastActedId(r.id);
                                    }}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                      extensaoRespostaTipo === 'aprovado'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                        : 'bg-red-500 hover:bg-red-400 text-white'
                                    }`}
                                  >
                                    {extensaoRespostaTipo === 'aprovado' ? 'Aprovar e actualizar data' : 'Confirmar rejeição'}
                                  </button>
                                  <button
                                    onClick={() => { setExtensaoRespostaId(null); setExtensaoRespostaTipo(null); setExtensaoRespostaTexto(''); }}
                                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-bold transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setExtensaoRespostaId(r.id); setExtensaoRespostaTipo('aprovado'); setExtensaoRespostaTexto(''); }}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-sm font-black transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  Aprovar extensão
                                </button>
                                <button
                                  onClick={() => { setExtensaoRespostaId(r.id); setExtensaoRespostaTipo('rejeitado'); setExtensaoRespostaTexto(''); }}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-black transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {totalAcionaveis === 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-xl py-12 text-center text-white text-sm">
                  Sem reservas com acções pendentes
                </div>
              )}
              {gruposVisiveis.map(grupo => {
                const lista = aluguerReservations.filter(r => r.status === grupo.status);
                if (lista.length === 0) return null;
                const isHighlighted = highlightStatus === grupo.status;
                return (
                  <div
                    key={grupo.status}
                    id={`aluguer-grupo-${grupo.status}`}
                    className={`space-y-3 rounded-2xl transition-all duration-500 ${isHighlighted ? 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-zinc-950 p-3 -mx-3' : ''}`}
                  >
                    {/* Cabeçalho de secção */}
                    <div className="flex items-center gap-3 pt-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${grupo.dot}`} />
                      <h3 className={`text-xs font-black uppercase tracking-widest ${grupo.textColor}`}>
                        {grupo.title}
                      </h3>
                      <span className={`text-[10px] font-black border rounded-md px-2 py-0.5 ${grupo.badge}`}>
                        {lista.length}
                      </span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    {/* Cards do grupo */}
                    {lista.map(r => {
                      const st = STATUS_CFG[r.status];
                      const pago = r.prestacoes
                        ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
                        : (r.deposito ?? 0);
                      const divida = Math.max(0, r.valorTotal - pago);
                      const pct = r.valorTotal > 0 ? Math.round((pago / r.valorTotal) * 100) : 0;
                      const nextPrest = r.prestacoes?.find(p => !p.paga);
                      const paidPrest = [...(r.prestacoes?.filter(p => p.paga) ?? [])].reverse().slice(0, 3);
                      const totalDays = Math.max(1, Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86400000));
                      const daysRemaining = Math.max(0, Math.ceil((new Date(r.dataFim).getTime() - Date.now()) / 86400000));
                      const tarifaDiaria = r.valorTotal / totalDays;
                      const estadoVeiculo = r.status === 'ativa' ? 'Em Uso' : r.status === 'devolucao_pendente' ? 'A Devolver' : r.status === 'pronta_levantamento' ? 'Reservado' : 'Disponível';
                      const mot = r.motoristaId ? motoristas.find(m => m.id === r.motoristaId) : null;

                      const isLastActed = lastActedId === r.id;
                      const isCollapsed = collapsedIds.has(r.id);
                      return (
                        <div
                          key={r.id}
                          id={`res-card-${r.id}`}
                          className={`bg-zinc-900 rounded-2xl overflow-hidden transition-all duration-300 ${
                            isLastActed
                              ? 'border-2 border-amber-500/70 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/10'
                              : 'border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >

                          {/* Header — clicável para colapsar/expandir */}
                          <div className="px-5 pt-4 pb-4 flex items-center justify-between gap-3 border-b border-zinc-800/60">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold shrink-0 ${st.className}`}>{st.label}</span>
                              <p className="text-white font-black text-sm truncate">{r.clientName}</p>
                              {mot && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2 py-0.5">
                                  🧑‍✈️ {mot.nome}
                                </span>
                              )}
                              {r.pedidoExtensao?.status === 'pendente' && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-300 bg-amber-400/15 border border-amber-400/40 rounded-md px-2 py-0.5 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                  Extensão pendente
                                </span>
                              )}
                              {isLastActed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 rounded-md px-2 py-0.5 animate-pulse">
                                  ✓ Última ação
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-white/40 font-mono">#{r.id.slice(0, 8).toUpperCase()}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleCollapse(r.id)}
                                aria-expanded={!isCollapsed}
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                              >
                                {isCollapsed
                                  ? <ChevronDown size={16} strokeWidth={2.5} />
                                  : <ChevronUp size={16} strokeWidth={2.5} />
                                }
                              </Button>
                            </div>
                          </div>

                          {/* Corpo colapsável */}
                          {!isCollapsed && <>

                          {/* Tracker + Botões */}
                          <div className="px-5 pt-4 pb-4 border-b border-zinc-800/60">
                            <ReservationTracker
                              status={r.status}
                              onAdvance={next => {
                                const isShortRental = totalDays <= 5;
                                if (next === 'confirmada') {
                                  // ≤5 dias: paga o valor total logo no início; >5 dias: só o depósito
                                  const valorInicial = isShortRental
                                    ? r.valorTotal
                                    : (r.deposito > 0 ? r.deposito : r.valorTotal);
                                  const firstPrest: Prestacao = r.prestacoes?.[0] ?? {
                                    numero: 1,
                                    dataVencimento: new Date().toISOString().split('T')[0],
                                    valor: valorInicial,
                                    paga: false,
                                  };
                                  setPagamentoModal({
                                    reservationId: r.id,
                                    prestacao: firstPrest,
                                    titulo: isShortRental ? 'Registar Pagamento Total' : 'Registar 1º Pagamento',
                                    onAfterSave: () => { updateReservation(r.id, { status: 'confirmada' }); setLastActedId(r.id); },
                                  });
                                } else if (next === 'concluida') {
                                  // ≤5 dias: pagamento total foi feito no início — conclui directamente sem pedir novo pagamento
                                  if (isShortRental) {
                                    updateReservation(r.id, { status: 'concluida' });
                                    setLastActedId(r.id);
                                  } else {
                                    const remaining = Math.max(0, r.valorTotal - pago);
                                    const lastUnpaid = r.prestacoes?.filter(p => !p.paga).at(-1);
                                    const finalPrest: Prestacao = lastUnpaid ?? {
                                      numero: (r.prestacoes?.length ?? 0) + 1,
                                      dataVencimento: r.dataFim,
                                      valor: remaining > 0 ? remaining : r.valorTotal,
                                      paga: false,
                                    };
                                    setPagamentoModal({
                                      reservationId: r.id,
                                      prestacao: finalPrest,
                                      titulo: 'Registar Pagamento Final',
                                      onAfterSave: () => { updateReservation(r.id, { status: 'concluida' }); setLastActedId(r.id); },
                                    });
                                  }
                                } else {
                                  updateReservation(r.id, { status: next });
                                  setLastActedId(r.id);
                                  if (next === 'devolucao_pendente') setAcoesFilter('todos');
                                }
                              }}
                              onCancel={(motivo) => { cancelReservation(r.id, motivo); setLastActedId(r.id); }}
                              onEdit={() => setEditingReservation(r)}
                              onContract={() => setContractReservation(r)}
                              stepDates={{
                                pendente: r.createdAt,
                                pronta_levantamento: r.dataInicio,
                                ativa: r.dataInicio,
                                devolucao_pendente: r.dataFim,
                                concluida: r.dataFim,
                              }}
                            />
                          </div>

                          {/* Pagamento */}
                          {r.valorTotal > 0 && (() => {
                            const payCtx: Record<string, { label: string; col: string; bg: string }> = {
                              pendente:            { label: 'Aguarda depósito',    col: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                              confirmada:          { label: 'Depósito recebido',   col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                              pronta_levantamento: { label: 'Pronto p/ entrega',   col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                              ativa:               { label: 'Aluguer em curso',    col: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                              devolucao_pendente:  { label: 'Liquidação pendente', col: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
                              concluida:           { label: 'Totalmente liquidado',col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                              cancelada:           { label: 'Cancelado',           col: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
                            };
                            const ctx = payCtx[r.status] ?? { label: '', col: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
                            return (
                            <div className="px-5 py-4 border-b border-zinc-800/60">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Pagamento</p>
                                  {ctx.label && (
                                    <span className={`text-[9px] font-black border rounded-md px-2 py-0.5 uppercase tracking-wider ${ctx.col} ${ctx.bg}`}>
                                      {ctx.label}
                                    </span>
                                  )}
                                </div>
                                {nextPrest && (
                                  <div className="text-right">
                                    <p className="text-[10px] text-white">Próximo pagamento</p>
                                    <p className="text-sm font-black text-amber-400">{fmt(nextPrest.valor)}</p>
                                    <p className="text-[10px] text-white">{nextPrest.dataVencimento}</p>
                                  </div>
                                )}
                              </div>

                              {/* Barra de progresso */}
                              {r.prestacoes && r.prestacoes.length > 0 ? (
                                <div className="mb-4">
                                  <div className="flex gap-1 mb-1">
                                    {r.prestacoes.map((p, i) => (
                                      <div key={i} className="flex-1 h-2 rounded-sm overflow-hidden bg-zinc-800">
                                        <div className={`h-full transition-all ${p.paga ? 'bg-emerald-500' : ''}`} />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex mb-1">
                                    {r.prestacoes.map((p, i) => (
                                      <div key={i} className="flex-1 text-center">
                                        <span className={`text-[9px] font-bold ${p.paga ? 'text-emerald-400' : 'text-white/30'}`}>{i + 1}ª</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-4">
                                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              )}

                              {/* Stats */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-2.5">
                                  <p className="text-[10px] text-white mb-1">Total</p>
                                  <p className="text-sm font-black text-white">{fmt(r.valorTotal)}</p>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                                  <p className="text-[10px] text-emerald-400 mb-1">Pago {pct > 0 ? `(${pct}%)` : ''}</p>
                                  <p className="text-sm font-black text-emerald-400">{fmt(pago)}</p>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
                                  <p className="text-[10px] text-amber-400 mb-1">Em dívida {pct < 100 ? `(${100 - pct}%)` : ''}</p>
                                  <p className="text-sm font-black text-amber-400">{fmt(divida)}</p>
                                </div>
                              </div>

                              {/* Plano de prestações com botões Pagar */}
                              {r.prestacoes && r.prestacoes.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Plano de Prestações</p>
                                  <div className="space-y-1">
                                    {r.prestacoes.map(p => (
                                      <div key={p.numero} className={`flex items-center justify-between py-2.5 px-3 rounded-xl border transition ${
                                        p.paga
                                          ? 'bg-emerald-500/5 border-emerald-500/15'
                                          : new Date(p.dataVencimento) < new Date() ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-800/40 border-zinc-700/40'
                                      }`}>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                          <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                                            p.paga ? 'bg-emerald-500 border-emerald-400' : 'border-zinc-600'
                                          }`}>
                                            {p.paga && (
                                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-black text-white">{p.numero}ª prestação</span>
                                              <span className={`text-[10px] ${p.paga ? 'text-emerald-400/70' : new Date(p.dataVencimento) < new Date() ? 'text-red-400' : 'text-white'}`}>
                                                · {p.dataPagamento ?? p.dataVencimento}
                                                {p.horaPagamento && ` · ${p.horaPagamento}`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          <span className={`text-xs font-black ${p.paga ? 'text-emerald-400' : 'text-white'}`}>
                                            {fmt(p.valorPago ?? p.valor)}
                                          </span>
                                          {!p.paga && (
                                            <button
                                              onClick={() => setPagamentoModal({ reservationId: r.id, prestacao: p, onAfterSave: () => setLastActedId(r.id) })}
                                              className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-95 transition"
                                            >
                                              Pagar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Registo de Pagamentos — detalhes de cada transação */}
                              {(() => {
                                const FORMA_MAP: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros' };
                                const pagos = (r.prestacoes ?? []).filter(p => p.paga && (p.formaPagamento || p.referenciaPagamento || p.notasPagamento || p.dataPagamento));
                                if (pagos.length === 0) return null;
                                return (
                                  <div className="mt-4 pt-4 border-t border-zinc-800/60">
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Registo de Pagamentos</p>
                                    <div className="space-y-2">
                                      {pagos.map(p => (
                                        <div key={p.numero} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 flex items-start gap-3">
                                          {/* Ícone */}
                                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                          </div>
                                          {/* Detalhes */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <span className="text-xs font-black text-white">{p.numero}ª Prestação</span>
                                              <span className="text-sm font-black text-emerald-400 tabular-nums">{fmt(p.valorPago ?? p.valor)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white">
                                              {p.dataPagamento && (
                                                <span>{p.dataPagamento}{p.horaPagamento ? ` · ${p.horaPagamento}` : ''}</span>
                                              )}
                                              {p.formaPagamento && (
                                                <span className="font-bold text-amber-400">{FORMA_MAP[p.formaPagamento] ?? p.formaPagamento}</span>
                                              )}
                                              {p.referenciaPagamento && (
                                                <span className="font-mono text-white/70">Ref: {p.referenciaPagamento}</span>
                                              )}
                                            </div>
                                            {p.notasPagamento && (
                                              <p className="text-[11px] text-white/60 italic mt-1">{p.notasPagamento}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            );
                          })()}

                          {/* Cliente + Viatura */}
                          <div className="px-5 py-4 border-b border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3.5">
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                                  {r.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-white leading-tight truncate">{r.clientName}</p>
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5 mt-0.5">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                    Cliente verificado
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {r.clientPhone && (
                                  <div className="flex items-center gap-2 text-[11px] text-white">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.6 19.79 19.79 0 0 1 1.65 4a2 2 0 0 1 1.99-2H6.5a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.29 6.29l1.36-1.36a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    {r.clientPhone}
                                  </div>
                                )}
                                {r.clientEmail && (
                                  <div className="flex items-center gap-2 text-[11px] text-white">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                    {r.clientEmail}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3.5">
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-10 h-10 rounded-xl bg-zinc-700/60 border border-zinc-600/50 flex items-center justify-center text-white shrink-0">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="1" y="3" width="15" height="13" rx="2"/>
                                    <path d="M16 8h4l3 3v5h-7V8z"/>
                                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-white leading-tight truncate">{vehicleName(r.vehicleId)}</p>
                                  <p className="text-[10px] text-white mt-0.5">Viatura #{r.vehicleId}</p>
                                </div>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-white">Tarifa diária</span>
                                  <span className="font-black text-amber-400">{fmt(tarifaDiaria)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white">Período</span>
                                  <span className="font-semibold text-white tabular-nums">{r.dataInicio} → {r.dataFim}</span>
                                </div>
                                {r.localLevantamento && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-white">Local</span>
                                    <span className="font-semibold text-white truncate ml-2 text-right">{r.localLevantamento}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([
                              { label: 'Alugueres activos', value: String(kpis.ativas), col: 'text-amber-400' },
                              { label: 'Dias restantes', value: daysRemaining === 0 ? 'Hoje' : `${daysRemaining}d`, col: daysRemaining <= 1 ? 'text-red-400' : 'text-white' },
                              { label: 'Em dívida total', value: fmt(divida), col: divida > 0 ? 'text-amber-400' : 'text-emerald-400' },
                              { label: 'Estado veículo', value: estadoVeiculo, col: r.status === 'ativa' ? 'text-emerald-400' : 'text-white' },
                            ] as const).map(s => (
                              <div key={s.label} className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-3 text-center">
                                <p className={`text-sm font-black ${s.col}`}>{s.value}</p>
                                <p className="text-[10px] text-white mt-0.5 leading-tight">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Historial de extensão — só mostra após resposta */}
                          {r.pedidoExtensao && r.pedidoExtensao.status !== 'pendente' && (
                            <div className={`border-t px-5 py-3 flex items-center gap-3 ${
                              r.pedidoExtensao.status === 'aprovado'
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : 'border-zinc-800/60 bg-zinc-900/30'
                            }`}>
                              {r.pedidoExtensao.status === 'aprovado'
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              }
                              <p className={`text-xs font-bold ${r.pedidoExtensao.status === 'aprovado' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                Extensão {r.pedidoExtensao.status === 'aprovado' ? 'aprovada' : 'rejeitada'}
                                {r.pedidoExtensao.status === 'aprovado' && ` · nova data fim: ${r.pedidoExtensao.novaDataFim}`}
                              </p>
                            </div>
                          )}

                          </>}

                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* TAB: Calendário */}
        {tab === 'calendario' && (() => {
          const inRange = (d: string, s: string, e: string) => d >= s && d <= e;

          const calDateResv = selectedCalDate
            ? aluguerReservations.filter(r =>
                (selectedVehicle === null || r.vehicleId === selectedVehicle) &&
                r.status !== 'cancelada' && r.status !== 'concluida' &&
                inRange(selectedCalDate, r.dataInicio, r.dataFim)
              )
            : [];

          const calDateBlocks = selectedCalDate
            ? blocks.filter(b =>
                (selectedVehicle === null || b.vehicleId === null || b.vehicleId === selectedVehicle) &&
                inRange(selectedCalDate, b.dataInicio, b.dataFim)
              )
            : [];

          const fmtCalDate = (d: string) =>
            new Date(d + 'T00:00:00').toLocaleDateString('pt-MZ', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });

          return (
            <div className="grid lg:grid-cols-3 gap-6">

              {/* Left: selector + detail panel */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4">
                  <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-2">Viatura</label>
                  <select
                    value={selectedVehicle ?? ''}
                    onChange={e => {
                      setSelectedVehicle(e.target.value ? Number(e.target.value) : null);
                      setSelectedCalDate(null);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Visão geral da frota</option>
                    {aluguerVehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                {/* Date detail panel */}
                {selectedCalDate ? (
                  <div className="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-start justify-between gap-2">
                      <p className="text-xs font-black text-white leading-snug capitalize">
                        {fmtCalDate(selectedCalDate)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCalDate(null)}
                        className="text-white/40 hover:text-white text-xl leading-none shrink-0"
                      >×</button>
                    </div>

                    {calDateResv.length === 0 && calDateBlocks.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <p className="text-sm font-bold text-emerald-400">Disponível</p>
                        <p className="text-xs text-white/60 mt-1">
                          {selectedVehicle ? vehicleName(selectedVehicle) : 'Toda a frota'} · sem ocupações
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800/80">

                        {/* Reservations on this date */}
                        {calDateResv.map(r => {
                          const st = STATUS_CFG[r.status];
                          return (
                            <div key={r.id} className="px-4 py-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Reservado</span>
                                <span className={`ml-auto text-[10px] border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>
                                  {st.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
                                  {r.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-white leading-tight truncate">{r.clientName}</p>
                                  {r.clientPhone && <p className="text-[10px] text-white/60">{r.clientPhone}</p>}
                                  {!r.clientPhone && r.clientEmail && <p className="text-[10px] text-white/60">{r.clientEmail}</p>}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                  <span className="text-white">{vehicleName(r.vehicleId)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  <span className="text-white tabular-nums">{r.dataInicio} → {r.dataFim}</span>
                                </div>
                                {r.localLevantamento && (
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <span className="text-white/70">{r.localLevantamento}</span>
                                  </div>
                                )}
                                {r.motivoViagem && (
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                                    <span className="text-white/70 italic">{r.motivoViagem}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Blocks on this date */}
                        {calDateBlocks.map(b => (
                          <div key={b.id} className="px-4 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Bloqueado</span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-[11px]">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/70 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                <span className="text-white font-semibold capitalize">{b.motivo.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px]">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                <span className="text-white">{b.vehicleId === null ? 'Toda a frota' : vehicleName(b.vehicleId)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px]">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span className="text-white tabular-nums">{b.dataInicio} → {b.dataFim}</span>
                              </div>
                              {b.descricao && (
                                <div className="mt-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-red-300 italic">{b.descricao}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-amber-500/20 rounded-xl px-4 py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <p className="text-sm font-bold text-white">Clique numa data</p>
                    <p className="text-xs text-white/50 mt-1">para ver os detalhes de ocupação</p>
                  </div>
                )}
              </div>

              {/* Right: Calendar */}
              <div className="lg:col-span-2">
                <AvailabilityCalendar
                  vehicleId={selectedVehicle}
                  selectedDate={selectedCalDate}
                  onSelectDate={setSelectedCalDate}
                />
              </div>
            </div>
          );
        })()}

        {/* TAB: Bloqueios */}
        {tab === 'bloqueios' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowBlockModal(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-400/20 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                + Novo bloqueio
              </button>
            </div>
            <div className="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden divide-y divide-zinc-800">
              {blocks.length === 0 && (
                <p className="text-center py-12 text-white text-sm">Sem bloqueios activos</p>
              )}
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{b.motivo.replace('_', ' ')}</p>
                    <p className="text-xs text-white">
                      {b.vehicleId === null ? 'Toda a frota' : vehicleName(b.vehicleId)} · {b.dataInicio} → {b.dataFim}
                    </p>
                    {b.descricao && <p className="text-xs text-white mt-0.5 italic">{b.descricao}</p>}
                  </div>
                  <button
                    onClick={() => removeBlock(b.id)}
                    className="text-xs text-red-400 hover:text-red-300 shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 font-semibold transition-all"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            {blocks.length > 0 && (
              <p className="text-xs text-white">{blocks.length} bloqueio(s) activo(s)</p>
            )}
          </div>
        )}

        {/* TAB: Em Uso */}
        {tab === 'em_uso' && <ViaturaEmUsoPage />}

        {/* TAB: Regras */}
        {tab === 'regras' && <BusinessRulesPanel />}

      </div>
    </div>
  );
}
