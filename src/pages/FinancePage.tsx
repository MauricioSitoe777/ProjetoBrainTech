import { useState, useMemo } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useFinance, CATEGORIA_LABEL } from '../context/FinanceContext';
import { VEHICLES as VEHICLES_STATIC } from '../data/constants';

const fmt  = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MT';
const fmtK = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M MT' : n >= 1_000 ? (n / 1_000).toFixed(0) + 'k MT' : fmt(n);

const MESES_ABR  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

type Tab = 'geral' | 'mensal' | 'transacoes' | 'aluguer' | 'compra';

const compraIds = new Set(VEHICLES_STATIC.filter(v => v.mode === 'compra').map(v => v.id));

const STATUS_ALUGUER: Record<string, { label: string; color: string; bg: string }> = {
  pendente:            { label: 'Pendente',         color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  confirmada:          { label: 'Confirmada',        color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  pronta_levantamento: { label: 'P/ Levantamento',   color: 'text-cyan-400',    bg: 'bg-cyan-400/10 border-cyan-400/20' },
  ativa:               { label: 'Activa',            color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  devolucao_pendente:  { label: 'Dev. Pendente',     color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20' },
  concluida:           { label: 'Concluída',         color: 'text-zinc-400',    bg: 'bg-zinc-700/40 border-zinc-700' },
  cancelada:           { label: 'Cancelada',         color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
};

const STATUS_COMPRA: Record<string, { label: string; color: string; bg: string }> = {
  compra_aprovada:  { label: 'Aprovada',     color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  entrada_paga:     { label: 'Entrada Paga', color: 'text-cyan-400',    bg: 'bg-cyan-400/10 border-cyan-400/20' },
  em_prestacao:     { label: 'Em Prestação', color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  prestacao_atraso: { label: 'Em Atraso',    color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
  liquidada:        { label: 'Liquidada',    color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
};

// ── Spark bar ─────────────────────────────────────────────────────────────────
function Bar({ pct, color = 'bg-amber-500', thin }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div className={`w-full bg-zinc-800 rounded-full overflow-hidden ${thin ? 'h-1' : 'h-1.5'}`}>
      <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'text-white', accent }: { label: string; value: string; sub?: string; color?: string; accent?: string }) {
  return (
    <div className={`bg-zinc-900 border rounded-2xl p-4 space-y-1 ${accent ?? 'border-zinc-800'}`}>
      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-xl font-black leading-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-300">{sub}</p>}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export function FinancePage() {
  const { reservations }                                      = useReservations();
  const { vehicles }                                          = useVehicles();
  const { grupos, inscricoes }                                = useXitique();
  const { transacoes, totalEntradas, totalSaidas, lucroLiquido, totalDividasPendentes } = useFinance();

  const [tab,    setTab]    = useState<Tab>('geral');
  const [anoSel, setAnoSel] = useState(() => new Date().getFullYear());
  const [mesSel, setMesSel] = useState<number | null>(null); // null = todos

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getVehicleName = (id: number) => {
    const dyn = vehicles.find((v: { id: number }) => v.id === id) as { name?: string } | undefined;
    const sta = VEHICLES_STATIC.find(v => v.id === id);
    return dyn?.name ?? sta?.name ?? `Viatura #${id}`;
  };

  // ── Reservas não canceladas ─────────────────────────────────────────────────
  const resActivas = useMemo(() =>
    reservations.filter(r => r.status !== 'cancelada'),
  [reservations]);

  const aluguerRes = useMemo(() => resActivas.filter(r => !compraIds.has(r.vehicleId)), [resActivas]);
  const compraRes  = useMemo(() => resActivas.filter(r =>  compraIds.has(r.vehicleId)), [resActivas]);

  // ── Totais de receita ───────────────────────────────────────────────────────
  const receitaAluguer = useMemo(() => aluguerRes.reduce((s, r) => s + r.valorTotal, 0), [aluguerRes]);
  const receitaCompra  = useMemo(() => compraRes .reduce((s, r) => s + r.valorTotal, 0), [compraRes]);
  const receitaXitique = useMemo(() => grupos.reduce((s, g) => {
    const aceites = g.membros.filter(m => m.estado === 'Aceite' || m.estado === 'Sorteado');
    return s + aceites.length * g.quotaMT;
  }, 0), [grupos]);
  const receitaTotal   = receitaAluguer + receitaCompra + receitaXitique;
  const margem         = receitaTotal > 0 ? Math.round((lucroLiquido / receitaTotal) * 100) : 0;

  // ── Dados mensais ────────────────────────────────────────────────────────────
  const dadosMensais = useMemo(() => {
    const mapa: Record<string, { aluguerQty: number; aluguerVal: number; compraQty: number; compraVal: number }> = {};
    for (const r of resActivas) {
      const key = r.dataInicio.slice(0, 7); // YYYY-MM
      if (!mapa[key]) mapa[key] = { aluguerQty: 0, aluguerVal: 0, compraQty: 0, compraVal: 0 };
      if (compraIds.has(r.vehicleId)) {
        mapa[key].compraQty++;
        mapa[key].compraVal += r.valorTotal;
      } else {
        mapa[key].aluguerQty++;
        mapa[key].aluguerVal += r.valorTotal;
      }
    }
    return Object.entries(mapa)
      .map(([key, d]) => ({ key, year: parseInt(key.slice(0, 4)), month: parseInt(key.slice(5, 7)) - 1, total: d.aluguerVal + d.compraVal, ...d }))
      .sort((a, b) => b.key.localeCompare(a.key)); // mais recente primeiro
  }, [resActivas]);

  const anos = useMemo(() => [...new Set(dadosMensais.map(d => d.year))].sort((a, b) => b - a), [dadosMensais]);

  const dadosAno = useMemo(() =>
    dadosMensais.filter(d => d.year === anoSel).sort((a, b) => a.month - b.month),
  [dadosMensais, anoSel]);

  const maxTotal = useMemo(() => Math.max(1, ...dadosAno.map(d => d.total)), [dadosAno]);

  const mesAtual    = new Date().getMonth();
  const anoAtual    = new Date().getFullYear();
  const dadosMesAtual = dadosMensais.find(d => d.year === anoAtual && d.month === mesAtual);
  const dadosMesAnterior = dadosMensais.find(d => {
    const prev = new Date(anoAtual, mesAtual - 1, 1);
    return d.year === prev.getFullYear() && d.month === prev.getMonth();
  });
  const variacaoMes = dadosMesAnterior && dadosMesAnterior.total > 0
    ? Math.round(((dadosMesAtual?.total ?? 0) - dadosMesAnterior.total) / dadosMesAnterior.total * 100)
    : null;

  // Melhor mês
  const melhorMes = useMemo(() => dadosMensais.length > 0 ? dadosMensais.reduce((a, b) => a.total >= b.total ? a : b) : null, [dadosMensais]);

  // ── Ranking de viaturas por tipo ───────────────────────────────────────────
  const buildRanking = (pool: typeof aluguerRes) => {
    const mapa: Record<number, { nome: string; qty: number; receita: number; mediaValor: number }> = {};
    for (const r of pool) {
      if (!mapa[r.vehicleId]) mapa[r.vehicleId] = { nome: getVehicleName(r.vehicleId), qty: 0, receita: 0, mediaValor: 0 };
      mapa[r.vehicleId].qty++;
      mapa[r.vehicleId].receita += r.valorTotal;
    }
    return Object.values(mapa)
      .map(v => ({ ...v, mediaValor: v.qty > 0 ? v.receita / v.qty : 0 }))
      .sort((a, b) => b.receita - a.receita);
  };

  const rankingAluguer = useMemo(() => buildRanking(aluguerRes), [aluguerRes, vehicles]);
  const rankingCompra  = useMemo(() => buildRanking(compraRes),  [compraRes,  vehicles]);

  const maxReceitaAluguer = useMemo(() => Math.max(1, ...rankingAluguer.map(v => v.receita)), [rankingAluguer]);
  const maxReceitaCompra  = useMemo(() => Math.max(1, ...rankingCompra .map(v => v.receita)), [rankingCompra]);

  // ── Lucratividade por categoria ─────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const mapa: Record<string, { entradas: number; saidas: number }> = {};
    for (const t of transacoes) {
      if (!mapa[t.categoria]) mapa[t.categoria] = { entradas: 0, saidas: 0 };
      if (t.tipo === 'entrada') mapa[t.categoria].entradas += t.valor;
      else                      mapa[t.categoria].saidas   += t.valor;
    }
    return Object.entries(mapa)
      .map(([cat, v]) => ({ cat, label: CATEGORIA_LABEL[cat as keyof typeof CATEGORIA_LABEL] ?? cat, lucro: v.entradas - v.saidas, ...v }))
      .sort((a, b) => b.lucro - a.lucro);
  }, [transacoes]);

  const maxEntradas = useMemo(() => Math.max(1, ...porCategoria.map(c => c.entradas)), [porCategoria]);

  // ── Métricas de detalhe para o mês selecionado ─────────────────────────────
  const mesSelecionado = mesSel !== null ? dadosAno.find(d => d.month === mesSel) : null;

  // ── Dados específicos de aluguer ─────────────────────────────────────────
  const aluguerSorted = useMemo(() =>
    [...aluguerRes].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
  [aluguerRes]);

  const avgDiasAluguer = useMemo(() => {
    if (aluguerRes.length === 0) return 0;
    const total = aluguerRes.reduce((s, r) => {
      const dias = Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86_400_000);
      return s + Math.max(1, dias);
    }, 0);
    return Math.round(total / aluguerRes.length);
  }, [aluguerRes]);

  const aluguerByStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const r of aluguerRes) mapa[r.status] = (mapa[r.status] ?? 0) + 1;
    return mapa;
  }, [aluguerRes]);

  // ── Dados específicos de compra ──────────────────────────────────────────
  const compraSorted = useMemo(() =>
    [...compraRes].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
  [compraRes]);

  const compraByStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const r of compraRes) mapa[r.status] = (mapa[r.status] ?? 0) + 1;
    return mapa;
  }, [compraRes]);

  const totalPrestacoesPagas  = useMemo(() => compraRes.reduce((s, r) => s + (r.prestacoesPagas  ?? 0), 0), [compraRes]);
  const totalPrestacoesTotal  = useMemo(() => compraRes.reduce((s, r) => s + (r.totalPrestacoes  ?? 0), 0), [compraRes]);

  return (
    <div className="bg-zinc-950 text-white">
      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Relatórios & Estatísticas</h1>
            <p className="text-zinc-500 text-sm mt-1">Análise financeira e performance das viaturas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {([
            { key: 'geral',      label: 'Visão Geral' },
            { key: 'mensal',     label: 'Por Mês' },
            { key: 'transacoes', label: 'Transações' },
            { key: 'aluguer',    label: 'Alugueres' },
            { key: 'compra',     label: 'Compras' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ TAB: GERAL ══ */}
        {tab === 'geral' && (
          <div className="space-y-6">

            {/* KPIs principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Receita Total"   value={fmt(receitaTotal)}  color="text-amber-400"   accent="border-amber-500/20" />
              <KpiCard label="Total Saídas"    value={fmt(totalSaidas)}   color="text-red-400"     accent="border-red-500/20" />
              <KpiCard label="Lucro Líquido"   value={fmt(lucroLiquido)}  color={lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'} accent={lucroLiquido >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'} />
              <KpiCard label="Margem de Lucro" value={`${margem}%`}       color={margem >= 30 ? 'text-emerald-400' : margem >= 10 ? 'text-amber-400' : 'text-red-400'}
                sub={`Dívidas: ${fmt(totalDividasPendentes)}`} />
            </div>

            {/* Breakdown por canal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Receita por Canal</h2>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'Aluguer de Viaturas', value: receitaAluguer, qty: aluguerRes.length,       color: 'bg-blue-500',   text: 'text-blue-400',   unit: 'contratos' },
                  { label: 'Compra & Venda',       value: receitaCompra,  qty: compraRes.length,        color: 'bg-purple-500', text: 'text-purple-400', unit: 'contratos' },
                  { label: 'Xitique',              value: receitaXitique, qty: inscricoes.filter(i => i.status === 'aprovado').length, color: 'bg-amber-500', text: 'text-amber-400', unit: 'membros' },
                ].map(item => {
                  const pct = receitaTotal > 0 ? (item.value / receitaTotal) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.color}`} />
                          <span className="text-white font-semibold">{item.label}</span>
                          <span className="text-zinc-500 text-xs">{item.qty} {item.unit}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 text-xs">{Math.round(pct)}%</span>
                          <span className={`font-black text-sm ${item.text}`}>{fmt(item.value)}</span>
                        </div>
                      </div>
                      <Bar pct={pct} color={item.color} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mês actual vs anterior */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Este Mês ({MESES_ABR[mesAtual]})</p>
                <p className="text-2xl font-black text-white">{fmt(dadosMesAtual?.total ?? 0)}</p>
                {variacaoMes !== null && (
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-bold ${variacaoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <polyline points={variacaoMes >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                    </svg>
                    {variacaoMes >= 0 ? '+' : ''}{variacaoMes}% vs mês anterior
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-zinc-500">Alugueres: </span><span className="text-blue-400 font-bold">{dadosMesAtual?.aluguerQty ?? 0}</span></div>
                  <div><span className="text-zinc-500">Vendas: </span><span className="text-purple-400 font-bold">{dadosMesAtual?.compraQty ?? 0}</span></div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Mês Anterior ({MESES_ABR[(mesAtual + 11) % 12]})</p>
                <p className="text-2xl font-black text-white">{fmt(dadosMesAnterior?.total ?? 0)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-zinc-500">Alugueres: </span><span className="text-blue-400 font-bold">{dadosMesAnterior?.aluguerQty ?? 0}</span></div>
                  <div><span className="text-zinc-500">Vendas: </span><span className="text-purple-400 font-bold">{dadosMesAnterior?.compraQty ?? 0}</span></div>
                </div>
              </div>
              <div className={`rounded-2xl p-5 border ${melhorMes ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Melhor Mês</p>
                {melhorMes ? (
                  <>
                    <p className="text-2xl font-black text-amber-400">{fmt(melhorMes.total)}</p>
                    <p className="text-xs text-zinc-400 mt-1">{MESES_FULL[melhorMes.month]} {melhorMes.year}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-zinc-500">Alugueres: </span><span className="text-blue-400 font-bold">{melhorMes.aluguerQty}</span></div>
                      <div><span className="text-zinc-500">Vendas: </span><span className="text-purple-400 font-bold">{melhorMes.compraQty}</span></div>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-500 text-sm">Sem dados ainda</p>
                )}
              </div>
            </div>

            {/* O que é mais lucrativo (por categoria manual) */}
            {porCategoria.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Lucratividade por Categoria</h2>
                  <span className="text-[10px] text-zinc-300">Transações manuais</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {porCategoria.map((c, i) => (
                    <div key={c.cat} className="px-5 py-4 flex items-center gap-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        i === 0 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{c.label}</span>
                          <span className={`text-sm font-black ${c.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {c.lucro >= 0 ? '+' : ''}{fmt(c.lucro)}
                          </span>
                        </div>
                        <Bar pct={(c.entradas / maxEntradas) * 100} color={c.lucro >= 0 ? 'bg-emerald-500' : 'bg-red-500'} thin />
                        <div className="flex gap-4 text-[10px]">
                          <span className="text-emerald-400">↑ {fmt(c.entradas)}</span>
                          <span className="text-red-400">↓ {fmt(c.saidas)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════ TAB: MENSAL ══ */}
        {tab === 'mensal' && (
          <div className="space-y-6">

            {/* Selector de ano */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Ano:</span>
              <div className="flex gap-1.5">
                {anos.map(a => (
                  <button key={a} onClick={() => { setAnoSel(a); setMesSel(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      anoSel === a ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}>{a}</button>
                ))}
              </div>
            </div>

            {dadosAno.length === 0 ? (
              <div className="text-center text-zinc-400 text-sm py-16 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                Sem dados para {anoSel}
              </div>
            ) : (
              <>
                {/* Gráfico de barras CSS */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider mb-5">Receita Mensal — {anoSel}</h2>
                  <div className="flex items-end gap-2 h-36">
                    {Array.from({ length: 12 }, (_, i) => {
                      const d = dadosAno.find(x => x.month === i);
                      const pct = d ? (d.total / maxTotal) * 100 : 0;
                      const isCurrentMonth = i === mesAtual && anoSel === anoAtual;
                      const isSelected = mesSel === i;
                      return (
                        <button key={i} onClick={() => setMesSel(isSelected ? null : i)}
                          className="flex-1 flex flex-col items-center gap-1 group" title={`${MESES_FULL[i]}: ${fmt(d?.total ?? 0)}`}>
                          <span className={`text-[9px] font-bold transition-opacity ${isSelected || (isCurrentMonth && mesSel === null) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isCurrentMonth ? 'text-amber-400' : 'text-zinc-400'}`}>
                            {fmtK(d?.total ?? 0)}
                          </span>
                          <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                            <div className={`w-full rounded-t-md transition-all duration-300 ${
                              isSelected ? 'bg-amber-400' : isCurrentMonth ? 'bg-amber-500' : d ? 'bg-zinc-600 group-hover:bg-zinc-500' : 'bg-zinc-800/50'
                            }`} style={{ height: pct > 0 ? `${pct}%` : '2px' }} />
                          </div>
                          <span className={`text-[9px] font-bold ${isCurrentMonth ? 'text-amber-400' : 'text-zinc-600'}`}>{MESES_ABR[i]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela mensal */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                    <h2 className="text-white font-black text-sm uppercase tracking-wider">
                      {mesSel !== null ? `Detalhe — ${MESES_FULL[mesSel]} ${anoSel}` : `Todos os Meses — ${anoSel}`}
                    </h2>
                    {mesSel !== null && (
                      <button onClick={() => setMesSel(null)} className="text-[10px] text-zinc-400 hover:text-white font-bold transition">
                        ← Ver todos
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                          {['Mês', 'Alugueres', 'Rec. Aluguer', 'Vendas', 'Rec. Venda', 'Total', 'Var.'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {(mesSel !== null ? dadosAno.filter(d => d.month === mesSel) : dadosAno).map((d, i, arr) => {
                          const prev = arr[i - 1];
                          const var_ = prev && prev.total > 0 ? Math.round(((d.total - prev.total) / prev.total) * 100) : null;
                          const isCurrentMonth = d.month === mesAtual && anoSel === anoAtual;
                          return (
                            <tr key={d.key}
                              onClick={() => setMesSel(mesSel === d.month ? null : d.month)}
                              className={`cursor-pointer transition-colors hover:bg-zinc-800/40 ${isCurrentMonth ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-5 py-4 text-sm font-black text-white whitespace-nowrap">
                                {MESES_FULL[d.month]}
                                {isCurrentMonth && <span className="ml-1.5 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">Actual</span>}
                              </td>
                              <td className="px-5 py-4 text-sm text-blue-400 font-bold">{d.aluguerQty}</td>
                              <td className="px-5 py-4 text-sm text-blue-400 font-black whitespace-nowrap">{fmt(d.aluguerVal)}</td>
                              <td className="px-5 py-4 text-sm text-purple-400 font-bold">{d.compraQty}</td>
                              <td className="px-5 py-4 text-sm text-purple-400 font-black whitespace-nowrap">{fmt(d.compraVal)}</td>
                              <td className="px-5 py-4 text-sm text-amber-400 font-black whitespace-nowrap">{fmt(d.total)}</td>
                              <td className="px-5 py-4 text-xs font-bold whitespace-nowrap">
                                {var_ !== null ? (
                                  <span className={var_ >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {var_ >= 0 ? '▲' : '▼'} {Math.abs(var_)}%
                                  </span>
                                ) : <span className="text-zinc-600">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {dadosAno.length > 1 && mesSel === null && (
                        <tfoot>
                          <tr className="bg-zinc-800/40 border-t border-zinc-700">
                            <td className="px-5 py-4 text-xs font-black text-white uppercase">Total {anoSel}</td>
                            <td className="px-5 py-4 text-sm font-black text-blue-400">{dadosAno.reduce((s, d) => s + d.aluguerQty, 0)}</td>
                            <td className="px-5 py-4 text-sm font-black text-blue-400 whitespace-nowrap">{fmt(dadosAno.reduce((s, d) => s + d.aluguerVal, 0))}</td>
                            <td className="px-5 py-4 text-sm font-black text-purple-400">{dadosAno.reduce((s, d) => s + d.compraQty, 0)}</td>
                            <td className="px-5 py-4 text-sm font-black text-purple-400 whitespace-nowrap">{fmt(dadosAno.reduce((s, d) => s + d.compraVal, 0))}</td>
                            <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(dadosAno.reduce((s, d) => s + d.total, 0))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Detalhe das reservas do mês selecionado */}
                {mesSel !== null && mesSelecionado && (() => {
                  const resDoMes = resActivas.filter(r => {
                    const [y, m] = r.dataInicio.slice(0, 7).split('-').map(Number);
                    return y === anoSel && (m - 1) === mesSel;
                  }).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <h3 className="text-white font-black text-sm uppercase tracking-wider">
                          Contratos de {MESES_FULL[mesSel]} {anoSel} · {resDoMes.length} total
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-zinc-800/50">
                              {['Data','Viatura','Cliente','Tipo','Valor','Estado'].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {resDoMes.map(r => {
                              const isCompra = compraIds.has(r.vehicleId);
                              return (
                                <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                                  <td className="px-5 py-4 text-xs text-zinc-200 whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                                  <td className="px-5 py-4 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                                  <td className="px-5 py-4 text-xs text-zinc-200 truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                                  <td className="px-5 py-4">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      isCompra ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                    }`}>{isCompra ? 'Compra' : 'Aluguer'}</span>
                                  </td>
                                  <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                                  <td className="px-5 py-4 text-xs text-zinc-200 capitalize">{r.status.replace(/_/g, ' ')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ TAB: TRANSAÇÕES ══ */}
        {tab === 'transacoes' && (
          <div className="space-y-4">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Entradas"  value={fmt(totalEntradas)}         color="text-emerald-400" />
              <KpiCard label="Total Saídas"    value={fmt(totalSaidas)}           color="text-red-400" />
              <KpiCard label="Lucro Líquido"   value={fmt(lucroLiquido)}          color={lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <KpiCard label="Dívidas Activas" value={fmt(totalDividasPendentes)} color="text-amber-400" />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Transações Manuais</h2>
                <span className="text-[10px] text-zinc-300">{transacoes.length} registos</span>
              </div>
              {transacoes.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-12">Sem transações manuais registadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        {['Data','Descrição','Categoria','Tipo','Valor'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {[...transacoes].sort((a, b) => b.data.localeCompare(a.data)).map(t => (
                        <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-5 py-4 text-xs text-zinc-200 whitespace-nowrap">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                          <td className="px-5 py-4 text-sm text-white font-medium truncate max-w-[200px]">{t.descricao}</td>
                          <td className="px-5 py-4 text-xs text-zinc-200">{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.tipo === 'entrada'
                                ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                            }`}>{t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-black whitespace-nowrap ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.tipo === 'entrada' ? '+' : '-'}{fmt(t.valor)}
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

        {/* ══════════════════════════════════════════════════════ TAB: ALUGUER ══ */}
        {tab === 'aluguer' && (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Contratos"  value={String(aluguerRes.length)}  color="text-blue-400"    accent="border-blue-500/20" />
              <KpiCard label="Receita Total"    value={fmt(receitaAluguer)}         color="text-amber-400"   accent="border-amber-500/20" />
              <KpiCard label="Valor Médio"     value={fmt(aluguerRes.length > 0 ? receitaAluguer / aluguerRes.length : 0)} color="text-white" />
              <KpiCard label="Duração Média"    value={`${avgDiasAluguer} dias`}    color="text-zinc-300" />
            </div>

            {/* Distribuição por estado */}
            {aluguerRes.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Estado dos Contratos</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(aluguerByStatus).sort((a, b) => b[1] - a[1]).map(([status, qty]) => {
                    const s = STATUS_ALUGUER[status] ?? { label: status, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' };
                    return (
                      <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${s.bg}`}>
                        <span className={s.color}>{s.label}</span>
                        <span className="bg-zinc-800/80 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabela de contratos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Contratos de Aluguer</h2>
                <span className="text-[10px] text-zinc-300">{aluguerRes.length} contrato{aluguerRes.length !== 1 ? 's' : ''}</span>
              </div>
              {aluguerRes.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-12">Sem contratos de aluguer registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                        {['Data Início','Data Fim','Viatura','Cliente','Duração','Valor','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {aluguerSorted.map(r => {
                        const dias = Math.max(1, Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86_400_000));
                        const s = STATUS_ALUGUER[r.status] ?? { label: r.status, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' };
                        return (
                          <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-5 py-4 text-xs text-zinc-200 whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                            <td className="px-5 py-4 text-xs text-zinc-200 whitespace-nowrap">{new Date(r.dataFim).toLocaleDateString('pt-PT')}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                            <td className="px-5 py-4 text-xs text-zinc-200 truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                            <td className="px-5 py-4 text-xs text-zinc-300 whitespace-nowrap">{dias} dia{dias !== 1 ? 's' : ''}</td>
                            <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>{s.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-800/40 border-t border-zinc-700">
                        <td colSpan={5} className="px-5 py-4 text-xs font-black text-white uppercase">Total</td>
                        <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(receitaAluguer)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Viaturas com mais saída */}
            {rankingAluguer.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Viaturas com Mais Saída</h2>
                  <span className="text-[10px] text-zinc-300">{rankingAluguer.length} viatura{rankingAluguer.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-zinc-800/40">
                  {rankingAluguer.map((v, i) => {
                    const pct = (v.receita / maxReceitaAluguer) * 100;
                    return (
                      <div key={v.nome + i} className="px-5 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            i === 0 ? 'bg-amber-500 text-zinc-950' : i === 1 ? 'bg-zinc-400 text-zinc-950' : i === 2 ? 'bg-amber-800 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-sm font-bold text-white truncate">{v.nome}</span>
                              <span className="text-sm font-black text-amber-400 shrink-0">{fmt(v.receita)}</span>
                            </div>
                            <Bar pct={pct} color={i === 0 ? 'bg-amber-500' : 'bg-zinc-600'} />
                          </div>
                        </div>
                        <div className="ml-10 flex gap-5 text-xs text-zinc-500">
                          <span>Contratos: <strong className="text-white">{v.qty}</strong></span>
                          <span>Média/contrato: <strong className="text-amber-400">{fmt(v.mediaValor)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/20 flex justify-between text-sm">
                  <span className="text-zinc-500 font-semibold">Total alugueres</span>
                  <div className="flex gap-6">
                    <span className="text-white font-bold">{rankingAluguer.reduce((s, v) => s + v.qty, 0)} contratos</span>
                    <span className="text-amber-400 font-black">{fmt(rankingAluguer.reduce((s, v) => s + v.receita, 0))}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════ TAB: COMPRA ══ */}
        {tab === 'compra' && (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Contratos"    value={String(compraRes.length)}   color="text-purple-400"  accent="border-purple-500/20" />
              <KpiCard label="Receita Total"      value={fmt(receitaCompra)}          color="text-amber-400"   accent="border-amber-500/20" />
              <KpiCard label="Valor Médio"       value={fmt(compraRes.length > 0 ? receitaCompra / compraRes.length : 0)} color="text-white" />
              <KpiCard label="Prestações Pagas"
                value={totalPrestacoesTotal > 0 ? `${totalPrestacoesPagas}/${totalPrestacoesTotal}` : '—'}
                color="text-emerald-400"
                sub={totalPrestacoesTotal > 0 ? `${Math.round((totalPrestacoesPagas / totalPrestacoesTotal) * 100)}% cumpridas` : undefined} />
            </div>

            {/* Distribuição por estado */}
            {compraRes.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Estado dos Contratos</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(compraByStatus).sort((a, b) => b[1] - a[1]).map(([status, qty]) => {
                    const s = STATUS_COMPRA[status] ?? { label: status, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' };
                    return (
                      <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${s.bg}`}>
                        <span className={s.color}>{s.label}</span>
                        <span className="bg-zinc-800/80 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabela de contratos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Contratos de Compra & Venda</h2>
                <span className="text-[10px] text-zinc-300">{compraRes.length} contrato{compraRes.length !== 1 ? 's' : ''}</span>
              </div>
              {compraRes.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-12">Sem contratos de compra registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                        {['Data','Viatura','Cliente','Prestações','Valor Total','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {compraSorted.map(r => {
                        const s = STATUS_COMPRA[r.status] ?? { label: r.status, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' };
                        const prestStr = r.totalPrestacoes
                          ? `${r.prestacoesPagas ?? 0}/${r.totalPrestacoes}`
                          : '—';
                        return (
                          <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-5 py-4 text-xs text-zinc-200 whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                            <td className="px-5 py-4 text-xs text-zinc-200 truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                            <td className="px-5 py-4 text-xs font-bold text-zinc-300 whitespace-nowrap">{prestStr}</td>
                            <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>{s.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-800/40 border-t border-zinc-700">
                        <td colSpan={4} className="px-5 py-4 text-xs font-black text-white uppercase">Total</td>
                        <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(receitaCompra)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Viaturas mais vendidas */}
            {rankingCompra.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Viaturas Mais Vendidas</h2>
                  <span className="text-[10px] text-zinc-300">{rankingCompra.length} viatura{rankingCompra.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-zinc-800/40">
                  {rankingCompra.map((v, i) => {
                    const pct = (v.receita / maxReceitaCompra) * 100;
                    return (
                      <div key={v.nome + i} className="px-5 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            i === 0 ? 'bg-amber-500 text-zinc-950' : i === 1 ? 'bg-zinc-400 text-zinc-950' : i === 2 ? 'bg-amber-800 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-sm font-bold text-white truncate">{v.nome}</span>
                              <span className="text-sm font-black text-amber-400 shrink-0">{fmt(v.receita)}</span>
                            </div>
                            <Bar pct={pct} color={i === 0 ? 'bg-purple-500' : 'bg-zinc-600'} />
                          </div>
                        </div>
                        <div className="ml-10 flex gap-5 text-xs text-zinc-500">
                          <span>Contratos: <strong className="text-white">{v.qty}</strong></span>
                          <span>Média/contrato: <strong className="text-amber-400">{fmt(v.mediaValor)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/20 flex justify-between text-sm">
                  <span className="text-zinc-500 font-semibold">Total vendas</span>
                  <div className="flex gap-6">
                    <span className="text-white font-bold">{rankingCompra.reduce((s, v) => s + v.qty, 0)} contratos</span>
                    <span className="text-amber-400 font-black">{fmt(rankingCompra.reduce((s, v) => s + v.receita, 0))}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
