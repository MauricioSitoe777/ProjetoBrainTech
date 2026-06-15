import { useState, useMemo } from 'react';
import { useFinance, CATEGORIA_LABEL } from '../context/FinanceContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import type { CategoriaTransacao } from '../types/finance';

const fmt = (n: number) => new Intl.NumberFormat('pt-PT').format(Math.round(n)) + ' MT';

type Tab = 'historico' | 'viaturas';

const CATEGORIAS: CategoriaTransacao[] = [
  'aluguer','compra_venda','xitique','manutencao','salario','combustivel','seguro','outro'
];

// ── Página principal ──────────────────────────────────────────────────────────
export function FinancePage({ onExit }: { onExit?: () => void }) {
  const {
    transacoes,
    totalEntradas, totalSaidas, lucroLiquido, totalDividasPendentes,
  } = useFinance();

  const { reservations } = useReservations();
  const { vehicles }     = useVehicles();
  const { membros, sorteios, inscricoes, quotaMT, premioMT, numMembros, estadoGrupo, mesAtual } = useXitique();

  const [tab, setTab] = useState<Tab>('historico');

  // ── Dados de viaturas ────────────────────────────────────────────────────
  const viaturasVendidas = useMemo(() => {
    return reservations
      .filter(r => {
        const v = vehicles.find((vv: { id: number }) => vv.id === r.vehicleId);
        return (v as { mode?: string } | undefined)?.mode === 'compra' && r.status !== 'cancelada';
      })
      .map(r => {
        const v = vehicles.find((vv: { id: number }) => vv.id === r.vehicleId) as { id: number; name?: string; price?: string } | undefined;
        return { id: r.id, nome: v?.name ?? `Viatura #${r.vehicleId}`, cliente: r.clientName ?? '—', data: r.dataInicio, valor: r.valorTotal, status: r.status };
      });
  }, [reservations, vehicles]);

  const viaturasAlugadas = useMemo(() => {
    return reservations
      .filter(r => {
        const v = vehicles.find((vv: { id: number }) => vv.id === r.vehicleId);
        return (v as { mode?: string } | undefined)?.mode !== 'compra' && r.status !== 'cancelada';
      })
      .map(r => {
        const v = vehicles.find((vv: { id: number }) => vv.id === r.vehicleId) as { id: number; name?: string } | undefined;
        return { id: r.id, nome: v?.name ?? `Viatura #${r.vehicleId}`, cliente: r.clientName ?? '—', dataInicio: r.dataInicio, dataFim: r.dataFim, valor: r.valorTotal, status: r.status };
      });
  }, [reservations, vehicles]);

  const totalVendas   = viaturasVendidas.reduce((s, v) => s + v.valor, 0);
  const totalAluguers = viaturasAlugadas.reduce((s, v) => s + v.valor, 0);

  const STATUS_COLOR: Record<string, string> = {
    // Aluguer
    pendente:            'text-amber-400',
    confirmada:          'text-emerald-400',
    pronta_levantamento: 'text-sky-400',
    ativa:               'text-blue-400',
    devolucao_pendente:  'text-orange-400',
    concluida:           'text-white',
    cancelada:           'text-red-400',
    // Compra
    compra_aprovada:     'text-emerald-400',
    entrada_paga:        'text-teal-400',
    em_prestacao:        'text-blue-400',
    prestacao_atraso:    'text-red-400',
    liquidada:           'text-emerald-400',
  };

  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-zinc-800 flex-wrap">
          {([
            { key: 'historico', label: 'Histórico Geral' },
            { key: 'viaturas',  label: 'Viaturas'  },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: Resumo ══ */}
        {tab === 'historico' && (() => {
          const aluguerAtivos     = reservations.filter(r => !['cancelada','concluida','liquidada'].includes(r.status) && vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode !== 'compra'));
          const aluguerConcluidos = reservations.filter(r => r.status === 'concluida' && vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode !== 'compra'));
          const totalAluguer      = aluguerConcluidos.reduce((s, r) => s + r.valorTotal, 0) + aluguerAtivos.reduce((s, r) => s + r.valorTotal, 0);

          const compraAtivos     = reservations.filter(r => !['cancelada','liquidada'].includes(r.status) && vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode === 'compra'));
          const compraLiquidadas = reservations.filter(r => r.status === 'liquidada' && vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode === 'compra'));
          const totalCompra      = compraLiquidadas.reduce((s, r) => s + r.valorTotal, 0) + compraAtivos.reduce((s, r) => s + r.valorTotal, 0);

          const membrosAceites     = membros.filter(m => m.estado === 'Aceite' || m.estado === 'Sorteado');
          const totalArrecadado    = membrosAceites.length * quotaMT;
          const totalDistribuido   = sorteios.length * premioMT;
          const inscricoesPendentes = inscricoes.filter(i => i.status === 'pendente').length;

          return (
            <div className="space-y-6">

              {/* ── Xitique ── */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">Xitique</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    estadoGrupo === 'Aberto' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : estadoGrupo === 'EmAndamento' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                    : 'bg-zinc-700 text-zinc-400 border-zinc-600'
                  }`}>
                    {estadoGrupo === 'EmAndamento' ? 'Em Andamento' : estadoGrupo}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800">
                  {[
                    { label: 'Membros',           value: `${membros.length} / ${numMembros}`, color: 'text-white' },
                    { label: 'Mês Actual',        value: `${mesAtual} / ${numMembros}`,       color: 'text-amber-400' },
                    { label: 'Total Arrecadado',  value: fmt(totalArrecadado),                color: 'text-emerald-400' },
                    { label: 'Total Distribuído', value: fmt(totalDistribuido),               color: 'text-blue-400' },
                  ].map(k => (
                    <div key={k.label} className="bg-zinc-900 px-5 py-4">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{k.label}</div>
                      <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 flex gap-6 flex-wrap border-t border-zinc-800">
                  <span className="text-xs text-zinc-400">Sorteios realizados: <strong className="text-white">{sorteios.length}</strong></span>
                  <span className="text-xs text-zinc-400">Inscrições pendentes: <strong className="text-amber-400">{inscricoesPendentes}</strong></span>
                  <span className="text-xs text-zinc-400">Prémio mensal: <strong className="text-white">{fmt(premioMT)}</strong></span>
                  <span className="text-xs text-zinc-400">Quota: <strong className="text-white">{fmt(quotaMT)}</strong></span>
                </div>
              </div>

              {/* ── Aluguer ── */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">Aluguer</h3>
                  </div>
                  <span className="text-xs text-zinc-400">{aluguerAtivos.length} activos · {aluguerConcluidos.length} concluídos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800">
                  {[
                    { label: 'Total Contratos',  value: String(reservations.filter(r => vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode !== 'compra')).length), color: 'text-white' },
                    { label: 'Em Curso',         value: String(aluguerAtivos.length),     color: 'text-blue-400' },
                    { label: 'Concluídos',       value: String(aluguerConcluidos.length), color: 'text-emerald-400' },
                    { label: 'Volume Total',     value: fmt(totalAluguer),                color: 'text-amber-400' },
                  ].map(k => (
                    <div key={k.label} className="bg-zinc-900 px-5 py-4">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{k.label}</div>
                      <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
                    </div>
                  ))}
                </div>
                {aluguerAtivos.length > 0 && (
                  <div className="px-5 py-3 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Alugueres Activos</div>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-auto">
                      {aluguerAtivos.slice(0, 8).map(r => {
                        const v = vehicles.find((vv: { id: number; name?: string }) => vv.id === r.vehicleId) as { name?: string } | undefined;
                        return (
                          <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 text-xs px-3 py-2 rounded-lg bg-zinc-800/60">
                            <span className="text-white font-semibold truncate">{v?.name ?? `Viatura #${r.vehicleId}`}</span>
                            <span className="text-zinc-400 truncate">{r.clientName ?? '—'}</span>
                            <span className="text-amber-400 font-bold text-right">{fmt(r.valorTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Compra ── */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">Compra &amp; Venda</h3>
                  </div>
                  <span className="text-xs text-zinc-400">{compraAtivos.length} em curso · {compraLiquidadas.length} liquidadas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800">
                  {[
                    { label: 'Total Contratos', value: String(reservations.filter(r => vehicles.find((v: { id: number; mode?: string }) => v.id === r.vehicleId && v.mode === 'compra')).length), color: 'text-white' },
                    { label: 'Em Prestações',   value: String(compraAtivos.filter(r => r.status === 'em_prestacao').length), color: 'text-blue-400' },
                    { label: 'Liquidadas',      value: String(compraLiquidadas.length),  color: 'text-emerald-400' },
                    { label: 'Volume Total',    value: fmt(totalCompra),                 color: 'text-purple-400' },
                  ].map(k => (
                    <div key={k.label} className="bg-zinc-900 px-5 py-4">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{k.label}</div>
                      <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
                    </div>
                  ))}
                </div>
                {compraAtivos.length > 0 && (
                  <div className="px-5 py-3 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Contratos em Curso</div>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-auto">
                      {compraAtivos.slice(0, 8).map(r => {
                        const v = vehicles.find((vv: { id: number; name?: string }) => vv.id === r.vehicleId) as { name?: string } | undefined;
                        return (
                          <div key={r.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-zinc-800/60">
                            <span className="text-white font-semibold">{v?.name ?? `Viatura #${r.vehicleId}`}</span>
                            <span className="text-zinc-400">{r.clientName ?? '—'}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              r.status === 'prestacao_atraso' ? 'text-red-400 border-red-400/30 bg-red-400/10'
                              : r.status === 'em_prestacao' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10'
                              : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                            }`}>{r.status.replace(/_/g, ' ')}</span>
                            <span className="text-purple-400 font-bold">{fmt(r.valorTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Totais gerais ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Entradas',  value: fmt(totalEntradas),         color: 'text-emerald-400' },
                  { label: 'Total Saídas',    value: fmt(totalSaidas),           color: 'text-red-400' },
                  { label: 'Lucro Líquido',   value: fmt(lucroLiquido),          color: lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Dívidas Activas', value: fmt(totalDividasPendentes), color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{k.label}</div>
                    <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══ TAB: Dashboard ══ */}
        {/* ══ TAB: Viaturas ══ */}
        {tab === 'viaturas' && (
          <div className="space-y-6">
            {/* Vendidas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <h3 className="text-white font-black text-sm uppercase tracking-wider">Viaturas Vendidas</h3>
                <span className="text-xs text-white">{viaturasVendidas.length} venda(s) · {fmt(totalVendas)}</span>
              </div>
              {viaturasVendidas.length === 0 ? (
                <p className="text-white text-xs text-center py-8">Nenhuma venda registada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        {['Viatura','Cliente','Data','Valor','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viaturasVendidas.map(v => (
                        <tr key={v.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                          <td className="px-4 py-3 text-sm text-white font-semibold">{v.nome}</td>
                          <td className="px-4 py-3 text-xs text-white">{v.cliente}</td>
                          <td className="px-4 py-3 text-xs text-white">{new Date(v.data).toLocaleDateString('pt-PT')}</td>
                          <td className="px-4 py-3 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(v.valor)}</td>
                          <td className="px-4 py-3 text-xs font-bold capitalize">
                            <span className={STATUS_COLOR[v.status] ?? 'text-white'}>{v.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Alugadas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <h3 className="text-white font-black text-sm uppercase tracking-wider">Viaturas Alugadas</h3>
                <span className="text-xs text-white">{viaturasAlugadas.length} aluguer(es) · {fmt(totalAluguers)}</span>
              </div>
              {viaturasAlugadas.length === 0 ? (
                <p className="text-white text-xs text-center py-8">Nenhum aluguer registado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        {['Viatura','Cliente','Período','Valor','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viaturasAlugadas.map(v => (
                        <tr key={v.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                          <td className="px-4 py-3 text-sm text-white font-semibold">{v.nome}</td>
                          <td className="px-4 py-3 text-xs text-white">{v.cliente}</td>
                          <td className="px-4 py-3 text-xs text-white whitespace-nowrap">
                            {new Date(v.dataInicio).toLocaleDateString('pt-PT')} → {new Date(v.dataFim).toLocaleDateString('pt-PT')}
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(v.valor)}</td>
                          <td className="px-4 py-3 text-xs font-bold capitalize">
                            <span className={STATUS_COLOR[v.status] ?? 'text-white'}>{v.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
