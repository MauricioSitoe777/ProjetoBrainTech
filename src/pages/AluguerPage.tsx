import { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { AdminNav } from '../components/AdminNav';
import { useReservations } from '../context/ReservationsContext';
import type { ReservationStatus } from '../types/reservation';

const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  // Aluguer
  pendente:            { label: 'Reserva Pendente',       className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Ativo',          className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  // Compra (não usados nesta página)
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};


type Tab = 'reservas' | 'acoes';

const aluguerVehicles = VEHICLES.filter(v => v.mode === 'aluguer');
const aluguerIds = new Set(aluguerVehicles.map(v => v.id));

export function AluguerPage({ onExit }: { onExit?: () => void }) {
  const { reservations, updateReservation, cancelReservation } = useReservations();
  const [tab, setTab] = useState<Tab>('reservas');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);


  const aluguerReservations = useMemo(() =>
    reservations.filter(r => aluguerIds.has(r.vehicleId)),
    [reservations]
  );

  const today = new Date().toISOString().split('T')[0];

  const kpis = useMemo(() => ({
    pendentes:          aluguerReservations.filter(r => r.status === 'pendente').length,
    prontas:            aluguerReservations.filter(r => r.status === 'pronta_levantamento').length,
    ativas:             aluguerReservations.filter(r => r.status === 'ativa').length,
    devolucaoPendente:  aluguerReservations.filter(r => r.status === 'devolucao_pendente').length,
    cancelamentos:      aluguerReservations.filter(r => r.status === 'cancelada').length,
  }), [aluguerReservations]);

  // Histórico: apenas concluídas e canceladas
  const historico = useMemo(() => {
    return aluguerReservations
      .filter(r => r.status === 'concluida' || r.status === 'cancelada')
      .filter(r => selectedVehicle === null || r.vehicleId === selectedVehicle)
      .sort((a, b) => b.dataFim.localeCompare(a.dataFim));
  }, [aluguerReservations, selectedVehicle]);

  const vehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const kpiCards = [
    { label: 'Reservas Pendentes',    value: kpis.pendentes,         color: 'text-amber-400',  dot: 'bg-amber-400' },
    { label: 'Prontas p/ Levantar',   value: kpis.prontas,           color: 'text-sky-400',    dot: 'bg-sky-400' },
    { label: 'Alugueres Ativos',      value: kpis.ativas,            color: 'text-blue-400',   dot: 'bg-blue-400' },
    { label: 'Devolução Pendente',    value: kpis.devolucaoPendente, color: 'text-orange-400', dot: 'bg-orange-400' },
    { label: 'Cancelamentos',         value: kpis.cancelamentos,     color: 'text-red-400',    dot: 'bg-red-400' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <AdminNav subtitle="Aluguer" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map(k => (
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
        <div className="flex gap-1 border-b border-zinc-800">
          {([
            { key: 'reservas', label: `Histórico (${historico.length})` },
            { key: 'acoes',    label: `Ações (${aluguerReservations.filter(r => r.status !== 'cancelada' && r.status !== 'concluida').length})` },
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

        {/* TAB: Histórico */}
        {tab === 'reservas' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select value={selectedVehicle ?? ''} onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Todas as viaturas</option>
                {aluguerVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden md:table-cell">Viatura</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Período</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider hidden sm:table-cell">Data de Devolução</th>
                    <th className="text-left px-4 py-3 text-xs text-white font-bold uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">
                        Sem histórico de alugueres ainda
                      </td>
                    </tr>
                  )}
                  {historico.map(r => {
                    const st = STATUS_CFG[r.status];
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-white">{r.clientName}</p>
                          <p className="text-xs text-zinc-500">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-sm text-zinc-300">
                          {vehicleName(r.vehicleId)}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-zinc-400 tabular-nums">{r.dataInicio} → {r.dataFim}</p>
                          {r.motivoViagem && (
                            <p className="text-[10px] text-zinc-600 mt-0.5 italic">{r.motivoViagem}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <p className="text-sm text-zinc-300 tabular-nums">{r.dataFim}</p>
                          <p className="text-xs text-zinc-600">{r.horaDevolucao}</p>
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

        {/* TAB: Ações */}
        {tab === 'acoes' && (() => {
          const accionaveis = aluguerReservations
            .filter(r => r.status !== 'cancelada' && r.status !== 'concluida')
            .sort((a, b) => {
              const urgencia: Partial<Record<ReservationStatus, number>> = {
                devolucao_pendente: 0, pronta_levantamento: 1, ativa: 2, confirmada: 3, pendente: 4,
              };
              return (urgencia[a.status] ?? 9) - (urgencia[b.status] ?? 9);
            });

          return (
            <div className="space-y-3">
              {accionaveis.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-12 text-center text-zinc-500 text-sm">
                  Sem reservas com acções pendentes
                </div>
              )}
              {accionaveis.map(r => {
                const st = STATUS_CFG[r.status];
                return (
                  <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-black text-sm">{r.clientName}</p>
                        <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {vehicleName(r.vehicleId)} · {r.dataInicio} → {r.dataFim}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {r.status === 'pendente' && (
                        <button onClick={() => updateReservation(r.id, { status: 'confirmada' })}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-all">
                          Confirmar Reserva
                        </button>
                      )}
                      {r.status === 'confirmada' && (
                        <button onClick={() => updateReservation(r.id, { status: 'pronta_levantamento' })}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-sky-400/10 text-sky-400 border border-sky-400/20 hover:bg-sky-400/20 transition-all">
                          Viatura Pronta
                        </button>
                      )}
                      {r.status === 'pronta_levantamento' && (
                        <button onClick={() => updateReservation(r.id, { status: 'ativa' })}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 transition-all">
                          Confirmar Levantamento
                        </button>
                      )}
                      {r.status === 'ativa' && (
                        <button onClick={() => updateReservation(r.id, { status: 'devolucao_pendente' })}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20 transition-all">
                          Marcar Devolução
                        </button>
                      )}
                      {r.status === 'devolucao_pendente' && (
                        <button onClick={() => updateReservation(r.id, { status: 'concluida' })}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 transition-all">
                          Viatura Recebida
                        </button>
                      )}
                      {r.status !== 'devolucao_pendente' && (
                        <button onClick={() => cancelReservation(r.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-all">
                          Cancelar
                        </button>
                      )}
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
