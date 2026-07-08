import React, { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { AvailabilityCalendar } from '../components/reservations/AvailabilityCalendar';
import { BlockPeriodModal } from '../components/reservations/BlockPeriodModal';
import { BusinessRulesPanel } from '../components/reservations/BusinessRulesPanel';
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
  // Compra
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

type Tab = 'calendario' | 'reservas' | 'bloqueios' | 'regras';

export function ReservationsPage({ onExit }: { onExit?: () => void }) {
  const { reservations, blocks, updateReservation, cancelReservation, removeBlock } = useReservations();
  const [tab, setTab] = useState<Tab>('calendario');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'todos'>('todos');
  // Guarda o ID da reserva que está a ser actualizada para bloquear duplo-clique
  const [updatingPrestacao,  setUpdatingPrestacao]  = useState<string | null>(null);
  const [cancelConfirmId,   setCancelConfirmId]   = useState<string | null>(null);
  const [cancelMotivo,      setCancelMotivo]      = useState('');

  const registarPrestacao = (id: string, novoValor: number) => {
    if (updatingPrestacao === id) return; // bloqueia se já está em curso
    setUpdatingPrestacao(id);
    updateReservation(id, { prestacoesPagas: novoValor });
    // Liberta após 800ms — tempo suficiente para o estado actualizar e re-renderizar
    setTimeout(() => setUpdatingPrestacao(null), 800);
  };

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
      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'bg-zinc-900 text-white border border-zinc-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calendario' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4">
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
                {VEHICLES.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.mode === 'compra' ? 'Compra' : 'Aluguer'})</option>
                ))}
              </select>
            </div>
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Reservas</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-5 py-4 text-xs text-white/40 font-black uppercase tracking-widest w-10">#</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Cliente</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden md:table-cell">Viatura</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Período</th>
                    <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Estado</th>
                    <th className="text-right px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredReservations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-white text-sm">Sem reservas</td>
                    </tr>
                  )}
                  {filteredReservations.map((r, idx) => {
                    const st = STATUS_CFG[r.status];
                    const vehicle = VEHICLES.find(v => v.id === r.vehicleId);
                    const isPurchase = vehicle?.mode === 'compra';
                    return (
                      <React.Fragment key={r.id}>
                      <tr className="hover:bg-zinc-800/40">
                        <td className="px-5 py-4 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-white">{r.clientName}</p>
                          <p className="text-xs text-white">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-sm text-white">
                          <div>
                            <p className="font-medium text-white">{vehicleName(r.vehicleId)}</p>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                              isPurchase
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {isPurchase ? 'Compra' : 'Aluguer'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-white">
                            {isPurchase 
                              ? `Compra efetuada em ${r.dataInicio}` 
                              : `${r.dataInicio} (${r.horaLevantamento}) → ${r.dataFim} (${r.horaDevolucao})`}
                          </p>
                          {!isPurchase && r.localLevantamento && (
                            <p className="text-[10px] text-white mt-1 leading-normal">
                              📍 {r.localLevantamento} <br />
                              🏁 {r.localDevolucao}
                            </p>
                          )}
                          {r.motivoViagem && (
                            <p className="text-[10px] text-amber-500 mt-1 italic">
                              📝 Motivo: {r.motivoViagem}
                            </p>
                          )}
                          {isPurchase && (r.totalPrestacoes ?? 0) > 0 && (
                            <div className="mt-1.5 p-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-[11px] max-w-xs space-y-1">
                              <p className="text-amber-400 font-bold uppercase tracking-wider text-[9px]">
                                Prestações da Compra
                              </p>
                              <div className="flex justify-between text-white">
                                <span>Pagas:</span>
                                <span className="font-bold text-white">{(r.prestacoesPagas ?? 0)} / {r.totalPrestacoes}</span>
                              </div>
                              <div className="flex justify-between text-white">
                                <span>Restantes:</span>
                                <span className="font-bold text-red-400">{(r.totalPrestacoes ?? 0) - (r.prestacoesPagas ?? 0)}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs border rounded-md px-2 py-0.5 ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {isPurchase ? (
                              // Se for COMPRA
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-1">
                                  {r.status === 'pendente' && (
                                    <>
                                      <button
                                        onClick={() => updateReservation(r.id, { status: 'concluida' })}
                                        className="text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
                                      >
                                        Concluir Venda
                                      </button>
                                      <button
                                        onClick={() => { setCancelConfirmId(r.id); setCancelMotivo(''); }}
                                        className="text-xs px-2 py-1 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20"
                                      >
                                        Cancelar Venda
                                      </button>
                                    </>
                                  )}
                                </div>
                                
                                {(r.totalPrestacoes ?? 0) > 0 && (() => {
                                  const pagas = r.prestacoesPagas ?? 0;
                                  const total = r.totalPrestacoes ?? 0;
                                  const bloqueado = updatingPrestacao === r.id;
                                  return (
                                    <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800">
                                      <span className="text-[9px] text-white font-bold uppercase ml-1">Reg. Pagamento:</span>
                                      <button
                                        disabled={pagas <= 0 || bloqueado}
                                        onClick={() => registarPrestacao(r.id, Math.max(0, pagas - 1))}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
                                        title="Remover última prestação registada"
                                      >
                                        -
                                      </button>
                                      <span className="text-xs font-black text-amber-400 px-1 select-none min-w-[1.5rem] text-center">
                                        {bloqueado ? '…' : pagas}
                                      </span>
                                      <button
                                        disabled={pagas >= total || bloqueado}
                                        onClick={() => registarPrestacao(r.id, Math.min(total, pagas + 1))}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
                                        title="Registar prestação paga"
                                      >
                                        +
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              // Se for ALUGUER
                              <>
                                {r.status === 'pendente' && (
                                  <button onClick={() => updateReservation(r.id, { status: 'confirmada' })}
                                    className="text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20">
                                    Confirmar Reserva
                                  </button>
                                )}
                                {r.status === 'confirmada' && (
                                  <button onClick={() => updateReservation(r.id, { status: 'pronta_levantamento' })}
                                    className="text-xs px-2 py-1 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20 hover:bg-sky-400/20">
                                    Viatura Pronta
                                  </button>
                                )}
                                {r.status === 'pronta_levantamento' && (
                                  <button onClick={() => updateReservation(r.id, { status: 'ativa' })}
                                    className="text-xs px-2 py-1 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20">
                                    Confirmar Levantamento
                                  </button>
                                )}
                                {r.status === 'ativa' && (
                                  <button onClick={() => updateReservation(r.id, { status: 'devolucao_pendente' })}
                                    className="text-xs px-2 py-1 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20">
                                    Marcar Devolução
                                  </button>
                                )}
                                {r.status === 'devolucao_pendente' && (
                                  <button onClick={() => updateReservation(r.id, { status: 'concluida' })}
                                    className="text-xs px-2 py-1 rounded bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600">
                                    Viatura Recebida
                                  </button>
                                )}
                                {r.status !== 'cancelada' && r.status !== 'concluida' && r.status !== 'devolucao_pendente' && (
                                  <button onClick={() => { setCancelConfirmId(r.id); setCancelMotivo(''); }}
                                    className="text-xs px-2 py-1 rounded bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20">
                                    Cancelar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {cancelConfirmId === r.id && (
                        <tr className="bg-red-500/5">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-white">
                                Cancelar {isPurchase ? 'esta venda' : 'esta reserva'} — indique o motivo:
                              </p>
                              <textarea
                                value={cancelMotivo}
                                onChange={e => setCancelMotivo(e.target.value)}
                                placeholder="Descreva o motivo do cancelamento..."
                                rows={2}
                                className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setCancelConfirmId(null); setCancelMotivo(''); }}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all"
                                >
                                  Voltar
                                </button>
                                <button
                                  disabled={!cancelMotivo.trim()}
                                  onClick={() => {
                                    cancelReservation(r.id, cancelMotivo.trim());
                                    setCancelConfirmId(null);
                                    setCancelMotivo('');
                                  }}
                                  className="text-xs px-3 py-1.5 rounded-lg font-black bg-red-500 text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  Confirmar Cancelamento
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
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
            <div className="bg-zinc-900 border border-amber-500/20 rounded-xl divide-y divide-zinc-800">
              {blocks.length === 0 && (
                <p className="text-center py-10 text-white text-sm">Sem bloqueios activos</p>
              )}
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div>
                    <p className="text-sm text-white capitalize">{b.motivo.replace('_', ' ')}</p>
                    <p className="text-xs text-white">
                      {b.vehicleId === null ? 'Toda a frota' : vehicleName(b.vehicleId)} · {b.dataInicio} → {b.dataFim}
                    </p>
                    {b.descricao && <p className="text-xs text-white mt-0.5">{b.descricao}</p>}
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Reservas', value: stats.total, color: 'text-white' },
            { label: 'Pendentes', value: stats.pendentes, color: 'text-amber-400' },
            { label: 'Activas / confirmadas', value: stats.ativas, color: 'text-emerald-400' },
            { label: 'Bloqueios', value: stats.bloqueios, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-white">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
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
