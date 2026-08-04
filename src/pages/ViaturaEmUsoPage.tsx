import { useMemo, useState } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { VEHICLES } from '../data/constants';
import type { ReservationStatus } from '../types/reservation';

const today = new Date().toISOString().split('T')[0];

type Filter = 'todos' | 'em_uso' | 'em_atraso' | 'confirmadas' | 'devolucao';

const ACTIVE_STATUSES: ReservationStatus[] = [
  'confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente',
];

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  confirmada:          { label: 'Confirmada',         className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantar', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  ativa:               { label: 'Em Uso',             className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  devolucao_pendente:  { label: 'Devolução Pend.',    className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
};

function fmtData(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function diasRestantes(dataFim: string): { dias: number; atrasado: boolean } {
  const fim  = new Date(dataFim + 'T00:00:00');
  const hoje = new Date(today + 'T00:00:00');
  const diff = Math.round((fim.getTime() - hoje.getTime()) / 86_400_000);
  return { dias: Math.abs(diff), atrasado: diff < 0 };
}

function VehicleThumb({ vehicleId, name }: { vehicleId: number; name: string }) {
  const { vehicles } = useVehicles();
  const img = vehicles.find(v => v.id === vehicleId)?.img
    ?? VEHICLES.find(v => v.id === vehicleId)?.img;
  return (
    <div className="w-14 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
      {img
        ? <img src={img} alt={name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-base">🚗</div>
      }
    </div>
  );
}

export function ViaturaEmUsoPage() {
  const { reservations } = useReservations();
  const { vehicles } = useVehicles();

  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');

  const getVehicleName = (id: number) =>
    vehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const active = useMemo(
    () => reservations.filter(r => ACTIVE_STATUSES.includes(r.status)),
    [reservations],
  );

  const isDevolucao = (r: { status: string; dataFim: string }) =>
    r.status === 'devolucao_pendente' || (r.status === 'ativa' && r.dataFim < today);

  const counts = useMemo(() => ({
    todos:       active.length,
    em_uso:      active.filter(r => r.status === 'ativa' && r.dataFim >= today).length,
    em_atraso:   active.filter(r => r.status === 'ativa' && r.dataFim < today).length,
    confirmadas: active.filter(r => r.status === 'confirmada' || r.status === 'pronta_levantamento').length,
    devolucao:   active.filter(isDevolucao).length,
  }), [active]);

  const filtered = useMemo(() => {
    let list = active;
    if (filter === 'em_uso')      list = list.filter(r => r.status === 'ativa' && r.dataFim >= today);
    if (filter === 'em_atraso')   list = list.filter(r => r.status === 'ativa' && r.dataFim < today);
    if (filter === 'confirmadas') list = list.filter(r => r.status === 'confirmada' || r.status === 'pronta_levantamento');
    if (filter === 'devolucao')   list = list.filter(isDevolucao);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        getVehicleName(r.vehicleId).toLowerCase().includes(q) ||
        (r.clientPhone ?? '').includes(q),
      );
    }

    return list.sort((a, b) => {
      if (a.status === 'ativa' && a.dataFim < today) return -1;
      if (b.status === 'ativa' && b.dataFim < today) return 1;
      return a.dataFim.localeCompare(b.dataFim);
    });
  }, [active, filter, search, vehicles]);

  const tabs: { key: Filter; label: string; dot?: string }[] = [
    { key: 'todos',       label: 'Todos',       dot: 'bg-zinc-400' },
    { key: 'em_uso',      label: 'Em Uso',      dot: 'bg-amber-400' },
    { key: 'em_atraso',   label: 'Em Atraso',   dot: 'bg-red-500' },
    { key: 'confirmadas', label: 'Confirmadas',  dot: 'bg-blue-400' },
    { key: 'devolucao',   label: 'Devoluções',   dot: 'bg-orange-400' },
  ];

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="px-5 sm:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">Viaturas em Uso</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{active.length} viatura{active.length !== 1 ? 's' : ''} actualmente no terreno</p>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded-full px-3 py-2 min-w-[220px] focus-within:border-amber-400 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white shrink-0">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar cliente, viatura..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/50 w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-white/60 hover:text-white shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Em Uso',     value: counts.em_uso,      color: 'text-amber-400',   dot: 'bg-amber-400' },
            { label: 'Em Atraso',  value: counts.em_atraso,   color: 'text-red-400',     dot: 'bg-red-500' },
            { label: 'Confirmadas',value: counts.confirmadas,  color: 'text-blue-400',    dot: 'bg-blue-400' },
            { label: 'Devoluções', value: counts.devolucao,   color: 'text-orange-400',  dot: 'bg-orange-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{k.label}</span>
              </div>
              <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabela ── */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">

          {/* Amber bar header + filtros */}
          <div className="px-5 py-3.5 border-b border-zinc-800/70 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Lista de Viaturas em Uso</p>
            </div>
            {/* Filtro tabs */}
            <div className="flex items-center gap-1 flex-wrap ml-auto">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${
                    filter === t.key
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-white hover:text-white hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {t.dot && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
                  {t.label}
                  <span className={`text-[10px] px-1 rounded font-black ${filter === t.key ? 'text-amber-300' : 'text-white/60'}`}>
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/40">
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest w-8">#</th>
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest">Viatura</th>
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest hidden sm:table-cell">Cliente</th>
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest hidden md:table-cell">Período</th>
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest hidden lg:table-cell">Prazo</th>
                <th className="text-left px-5 py-3 text-[10px] text-amber-400 font-black uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500 text-sm">
                    {search ? 'Nenhum resultado para a pesquisa.' : 'Sem viaturas activas neste momento.'}
                  </td>
                </tr>
              )}
              {filtered.map((r, idx) => {
                const st = STATUS_CFG[r.status] ?? { label: r.status, className: 'bg-zinc-700 text-white border-zinc-600' };
                const nome = getVehicleName(r.vehicleId);
                const isAtrasado = r.status === 'ativa' && r.dataFim < today;
                const { dias, atrasado } = diasRestantes(r.dataFim);
                return (
                  <tr key={r.id} className={`hover:bg-zinc-800/30 transition-colors ${isAtrasado ? 'bg-red-500/5' : ''}`}>
                    <td className="px-5 py-3 text-[11px] font-black text-zinc-500 tabular-nums">{idx + 1}</td>

                    {/* Viatura */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <VehicleThumb vehicleId={r.vehicleId} name={nome} />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate max-w-[140px]">{nome}</p>
                          {/* Cliente em mobile */}
                          <p className="text-[10px] text-zinc-400 sm:hidden truncate">{r.clientName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="text-xs font-semibold text-white">{r.clientName}</p>
                      {r.clientPhone && <p className="text-[10px] text-zinc-400">{r.clientPhone}</p>}
                      {r.clientEmail && <p className="text-[10px] text-zinc-500 truncate max-w-[160px]">{r.clientEmail}</p>}
                    </td>

                    {/* Período */}
                    <td className="px-5 py-3 hidden md:table-cell">
                      <p className="text-[11px] text-white tabular-nums">{fmtData(r.dataInicio)}</p>
                      <p className="text-[10px] text-zinc-400">até {fmtData(r.dataFim)}</p>
                    </td>

                    {/* Prazo */}
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {r.status === 'ativa' ? (
                        atrasado ? (
                          <span className="text-[11px] font-black text-red-400 flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {dias}d atraso
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400">
                            {dias === 0 ? 'Hoje' : `${dias}d restante${dias > 1 ? 's' : ''}`}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-3">
                      <span className={`text-[10px] border rounded-md px-2 py-0.5 font-bold whitespace-nowrap ${st.className}`}>
                        {st.label}
                      </span>
                      {isAtrasado && (
                        <p className="text-[9px] text-red-400 font-bold mt-0.5 uppercase tracking-wide">⚠ Atraso</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-zinc-800 text-[11px] text-white">
            {filtered.length} registo{filtered.length !== 1 ? 's' : ''}
            {search && <span className="text-white/50"> · pesquisa "{search}"</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
