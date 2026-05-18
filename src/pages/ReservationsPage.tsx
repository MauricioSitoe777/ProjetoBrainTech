import { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { AdminNav } from '../components/AdminNav';
import { AvailabilityCalendar } from '../components/reservations/AvailabilityCalendar';
import { BlockPeriodModal } from '../components/reservations/BlockPeriodModal';
import { BusinessRulesPanel } from '../components/reservations/BusinessRulesPanel';
import { useReservations } from '../context/ReservationsContext';
import type { ReservationStatus } from '../types/reservation';

const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada: { label: 'Confirmada', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  ativa: { label: 'Ativa', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  concluida: { label: 'Concluída', className: 'bg-zinc-700 text-zinc-300 border-zinc-600' },
  cancelada: { label: 'Cancelada', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

type Tab = 'calendario' | 'reservas' | 'bloqueios' | 'regras';

export function ReservationsPage({ onExit }: { onExit?: () => void }) {
  const { reservations, blocks, updateReservation, cancelReservation, removeBlock } = useReservations();
  const [tab, setTab] = useState<Tab>('calendario');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'todos'>('todos');

  const rentalVehicles = useMemo(() => VEHICLES.filter(v => v.mode === 'aluguer'), []);

  const filteredReservations = useMemo(() => {
    return reservations
      .filter(r => filterStatus === 'todos' || r.status === filterStatus)
      .filter(r => selectedVehicle === null || r.vehicleId === selectedVehicle)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  }, [reservations, filterStatus, selectedVehicle]);

  const stats = useMemo(() => ({
    total: reservations.length,
    pendentes: reservations.filter(r => r.status === 'pendente').length,
    ativas: reservations.filter(r => r.status === 'ativa' || r.status === 'confirmada').length,
    bloqueios: blocks.length,
  }), [reservations, blocks]);

  const vehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'calendario', label: 'Calendário' },
    { key: 'reservas', label: 'Reservas' },
    { key: 'bloqueios', label: 'Bloqueios' },
    { key: 'regras', label: 'Regras' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav subtitle="Reservas & Disponibilidade" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Reservas', value: stats.total, color: 'text-white' },
            { label: 'Pendentes', value: stats.pendentes, color: 'text-amber-400' },
            { label: 'Activas / confirmadas', value: stats.ativas, color: 'text-emerald-400' },
            { label: 'Bloqueios', value: stats.bloqueios, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-300">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'bg-zinc-900 text-white border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calendario' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <label className="block text-xs text-white mb-2">Viatura</label>
                <select
                  value={selectedVehicle ?? ''}
                  onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Visão geral da frota</option>
                  {rentalVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowBlockModal(true)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-400/20 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                + Bloquear período
              </button>
            </div>
            <div className="lg:col-span-2">
              <AvailabilityCalendar vehicleId={selectedVehicle} />
            </div>
          </div>
        )}

        {tab === 'reservas' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as ReservationStatus | 'todos')}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="todos">Todos os estados</option>
                {(Object.keys(STATUS_CFG) as ReservationStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                ))}
              </select>
              <select
                value={selectedVehicle ?? ''}
                onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas as viaturas</option>
                {rentalVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs text-zinc-300 uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-300 uppercase hidden md:table-cell">Viatura</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-300 uppercase">Período</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-300 uppercase">Estado</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-300 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredReservations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-zinc-400 text-sm">Sem reservas</td>
                    </tr>
                  )}
                  {filteredReservations.map(r => {
                    const st = STATUS_CFG[r.status];
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/40">
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{r.clientName}</p>
                          <p className="text-xs text-zinc-300">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm text-white">{vehicleName(r.vehicleId)}</td>
                        <td className="px-4 py-3 text-sm text-white">{r.dataInicio} → {r.dataFim}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs border rounded-md px-2 py-0.5 ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {r.status === 'pendente' && (
                              <button
                                onClick={() => updateReservation(r.id, { status: 'confirmada' })}
                                className="text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
                              >
                                Confirmar
                              </button>
                            )}
                            {r.status === 'confirmada' && (
                              <button
                                onClick={() => updateReservation(r.id, { status: 'ativa' })}
                                className="text-xs px-2 py-1 rounded bg-blue-400/10 text-blue-400 hover:bg-blue-400/20"
                              >
                                Activar
                              </button>
                            )}
                            {r.status === 'ativa' && (
                              <button
                                onClick={() => updateReservation(r.id, { status: 'concluida' })}
                                className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                              >
                                Concluir
                              </button>
                            )}
                            {r.status !== 'cancelada' && r.status !== 'concluida' && (
                              <button
                                onClick={() => cancelReservation(r.id)}
                                className="text-xs px-2 py-1 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'bloqueios' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowBlockModal(true)}
              className="bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg px-4 py-2 text-sm"
            >
              + Novo bloqueio
            </button>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              {blocks.length === 0 && (
                <p className="text-center py-10 text-zinc-400 text-sm">Sem bloqueios activos</p>
              )}
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div>
                    <p className="text-sm text-white capitalize">{b.motivo.replace('_', ' ')}</p>
                    <p className="text-xs text-zinc-300">
                      {b.vehicleId === null ? 'Toda a frota' : vehicleName(b.vehicleId)} · {b.dataInicio} → {b.dataFim}
                    </p>
                    {b.descricao && <p className="text-xs text-zinc-600 mt-0.5">{b.descricao}</p>}
                  </div>
                  <button
                    onClick={() => removeBlock(b.id)}
                    className="text-xs text-red-400 hover:text-red-300 shrink-0"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'regras' && <BusinessRulesPanel />}
      </div>

      {showBlockModal && (
        <BlockPeriodModal
          defaultVehicleId={selectedVehicle}
          onClose={() => setShowBlockModal(false)}
        />
      )}
    </div>
  );
}
