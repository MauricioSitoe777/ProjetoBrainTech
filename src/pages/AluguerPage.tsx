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
  const { reservations, blocks, updateReservation, cancelReservation, removeBlock, marcarPrestacao, rules } = useReservations();
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

  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [contractReservation, setContractReservation] = useState<Reservation | null>(null);
  const [lastActedId, setLastActedId] = useState<string | null>(null);
  const [acoesFilter, setAcoesFilter] = useState<ReservationStatus | 'todos'>('todos');

  const [gerirId,      setGerirId]      = useState<string | null>(null);
  const [acoesSearch,  setAcoesSearch]  = useState('');
  const [reservaModal, setReservaModal] = useState<Reservation | null>(null);
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
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // After an action, scroll the drawer into view if open
  useEffect(() => {
    if (!lastActedId) return;
    const clear = setTimeout(() => setLastActedId(null), 3500);
    return () => clearTimeout(clear);
  }, [lastActedId]);

  // Alertas automáticos de devolução — hoje e amanhã
  useEffect(() => {
    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    reservations
      .filter(r => aluguerIds.has(r.vehicleId) && r.status === 'ativa' && r.userId)
      .forEach(r => {
        const veiculo = allVehicles.find(v => v.id === r.vehicleId)?.name ?? `Viatura #${r.vehicleId}`;

        if (r.dataFim === today) {
          const key = `rentcar:alerta_devolucao:${r.id}:${today}`;
          if (!localStorage.getItem(key)) {
            addNotification(
              r.userId!,
              `Devolução hoje — ${veiculo}`,
              `O seu aluguer do ${veiculo} termina hoje. Devolva a viatura antes das ${r.horaDevolucao || '18:00'}. ⚠️ Após esse horário, as multas por atraso iniciam automaticamente (${fmt(rules.penalizacaoAtrasoPorHora)}/hora).`,
              'alert',
              r.id,
              '/perfil?section=reservas',
            );
            localStorage.setItem(key, '1');
          }
        }

        if (r.dataFim === tomorrow) {
          const key = `rentcar:alerta_amanha:${r.id}:${today}`;
          if (!localStorage.getItem(key)) {
            addNotification(
              r.userId!,
              `Lembrete: devolução amanhã — ${veiculo}`,
              `O seu aluguer do ${veiculo} termina amanhã. Devolva a viatura a tempo para evitar multas por atraso de ${fmt(rules.penalizacaoAtrasoPorHora)}/hora após o prazo.`,
              'info',
              r.id,
              '/perfil?section=reservas',
            );
            localStorage.setItem(key, '1');
          }
        }

        // Carro em atraso — notificar cliente E admin uma vez por dia
        if (r.dataFim < today) {
          const diasAtraso = Math.floor((new Date(today).getTime() - new Date(r.dataFim).getTime()) / 86400000);
          const horasAtraso = diasAtraso * 24;
          const multaAcumulada = horasAtraso * rules.penalizacaoAtrasoPorHora;

          const keyCli = `rentcar:alerta_atraso_cli:${r.id}:${today}`;
          if (!localStorage.getItem(keyCli)) {
            addNotification(
              r.userId!,
              `Devolução em atraso — ${veiculo}`,
              `O seu aluguer do ${veiculo} está em atraso há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}. Multa acumulada: ${fmt(multaAcumulada)} (${fmt(rules.penalizacaoAtrasoPorHora)}/hora). Contacte-nos urgentemente.`,
              'alert',
              r.id,
              '/perfil?section=reservas',
            );
            localStorage.setItem(keyCli, '1');
          }

          const keyAdm = `rentcar:alerta_atraso_adm:${r.id}:${today}`;
          if (!localStorage.getItem(keyAdm)) {
            addNotification(
              'admin',
              `Carro em atraso — ${r.clientName}`,
              `"${r.clientName}" não devolveu o ${veiculo}. Atraso: ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''} · Multa acumulada: ${fmt(multaAcumulada)} (${fmt(rules.penalizacaoAtrasoPorHora)}/h).`,
              'alert',
              r.id,
              '/admin/aluguer?tab=acoes&status=ativa',
            );
            localStorage.setItem(keyAdm, '1');
          }
        }
      });
    // Notificar cliente quando a devolução está pendente (estado devolucao_pendente)
    reservations
      .filter(r => aluguerIds.has(r.vehicleId) && r.status === 'devolucao_pendente' && r.userId)
      .forEach(r => {
        const veiculo = allVehicles.find(v => v.id === r.vehicleId)?.name ?? `Viatura #${r.vehicleId}`;
        const key = `rentcar:alerta_dev_pendente:${r.id}:${today}`;
        if (!localStorage.getItem(key)) {
          const multa = r.multaAtraso ?? 0;
          addNotification(
            r.userId!,
            `Devolução pendente — ${veiculo}`,
            multa > 0
              ? `A devolução do ${veiculo} está pendente. Multa acumulada: ${fmt(multa)}. Cada hora adicional de atraso acrescenta ${fmt(rules.penalizacaoAtrasoPorHora)}. Dirija-se às nossas instalações urgentemente.`
              : `A devolução do ${veiculo} está registada como pendente. Se houver atraso na entrega, as multas iniciam a contagem (${fmt(rules.penalizacaoAtrasoPorHora)}/hora). Por favor dirija-se às nossas instalações.`,
            'alert',
            r.id,
            '/perfil?section=reservas',
          );
          localStorage.setItem(key, '1');
        }
      });
  }, [reservations, aluguerIds, allVehicles, addNotification, rules]);

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

      {/* ── Modal de detalhes de reserva (tab Reservas) ── */}
      {reservaModal && (() => {
        const r = reservaModal;
        const st = STATUS_CFG[r.status];
        const depositoConfirmado = ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente', 'concluida'].includes(r.status);
        const pago = r.prestacoes
          ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
          : (depositoConfirmado ? (r.deposito ?? 0) : 0);
        const divida = Math.max(0, r.valorTotal - pago);
        const pct = r.valorTotal > 0 ? Math.round((pago / r.valorTotal) * 100) : 0;
        const totalDays = Math.max(1, Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86400000));
        const tarifaDiaria = r.valorTotal / totalDays;
        const mot = r.motoristaId ? motoristas.find(m => m.id === r.motoristaId) : null;
        const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const fmtD = (iso: string) => { const [,m,d] = iso.split('-'); return `${d} ${MESES[parseInt(m)-1]}`; };
        const payCtx: Record<string, { label: string; col: string; bg: string }> = {
          pendente:            { label: 'Aguarda Depósito',     col: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
          confirmada:          { label: 'Depósito Recebido',    col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          pronta_levantamento: { label: 'Pronto p/ Entrega',    col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ativa:               { label: 'Aluguer em Curso',     col: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
          devolucao_pendente:  { label: 'Liquidação Pendente',  col: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
          concluida:           { label: 'Totalmente Liquidado', col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          cancelada:           { label: 'Cancelado',            col: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
        };
        const ctx = payCtx[r.status] ?? { label: '', col: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-20 pb-4" onClick={() => setReservaModal(null)}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
              className="relative z-10 w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-96px)] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                    {r.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{r.clientName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] border rounded-md px-1.5 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">#{r.id.slice(0,8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReservaModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 min-h-0">

                {/* Tracker */}
                <div className="px-5 py-4 border-b border-zinc-800">
                  <ReservationTracker
                    status={r.status}
                    readonly
                    stepDates={{
                      pendente: r.createdAt,
                      pronta_levantamento: r.dataInicio,
                      ativa: r.dataInicio,
                      devolucao_pendente: r.dataFim,
                      concluida: r.dataFim,
                    }}
                  />
                </div>

                {/* Cliente + Viatura */}
                <div className="px-5 py-4 border-b border-zinc-800 grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5">Cliente</p>
                    <p className="text-xs font-black text-white mb-0.5">{r.clientName}</p>
                    {mot && <p className="text-[10px] text-amber-400 mb-0.5">Mot: {mot.nome}</p>}
                    {r.clientPhone && <p className="text-[11px] text-zinc-400">{r.clientPhone}</p>}
                    {r.clientEmail && <p className="text-[10px] text-zinc-400 truncate">{r.clientEmail}</p>}
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5">Viatura</p>
                    <p className="text-xs font-black text-white mb-0.5">{vehicleName(r.vehicleId)}</p>
                    <p className="text-[11px] text-zinc-400">{fmt(tarifaDiaria)}/dia · {totalDays}d</p>
                    <p className="text-[10px] text-zinc-400 tabular-nums">{fmtD(r.dataInicio)} → {fmtD(r.dataFim)}</p>
                    {r.localLevantamento && <p className="text-[10px] text-zinc-400 mt-0.5">{r.localLevantamento}</p>}
                  </div>
                </div>

                {/* Pagamento */}
                {r.valorTotal > 0 && (
                  <div className="px-5 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Pagamento</p>
                      {ctx.label && (
                        <span className={`text-[9px] font-black border rounded-md px-2 py-0.5 uppercase tracking-wider ${ctx.col} ${ctx.bg}`}>
                          {ctx.label}
                        </span>
                      )}
                    </div>

                    {/* Barra */}
                    {r.prestacoes && r.prestacoes.length > 0 ? (
                      <div className="flex gap-1 mb-3">
                        {r.prestacoes.map((p, i) => (
                          <div key={i} className="flex-1 h-2 rounded-sm overflow-hidden bg-zinc-800">
                            <div className={`h-full transition-all ${p.paga ? 'bg-emerald-500' : ''}`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-zinc-400 mb-0.5">Total</p>
                        <p className="text-sm font-black text-white">{fmt(r.valorTotal)}</p>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-emerald-400 mb-0.5">Pago {pct > 0 ? `(${pct}%)` : ''}</p>
                        <p className="text-sm font-black text-emerald-400">{fmt(pago)}</p>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-amber-400 mb-0.5">Em dívida</p>
                        <p className="text-sm font-black text-amber-400">{fmt(divida)}</p>
                      </div>
                    </div>

                    {/* Prestações */}
                    {r.prestacoes && r.prestacoes.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Plano de Prestações</p>
                        <div className="space-y-1">
                          {r.prestacoes.map(p => (
                            <div key={p.numero} className={`flex items-center justify-between py-2 px-3 rounded-xl border ${
                              p.paga ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-zinc-800/40 border-zinc-700/40'
                            }`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${p.paga ? 'bg-emerald-500 border-emerald-400' : 'border-zinc-600'}`}>
                                  {p.paga && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className="text-xs font-black text-white">{p.numero}ª</span>
                                <span className={`text-[10px] ${p.paga ? 'text-emerald-400/70' : 'text-zinc-400'}`}>{p.dataPagamento ?? p.dataVencimento}</span>
                              </div>
                              <span className={`text-xs font-black ${p.paga ? 'text-emerald-400' : 'text-white'}`}>{fmt(p.valorPago ?? p.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Motivo de viagem / notas */}
                {(r.motivoViagem || r.notas) && (
                  <div className="px-5 py-4">
                    {r.motivoViagem && (
                      <div className="mb-2">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Motivo da Viagem</p>
                        <p className="text-xs text-zinc-300 italic">{r.motivoViagem}</p>
                      </div>
                    )}
                    {r.notas && (
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Notas</p>
                        <p className="text-xs text-zinc-300">{r.notas}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

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
              label: 'Prontas p/ Levantar', sub: 'Prontas para Entrega',
              value: kpis.prontas,
              numCol: kpis.prontas > 0 ? 'text-amber-400' : 'text-white',
              iconCol: 'text-amber-400',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              bar: 'bg-amber-500',
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
            },
            {
              label: 'Alugueres Activos', sub: 'Em Uso Agora',
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
                      <tr
                        key={r.id}
                        onClick={() => setReservaModal(r)}
                        className={`cursor-pointer hover:bg-zinc-800/60 transition-colors ${idx % 2 !== 0 ? 'bg-zinc-800/30' : ''}`}
                      >
                        <td className="px-5 py-4 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white">{r.clientName}</p>
                          <p className="text-xs text-zinc-400">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-sm text-white">{vehicleName(r.vehicleId)}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-white tabular-nums">{r.dataInicio} → {r.dataFim}</p>
                          {r.motivoViagem && <p className="text-[10px] text-zinc-400 mt-0.5 italic">{r.motivoViagem}</p>}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <p className="text-sm text-white tabular-nums">{r.dataFim}</p>
                          <p className="text-xs text-zinc-400">{r.horaDevolucao}</p>
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

        {/* TAB: Ações — grid compacto + drawer lateral */}
        {tab === 'acoes' && (() => {
          const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const fmtD = (iso: string) => { const [,m,d] = iso.split('-'); return `${d} ${MESES_ABR[parseInt(m)-1]}`; };
          const totalAcionaveis = aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length;
          const gruposVisiveis = GRUPOS.filter(g => acoesFilter === 'todos' || g.status === acoesFilter);
          const flatList = gruposVisiveis
            .flatMap(g => aluguerReservations.filter(r => r.status === g.status))
            .filter(r => {
              if (!acoesSearch.trim()) return true;
              const q = acoesSearch.toLowerCase();
              return r.clientName.toLowerCase().includes(q) || vehicleName(r.vehicleId).toLowerCase().includes(q);
            });
          const gerirR = gerirId ? aluguerReservations.find(r => r.id === gerirId) ?? null : null;

          return (
            <div className="space-y-4">

              {/* Header + search */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">Filtros e Pesquisa</h2>
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Nome, Matrícula..."
                    value={acoesSearch}
                    onChange={e => setAcoesSearch(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-9 pr-4 py-2 text-sm placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors w-56"
                  />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setAcoesFilter('todos')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${acoesFilter === 'todos' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                >
                  Todos
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${acoesFilter === 'todos' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/80 text-zinc-400'}`}>{totalAcionaveis}</span>
                </button>
                {GRUPOS.map(g => {
                  const count = aluguerReservations.filter(r => r.status === g.status).length;
                  const isActive = acoesFilter === g.status;
                  return (
                    <button
                      key={g.status}
                      onClick={() => setAcoesFilter(isActive ? 'todos' : g.status)}
                      disabled={count === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                        isActive
                          ? `${g.badge} border-current`
                          : count === 0
                            ? 'text-zinc-600 border-zinc-800/50 cursor-not-allowed'
                            : 'text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${count === 0 ? 'bg-zinc-700' : g.dot}`} />
                      {g.title}
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        isActive ? 'bg-black/20 text-current' : count === 0 ? 'bg-zinc-800/40 text-zinc-600' : 'bg-zinc-800/80 text-zinc-400'
                      }`}>{count}</span>
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
                                  <p className="text-[10px] text-white/40">Data Fim Actual</p>
                                  <p className="text-xs font-black text-white">{r.dataFim}</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 text-center">
                                  <p className="text-[10px] text-amber-400/70">Nova Data Sugerida</p>
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
                              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Motivo do Cliente</p>
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

              {/* Empty state */}
              {flatList.length === 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-xl py-12 text-center text-zinc-400 text-sm">
                  Sem reservas com ações pendentes
                </div>
              )}

              {/* ── Grid de reservas ── */}
              {flatList.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                    LISTAGEM DE RESERVAS&nbsp;<span className="text-amber-400">{flatList.length}</span>
                  </p>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {flatList.map(r => {
                        const st = STATUS_CFG[r.status];
                        const depConf = ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente', 'concluida'].includes(r.status);
                        const pagoCard = r.prestacoes
                          ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
                          : (depConf ? (r.deposito ?? 0) : 0);
                        const dividaCard = Math.max(0, r.valorTotal - pagoCard);
                        const fmtDate = (iso: string) => { const [,m,d] = iso.split('-'); return `${d} ${MESES_ABR[parseInt(m)-1]}`; };
                        return (
                          <div
                            key={r.id}
                            onClick={() => setGerirId(r.id === gerirId ? null : r.id)}
                            className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:border-zinc-600 ${
                              gerirId === r.id
                                ? 'border-amber-500/60 ring-2 ring-amber-500/20'
                                : lastActedId === r.id
                                  ? 'border-amber-500/40 ring-1 ring-amber-500/10'
                                  : 'border-zinc-800'
                            }`}
                          >
                            {/* Avatar + nome */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                                {r.clientName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-white truncate leading-tight">{r.clientName}</p>
                                {r.clientPhone && <p className="text-[10px] text-zinc-500">{r.clientPhone}</p>}
                              </div>
                              {r.pedidoExtensao?.status === 'pendente' && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Extensão pendente" />
                              )}
                            </div>

                            {/* Viatura */}
                            <div className="flex items-center gap-2 text-xs text-white">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-400">
                                <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/>
                                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                              </svg>
                              <span className="truncate">{vehicleName(r.vehicleId)}</span>
                            </div>

                            {/* Datas */}
                            <div className="flex items-center gap-2 text-xs text-white">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-400">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <span className="tabular-nums">{fmtDate(r.dataInicio)} → {fmtDate(r.dataFim)}</span>
                            </div>

                            {/* Status + dívida */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                              <span className={`text-[10px] border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                              {dividaCard > 0
                                ? <span className="text-xs font-black text-amber-400">{fmt(dividaCard)}</span>
                                : <span className="text-xs font-black text-emerald-400">Liquidado</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Modal de detalhe (Ações) ── */}
              {gerirR && (() => {
                const r = gerirR;
                const st = STATUS_CFG[r.status];
                const depositoConfirmado = ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente', 'concluida'].includes(r.status);
                const pago = r.prestacoes
                  ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
                  : (depositoConfirmado ? (r.deposito ?? 0) : 0);
                const divida = Math.max(0, r.valorTotal - pago);
                const pct = r.valorTotal > 0 ? Math.round((pago / r.valorTotal) * 100) : 0;
                const nextPrest = r.prestacoes?.find(p => !p.paga);
                const totalDays = Math.max(1, Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86400000));
                const daysRemaining = Math.max(0, Math.ceil((new Date(r.dataFim).getTime() - Date.now()) / 86400000));
                const tarifaDiaria = r.valorTotal / totalDays;
                const mot = r.motoristaId ? motoristas.find(m => m.id === r.motoristaId) : null;
                const isShortRental = totalDays <= 5;
                return (
                  <div className="fixed inset-0 z-40 flex items-center justify-center px-4 pt-20 pb-4" onClick={() => setGerirId(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-96px)] overflow-hidden" onClick={e => e.stopPropagation()}>

                      {/* Drawer header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
                            {r.clientName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">{r.clientName}</p>
                            <span className={`text-[10px] border rounded-md px-1.5 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setGerirId(null)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>

                      {/* Drawer body */}
                      <div className="flex-1 min-h-0 overflow-y-auto">

                        {/* Tracker */}
                        <div className="px-4 py-3 border-b border-zinc-800">
                          <ReservationTracker
                            status={r.status}
                            onAdvance={next => {
                              if (next === 'confirmada') {
                                // Pagamento total obrigatório no início
                                const today = new Date().toISOString().split('T')[0];
                                const p: Prestacao = { numero: 1, dataVencimento: today, valor: r.valorTotal, paga: false };
                                updateReservation(r.id, { prestacoes: [p] });
                                setPagamentoModal({
                                  reservationId: r.id,
                                  prestacao: p,
                                  titulo: 'Registar Pagamento Total do Aluguer',
                                  onAfterSave: () => { updateReservation(r.id, { status: 'confirmada' }); setLastActedId(r.id); },
                                });
                              } else if (next === 'concluida') {
                                const multaAtraso = r.multaAtraso ?? 0;
                                const unpaid = r.prestacoes?.filter(p => !p.paga) ?? [];
                                if (pago >= r.valorTotal) {
                                  // Aluguer pago — multa é separada
                                  if (multaAtraso > 0) {
                                    const multaNum = (r.prestacoes?.length ?? 0) + 1;
                                    const multaPrest: Prestacao = {
                                      numero: multaNum,
                                      dataVencimento: new Date().toISOString().split('T')[0],
                                      valor: multaAtraso,
                                      paga: false,
                                    };
                                    updateReservation(r.id, { prestacoes: [...(r.prestacoes ?? []), multaPrest] });
                                    setPagamentoModal({
                                      reservationId: r.id,
                                      prestacao: multaPrest,
                                      titulo: 'Registar Pagamento de Multa por Atraso',
                                      onAfterSave: () => { updateReservation(r.id, { status: 'concluida' }); setLastActedId(r.id); },
                                    });
                                  } else {
                                    updateReservation(r.id, { status: 'concluida' });
                                    setLastActedId(r.id);
                                  }
                                } else if (unpaid.length > 0) {
                                  const finalPrest = unpaid.at(-1)!;
                                  setPagamentoModal({
                                    reservationId: r.id,
                                    prestacao: finalPrest,
                                    titulo: 'Registar Pagamento do Aluguer',
                                    onAfterSave: () => { updateReservation(r.id, { status: 'concluida' }); setLastActedId(r.id); },
                                  });
                                } else {
                                  const pendNum = (r.prestacoes?.length ?? 0) + 1;
                                  const pendPrest: Prestacao = {
                                    numero: pendNum,
                                    dataVencimento: new Date().toISOString().split('T')[0],
                                    valor: Math.max(0, r.valorTotal - pago),
                                    paga: false,
                                  };
                                  updateReservation(r.id, { prestacoes: [...(r.prestacoes ?? []), pendPrest] });
                                  setPagamentoModal({
                                    reservationId: r.id,
                                    prestacao: pendPrest,
                                    titulo: 'Registar Pagamento do Aluguer',
                                    onAfterSave: () => { updateReservation(r.id, { status: 'concluida' }); setLastActedId(r.id); },
                                  });
                                }
                              } else if (next === 'devolucao_pendente') {
                                const todayD = new Date().toISOString().split('T')[0];
                                let multaFinal = 0;
                                if (r.dataFim < todayD) {
                                  const devTime = new Date(`${r.dataFim}T${r.horaDevolucao || '18:00'}`);
                                  const horasAtraso = Math.ceil((Date.now() - devTime.getTime()) / 3600000);
                                  multaFinal = Math.max(0, horasAtraso) * rules.penalizacaoAtrasoPorHora;
                                }
                                updateReservation(r.id, {
                                  status: 'devolucao_pendente',
                                  ...(multaFinal > 0 && { multaAtraso: multaFinal }),
                                });
                                setLastActedId(r.id);
                                setAcoesFilter('todos');
                              } else {
                                updateReservation(r.id, { status: next });
                                setLastActedId(r.id);
                              }
                            }}
                            onCancel={motivo => { cancelReservation(r.id, motivo); setLastActedId(r.id); }}
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

                        {/* Cliente + Viatura */}
                        <div className="px-4 py-3 border-b border-zinc-800 grid grid-cols-2 gap-2">
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5">Cliente</p>
                            <p className="text-xs font-black text-white mb-0.5 truncate">{r.clientName}</p>
                            {mot && <p className="text-[10px] text-amber-400 mb-0.5">Mot: {mot.nome}</p>}
                            {r.clientPhone && <p className="text-[11px] text-white">{r.clientPhone}</p>}
                            {r.clientEmail && <p className="text-[10px] text-white truncate">{r.clientEmail}</p>}
                          </div>
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5">Viatura</p>
                            <p className="text-xs font-black text-white mb-0.5 truncate">{vehicleName(r.vehicleId)}</p>
                            <p className="text-[11px] text-white">{fmt(tarifaDiaria)}/dia · {totalDays}d</p>
                            <p className="text-[10px] text-white tabular-nums">{r.dataInicio} → {r.dataFim}</p>
                            {daysRemaining <= 1 && r.status === 'ativa' && (
                              <p className="text-[10px] font-black text-red-400 mt-0.5">
                                {daysRemaining === 0 ? 'Devolução hoje!' : 'Devolução amanhã'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Pagamento */}
                        {r.valorTotal > 0 && (() => {
                          const payCtx: Record<string, { label: string; col: string; bg: string }> = {
                            pendente:            { label: 'Aguarda Depósito',     col: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                            confirmada:          { label: 'Depósito Recebido',    col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                            pronta_levantamento: { label: 'Pronto p/ Entrega',    col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                            ativa:               { label: 'Aluguer em Curso',     col: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                            devolucao_pendente:  { label: 'Liquidação Pendente',  col: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
                            concluida:           { label: 'Totalmente Liquidado', col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                            cancelada:           { label: 'Cancelado',            col: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
                          };
                          const ctx = payCtx[r.status] ?? { label: '', col: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
                          return (
                            <div className="px-4 py-3 border-b border-zinc-800">
                              <div className="flex items-center gap-2 mb-3">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Pagamento</p>
                                {ctx.label && (
                                  <span className={`text-[9px] font-black border rounded-md px-2 py-0.5 uppercase tracking-wider ${ctx.col} ${ctx.bg}`}>
                                    {ctx.label}
                                  </span>
                                )}
                              </div>

                              {/* Barra de progresso */}
                              {r.prestacoes && r.prestacoes.length > 0 ? (
                                <div className="flex gap-1 mb-4">
                                  {r.prestacoes.map((p, i) => (
                                    <div key={i} className="flex-1 h-2 rounded-sm overflow-hidden bg-zinc-800">
                                      <div className={`h-full transition-all ${p.paga ? 'bg-emerald-500' : ''}`} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-4">
                                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
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
                                  <p className="text-[10px] text-amber-400 mb-1">Em dívida</p>
                                  <p className="text-sm font-black text-amber-400">{fmt(divida)}</p>
                                </div>
                              </div>

                              {/* Multa por atraso */}
                              {r.multaAtraso != null && r.multaAtraso > 0 && (() => {
                                const horasMulta = rules.penalizacaoAtrasoPorHora > 0
                                  ? Math.round(r.multaAtraso! / rules.penalizacaoAtrasoPorHora)
                                  : 0;
                                const diasMulta = Math.floor(horasMulta / 24);
                                const horasRest = horasMulta % 24;
                                return (
                                  <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12.01" y1="16" x2="12" y2="16"/></svg>
                                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Multa por Atraso</p>
                                      </div>
                                      <p className="text-sm font-black text-red-400">{fmt(r.multaAtraso!)}</p>
                                    </div>
                                    <p className="text-[10px] text-red-300/60">
                                      {diasMulta > 0 ? `${diasMulta}d ` : ''}{horasRest}h de atraso · {fmt(rules.penalizacaoAtrasoPorHora)}/hora
                                    </p>
                                    <div className="mt-1.5 pt-1.5 border-t border-red-500/20 flex items-center justify-between">
                                      <p className="text-[10px] text-white/60">Total com multa</p>
                                      <p className="text-xs font-black text-red-300">{fmt(r.valorTotal + r.multaAtraso!)}</p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Prestações */}
                              {r.prestacoes && r.prestacoes.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Plano de Prestações</p>
                                  <div className="space-y-1">
                                    {r.prestacoes.map(p => (
                                      <div key={p.numero} className={`flex items-center justify-between py-2 px-3 rounded-xl border transition ${
                                        p.paga
                                          ? 'bg-emerald-500/5 border-emerald-500/15'
                                          : new Date(p.dataVencimento) < new Date() ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-800/40 border-zinc-700/40'
                                      }`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${p.paga ? 'bg-emerald-500 border-emerald-400' : 'border-zinc-600'}`}>
                                            {p.paga && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                          </div>
                                          <span className="text-xs font-black text-white">{p.numero}ª</span>
                                          <span className={`text-[10px] ${p.paga ? 'text-emerald-400/70' : new Date(p.dataVencimento) < new Date() ? 'text-red-400' : 'text-white'}`}>
                                            {p.dataPagamento ?? p.dataVencimento}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
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

                              {/* Próximo pagamento */}
                              {nextPrest && (
                                <div className="mt-3 flex items-center justify-between bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-4 py-2.5">
                                  <p className="text-xs text-white">Próximo pagamento</p>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-amber-400">{fmt(nextPrest.valor)}</p>
                                    <p className="text-[10px] text-zinc-400">{nextPrest.dataVencimento}</p>
                                  </div>
                                </div>
                              )}

                              {/* Registo de pagamentos */}
                              {(() => {
                                const FORMA_MAP: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros' };
                                const pagos = (r.prestacoes ?? []).filter(p => p.paga && (p.formaPagamento || p.referenciaPagamento || p.notasPagamento || p.dataPagamento));
                                if (pagos.length === 0) return null;
                                return (
                                  <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Registo de Pagamentos</p>
                                    <div className="space-y-2">
                                      {pagos.map(p => (
                                        <div key={p.numero} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                              <span className="text-xs font-black text-white">{p.numero}ª Prestação</span>
                                              <span className="text-sm font-black text-emerald-400 tabular-nums">{fmt(p.valorPago ?? p.valor)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-white">
                                              {p.dataPagamento && <span>{p.dataPagamento}{p.horaPagamento ? ` · ${p.horaPagamento}` : ''}</span>}
                                              {p.formaPagamento && <span className="font-bold text-amber-400">{FORMA_MAP[p.formaPagamento] ?? p.formaPagamento}</span>}
                                              {p.referenciaPagamento && <span className="font-mono text-white/70">Ref: {p.referenciaPagamento}</span>}
                                            </div>
                                            {p.notasPagamento && <p className="text-[11px] text-white/70 italic mt-0.5">{p.notasPagamento}</p>}
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

                        {/* Historial de extensão */}
                        {r.pedidoExtensao && r.pedidoExtensao.status !== 'pendente' && (
                          <div className={`mx-4 my-3 rounded-xl border px-3 py-2.5 flex items-center gap-3 ${
                            r.pedidoExtensao.status === 'aprovado'
                              ? 'border-emerald-500/20 bg-emerald-500/5'
                              : 'border-zinc-800 bg-zinc-900/30'
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

                      </div>
                    </div>
                  </div>
                );
              })()}
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
