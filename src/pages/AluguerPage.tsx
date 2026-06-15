import { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { useReservations } from '../context/ReservationsContext';
import { useMotoristas } from '../context/MotoristasContext';
import { AvailabilityCalendar } from '../components/reservations/AvailabilityCalendar';
import { BlockPeriodModal } from '../components/reservations/BlockPeriodModal';
import { BusinessRulesPanel } from '../components/reservations/BusinessRulesPanel';
import { ReservationTracker } from '../components/ReservationTracker';
import type { ReservationStatus } from '../types/reservation';

const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente:            { label: 'Reserva Pendente',       className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Ativo',          className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

type Tab = 'reservas' | 'acoes' | 'calendario' | 'bloqueios' | 'regras';

const GRUPOS: Array<{
  status: ReservationStatus;
  title: string;
  dot: string;
  badge: string;
  textColor: string;
}> = [
  { status: 'devolucao_pendente',  title: 'Devolução Pendente',      dot: 'bg-orange-400', badge: 'bg-orange-400/10 text-orange-400 border-orange-400/20', textColor: 'text-orange-400' },
  { status: 'ativa',               title: 'Alugueres Ativos',        dot: 'bg-blue-400',   badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',       textColor: 'text-blue-400'   },
  { status: 'pronta_levantamento', title: 'Prontas p/ Levantamento', dot: 'bg-sky-400',    badge: 'bg-sky-400/10 text-sky-400 border-sky-400/20',           textColor: 'text-sky-400'    },
  { status: 'confirmada',          title: 'Reservas Confirmadas',    dot: 'bg-emerald-400',badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',textColor: 'text-emerald-400'},
  { status: 'pendente',            title: 'Reservas Pendentes',      dot: 'bg-amber-400',  badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',     textColor: 'text-amber-400'  },
];

const aluguerVehicles = VEHICLES.filter(v => v.mode === 'aluguer');
const aluguerIds = new Set(aluguerVehicles.map(v => v.id));

export function AluguerPage({ onExit }: { onExit?: () => void }) {
  const { reservations, blocks, updateReservation, cancelReservation, removeBlock } = useReservations();
  const { motoristas } = useMotoristas();
  const [tab, setTab] = useState<Tab>('reservas');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const aluguerReservations = useMemo(() =>
    reservations.filter(r => aluguerIds.has(r.vehicleId)),
    [reservations]
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

  const vehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const accionaveisCount = aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length;

  const tabList: { key: Tab; label: string }[] = [
    { key: 'reservas',   label: `Histórico (${historico.length})` },
    { key: 'acoes',      label: `Ações (${accionaveisCount})` },
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Reservas Pendentes',  value: kpis.pendentes,         color: 'text-amber-400',  dot: 'bg-amber-400' },
            { label: 'Prontas p/ Levantar', value: kpis.prontas,           color: 'text-sky-400',    dot: 'bg-sky-400' },
            { label: 'Alugueres Ativos',    value: kpis.ativas,            color: 'text-blue-400',   dot: 'bg-blue-400' },
            { label: 'Devolução Pendente',  value: kpis.devolucaoPendente, color: 'text-orange-400', dot: 'bg-orange-400' },
            { label: 'Cancelamentos',       value: kpis.cancelamentos,     color: 'text-red-400',    dot: 'bg-red-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                <span className="text-xs text-white uppercase font-bold tracking-wide leading-tight">{k.label}</span>
              </div>
              <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
          {tabList.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden md:table-cell">Viatura</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Período</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden sm:table-cell">Devolução</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {historico.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">Sem histórico de alugueres ainda</td></tr>
                  )}
                  {historico.map(r => {
                    const st = STATUS_CFG[r.status];
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-white">{r.clientName}</p>
                          <p className="text-xs text-zinc-500">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-sm text-white">{vehicleName(r.vehicleId)}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-white tabular-nums">{r.dataInicio} → {r.dataFim}</p>
                          {r.motivoViagem && <p className="text-[10px] text-zinc-400 mt-0.5 italic">{r.motivoViagem}</p>}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <p className="text-sm text-white tabular-nums">{r.dataFim}</p>
                          <p className="text-xs text-zinc-400">{r.horaDevolucao}</p>
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
                  {historico.length} registo(s) no histórico
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Ações — separado por estado */}
        {tab === 'acoes' && (() => {
          const totalAcionaveis = aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length;
          return (
            <div className="space-y-8">
              {totalAcionaveis === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-12 text-center text-zinc-500 text-sm">
                  Sem reservas com acções pendentes
                </div>
              )}
              {GRUPOS.map(grupo => {
                const lista = aluguerReservations.filter(r => r.status === grupo.status);
                if (lista.length === 0) return null;
                return (
                  <div key={grupo.status} className="space-y-3">
                    {/* Cabeçalho de secção */}
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${grupo.dot}`} />
                      <h3 className={`text-xs font-black uppercase tracking-widest ${grupo.textColor}`}>
                        {grupo.title}
                      </h3>
                      <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${grupo.badge}`}>
                        {lista.length}
                      </span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    {/* Cards do grupo */}
                    {lista.map(r => {
                      const st = STATUS_CFG[r.status];
                      return (
                        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-4 hover:border-zinc-700 transition-colors">
                          {/* Cabeçalho do card */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-white font-black text-sm">{r.clientName}</p>
                                <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                              </div>
                              <p className="text-xs text-white mt-0.5">
                                {vehicleName(r.vehicleId)} · {r.dataInicio} → {r.dataFim}
                              </p>
                              {r.motoristaId && (() => {
                                const mot = motoristas.find(m => m.id === r.motoristaId);
                                return mot ? (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                                    🧑‍✈️ {mot.nome}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          {/* Tracker de processo */}
                          <div className="border-t border-zinc-800 pt-4">
                            <ReservationTracker
                              status={r.status}
                              onAdvance={next => updateReservation(r.id, { status: next })}
                              onCancel={() => cancelReservation(r.id)}
                            />
                          </div>
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
        {tab === 'calendario' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <label className="block text-xs text-zinc-400 mb-2">Viatura</label>
                <select
                  value={selectedVehicle ?? ''}
                  onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Visão geral da frota</option>
                  {aluguerVehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => setShowBlockModal(true)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-400/20 rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                + Bloquear período
              </button>
            </div>
            <div className="lg:col-span-2">
              <AvailabilityCalendar vehicleId={selectedVehicle} />
            </div>
          </div>
        )}

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
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
              {blocks.length === 0 && (
                <p className="text-center py-12 text-zinc-500 text-sm">Sem bloqueios activos</p>
              )}
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{b.motivo.replace('_', ' ')}</p>
                    <p className="text-xs text-white">
                      {b.vehicleId === null ? 'Toda a frota' : vehicleName(b.vehicleId)} · {b.dataInicio} → {b.dataFim}
                    </p>
                    {b.descricao && <p className="text-xs text-zinc-400 mt-0.5 italic">{b.descricao}</p>}
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
              <p className="text-xs text-zinc-500">{blocks.length} bloqueio(s) activo(s)</p>
            )}
          </div>
        )}

        {/* TAB: Regras */}
        {tab === 'regras' && <BusinessRulesPanel />}

      </div>
    </div>
  );
}
