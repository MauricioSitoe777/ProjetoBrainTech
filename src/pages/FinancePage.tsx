import { useState, useMemo } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useFinance, CATEGORIA_LABEL } from '../context/FinanceContext';
import { VEHICLES as VEHICLES_STATIC } from '../data/constants';

const fmt  = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
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
  concluida:           { label: 'Concluída',         color: 'text-white',    bg: 'bg-zinc-700/40 border-zinc-700' },
  cancelada:           { label: 'Cancelada',         color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
};

const STATUS_COMPRA: Record<string, { label: string; color: string; bg: string }> = {
  compra_aprovada:  { label: 'Aprovada',     color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  entrada_paga:     { label: 'Entrada Paga', color: 'text-amber-300',   bg: 'bg-amber-300/10 border-amber-300/20' },
  em_prestacao:     { label: 'Em Prestação', color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  prestacao_atraso: { label: 'Em Atraso',    color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
  liquidada:        { label: 'Liquidada',    color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
};

// ── Mini sparkline ────────────────────────────────────────────────────────────
function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 52, H = 20;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * H * 0.85 + H * 0.08,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={d} fill="none" stroke="#E4B42E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2" fill="#E4B42E" />
    </svg>
  );
}

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
    <div className={`bg-zinc-900 border rounded-2xl p-4 space-y-1 ${accent ?? 'border-amber-500/20'}`}>
      <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-xl font-black leading-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-white">{sub}</p>}
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

  const getVehicleMatricula = (id: number) => {
    const dyn = vehicles.find((v: { id: number }) => v.id === id) as { matricula?: string } | undefined;
    const sta = VEHICLES_STATIC.find(v => v.id === id);
    return dyn?.matricula ?? sta?.matricula ?? '—';
  };

  // ── Reservas não canceladas ─────────────────────────────────────────────────
  const resActivas = useMemo(() =>
    reservations.filter(r => r.status !== 'cancelada'),
  [reservations]);

  const aluguerRes    = useMemo(() => resActivas.filter(r => !compraIds.has(r.vehicleId)), [resActivas]);
  const compraRes     = useMemo(() => resActivas.filter(r =>  compraIds.has(r.vehicleId)), [resActivas]);
  const carrosVendidos = useMemo(() => compraRes.filter(r => r.status === 'liquidada').length, [compraRes]);

  // ── Totais de receita ───────────────────────────────────────────────────────
  const receitaAluguer = useMemo(() => aluguerRes.reduce((s, r) => s + r.valorTotal, 0), [aluguerRes]);
  const receitaCompra  = useMemo(() => compraRes .reduce((s, r) => s + r.valorTotal, 0), [compraRes]);
  const receitaXitique = useMemo(() => grupos.reduce((s, g) => {
    const aceites = g.membros.filter(m => m.estado === 'Aceite' || m.estado === 'Sorteado');
    return s + aceites.length * g.quotaMT;
  }, 0), [grupos]);
  const receitaTotal      = receitaAluguer + receitaCompra + receitaXitique;
  const totalEntradas_op  = receitaTotal + totalEntradas;   // reservas + entradas manuais
  const valorArrecadado   = totalEntradas_op - totalSaidas; // resultado líquido real
  const margem            = totalEntradas_op > 0 ? Math.round((valorArrecadado / totalEntradas_op) * 100) : 0;

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

  const dadosMesAnteAnterior = dadosMensais.find(d => {
    const prev2 = new Date(anoAtual, mesAtual - 2, 1);
    return d.year === prev2.getFullYear() && d.month === prev2.getMonth();
  });
  const variacaoMesAnterior = dadosMesAnteAnterior && dadosMesAnteAnterior.total > 0
    ? Math.round(((dadosMesAnterior?.total ?? 0) - dadosMesAnteAnterior.total) / dadosMesAnteAnterior.total * 100)
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
            <p className="text-white text-sm mt-1">Análise financeira e performance das viaturas</p>
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
                tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-white hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ TAB: GERAL ══ */}
        {tab === 'geral' && (
          <div className="space-y-5">

            {/* 1. KPI Cards — topo, linha horizontal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* VIATURAS NA EMPRESA */}
              <div style={{ background: 'linear-gradient(135deg,rgba(228,180,46,.18) 0%,rgba(154,106,16,.07) 100%)', borderColor: 'rgba(228,180,46,.38)' }} className="border rounded-2xl p-4 flex items-center gap-4">
                <div style={{ backgroundColor: 'rgba(228,180,46,.18)' }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0CD49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white uppercase font-bold tracking-wider">Total Entradas</p>
                  <p style={{ color: '#F0CD49' }} className="text-2xl font-black leading-tight">{vehicles.length} <span className="text-sm font-semibold">viaturas</span></p>
                </div>
              </div>
              {/* CARROS VENDIDOS */}
              <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white uppercase font-bold tracking-wider">Total Saídas</p>
                  <p className="text-2xl font-black text-red-400 leading-tight">{carrosVendidos} <span className="text-sm font-semibold">vendidos</span></p>
                </div>
              </div>
              {/* VALOR ARRECADADO — ouro quando positivo */}
              <div style={{
                background: valorArrecadado >= 0
                  ? 'linear-gradient(135deg,rgba(228,180,46,.10) 0%,rgba(154,106,16,.04) 100%)'
                  : 'rgba(239,68,68,.05)',
                borderColor: valorArrecadado >= 0 ? 'rgba(228,180,46,.28)' : 'rgba(239,68,68,.2)',
              }} className="border rounded-2xl p-4 flex items-center gap-4">
                <div style={{ backgroundColor: valorArrecadado >= 0 ? 'rgba(228,180,46,.14)' : 'rgba(239,68,68,.10)' }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={valorArrecadado >= 0 ? '#E4B42E' : '#f87171'} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white uppercase font-bold tracking-wider">Valor Arrecadado</p>
                  <p style={{ color: valorArrecadado >= 0 ? '#E4B42E' : '#f87171' }} className="text-2xl font-black leading-tight">{fmt(valorArrecadado)}</p>
                </div>
              </div>
            </div>

            {/* 2. Gráfico — Receita Total */}
            {(() => {
              const SVG_W = 560, SVG_H = 90, PAD_T = 8, PAD_B = 4;
              const dataH = SVG_H - PAD_T - PAD_B;
              const pts: [number, number][] = Array.from({ length: 12 }, (_, i) => {
                const d = dadosAno.find(x => x.month === i);
                const x = (i / 11) * SVG_W;
                const y = PAD_T + dataH - (d && maxTotal > 0 ? (d.total / maxTotal) * dataH : 0);
                return [x, y];
              });
              // Catmull-Rom → Bezier para curva suave
              const linePath = (() => {
                let p = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, 11)];
                  const cp1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1);
                  const cp1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1);
                  const cp2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1);
                  const cp2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1);
                  p += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
                }
                return p;
              })();
              const areaPath = `${linePath} L ${SVG_W},${SVG_H} L 0,${SVG_H} Z`;
              const yLabels = [1, 0.75, 0.5, 0.25, 0].map(f => fmtK(maxTotal * f));
              return (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
                  <h2 className="text-white font-black text-base mb-4">Receita Total</h2>
                  <div className="flex gap-3">
                    <div className="flex flex-col justify-between text-right shrink-0" style={{ height: SVG_H }}>
                      {yLabels.map((l, i) => <span key={i} className="text-[10px] text-white leading-none">{l}</span>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E4B42E" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#E4B42E" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        {[1, 0.75, 0.5, 0.25].map(f => (
                          <line key={f} x1="0" y1={PAD_T + dataH * (1 - f)} x2={SVG_W} y2={PAD_T + dataH * (1 - f)} stroke="#27272a" strokeWidth="1" />
                        ))}
                        <path d={areaPath} fill="url(#chartGrad)" />
                        <path d={linePath} fill="none" stroke="#E4B42E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map(([x, y], i) => dadosAno.find(d => d.month === i)
                          ? <circle key={i} cx={x} cy={y} r="4" fill="#E4B42E" />
                          : null
                        )}
                      </svg>
                      <div className="flex justify-between mt-1">
                        {MESES_ABR.map(m => <span key={m} className="text-xs text-white">{m}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Channel Revenue Breakdown + Totais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Breakdown */}
              <div className="lg:col-span-2 bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-amber-400 font-black text-base">Distribuição de Receita por Canal</h2>
                </div>
                <div className="p-5 space-y-5">
                  {[
                    { label: 'Aluguer de Viaturas', value: receitaAluguer, qty: aluguerRes.length, color: 'bg-amber-400', text: 'text-amber-400', unit: 'contratos' },
                    { label: 'Compras & Vendas',     value: receitaCompra,  qty: compraRes.length,  color: 'bg-amber-500', text: 'text-amber-500', unit: 'contratos' },
                    { label: 'Xitique',              value: receitaXitique, qty: inscricoes.filter(i => i.status === 'aprovado').length, color: 'bg-amber-700', text: 'text-amber-700', unit: 'membros' },
                  ].map(item => {
                    const pct = receitaTotal > 0 ? (item.value / receitaTotal) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                            <span className="text-white font-bold text-sm">{item.label}</span>
                            <span className="text-white text-xs">{item.qty} {item.unit}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white text-xs font-semibold">{Math.round(pct)}%</span>
                            <span className={`font-black text-base ${item.text}`}>{fmt(item.value)}</span>
                          </div>
                        </div>
                        <Bar pct={pct} color={item.color} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totais */}
              <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
                <h2 className="text-amber-400 font-black text-base mb-1">Resumo Mensal</h2>
                <p className="text-xs text-white mb-4">Receita por período</p>
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/70">
                    <div>
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Mês Actual</p>
                      <p className="text-sm font-bold text-white">{MESES_FULL[mesAtual]}</p>
                      <p className="text-base font-black text-white mt-0.5">{fmt(dadosMesAtual?.total ?? 0)}</p>
                    </div>
                    {variacaoMes !== null && (
                      <div className="text-right">
                        <p className="text-[10px] text-white mb-1">vs. mês anterior</p>
                        <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${variacaoMes >= 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                          {variacaoMes >= 0 ? '+' : ''}{variacaoMes}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/70">
                    <div>
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Mês Anterior</p>
                      <p className="text-sm font-bold text-white">{MESES_FULL[(mesAtual + 11) % 12]}</p>
                      <p className="text-base font-black text-white mt-0.5">{fmt(dadosMesAnterior?.total ?? 0)}</p>
                    </div>
                    {variacaoMesAnterior !== null && (
                      <div className="text-right">
                        <p className="text-[10px] text-white mb-1">vs. mês precedente</p>
                        <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${variacaoMesAnterior >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {variacaoMesAnterior >= 0 ? '+' : ''}{variacaoMesAnterior}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Melhor Mês de Sempre</p>
                      <p className="text-sm font-bold text-white">{melhorMes ? `${MESES_FULL[melhorMes.month]} ${melhorMes.year}` : '—'}</p>
                      <p className="text-base font-black text-amber-400 mt-0.5">{melhorMes ? fmt(melhorMes.total) : fmt(0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Melhores do Mês */}
            <div>
              <h2 className="text-white font-black text-base mb-3">Melhores do Mês ({MESES_ABR[mesAtual]})</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0CD49" strokeWidth="2" strokeLinecap="round">
                      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-white uppercase font-bold tracking-wider">Aluguer</p>
                    <p className="text-base font-black text-white">{fmt(dadosMesAtual?.aluguerVal ?? 0)}</p>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E4B42E" strokeWidth="2" strokeLinecap="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-amber-400 uppercase font-bold tracking-wider">Venda</p>
                    <p className="text-base font-black text-amber-400">{fmt(dadosMesAtual?.compraVal ?? 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Lucratividade por Categoria */}
            {porCategoria.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Lucratividade por Categoria</h2>
                  <span className="text-[10px] text-white">Transações manuais</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {porCategoria.map((c, i) => (
                    <div key={c.cat} className="px-5 py-4 flex items-center gap-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        i === 0 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-white'
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
          <div className="space-y-5">

            {/* Year selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white font-bold uppercase tracking-wider">Ano:</span>
              <div className="flex gap-1.5">
                {anos.map(a => (
                  <button key={a} onClick={() => { setAnoSel(a); setMesSel(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      anoSel === a ? 'text-zinc-950 border-transparent' : 'bg-zinc-900 text-white border-zinc-700 hover:border-zinc-500'
                    }`}
                    style={anoSel === a ? { background: 'linear-gradient(135deg,#F0CD49,#C28A18)' } : {}}
                  >{a}</button>
                ))}
              </div>
            </div>

            {dadosAno.length === 0 ? (
              <div className="text-center text-white text-sm py-16 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                Sem dados para {anoSel}
              </div>
            ) : (
              <>
                {/* 5 KPI cards */}
                {(() => {
                  const totalAno        = dadosAno.reduce((s, d) => s + d.total,     0);
                  const totalAnoVendasQ = dadosAno.reduce((s, d) => s + d.compraQty, 0);
                  const totalAnoVendasV = dadosAno.reduce((s, d) => s + d.compraVal, 0);
                  const dCurr = dadosAno.find(d => d.month === mesAtual);
                  const dPrev = dadosAno.find(d => d.month === (mesAtual > 0 ? mesAtual - 1 : 11));
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">{MESES_ABR[mesAtual]} — Alug.</p>
                        <p className="text-xl font-black leading-tight" style={{ color: '#F0CD49' }}>{fmtK(dCurr?.aluguerVal ?? 0)}</p>
                        <p className="text-[10px] text-white mt-0.5">Mês actual</p>
                      </div>
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">{MESES_ABR[mesAtual > 0 ? mesAtual - 1 : 11]} — Alug.</p>
                        <p className="text-xl font-black leading-tight" style={{ color: '#F0CD49' }}>{fmtK(dPrev?.aluguerVal ?? 0)}</p>
                        <p className="text-[10px] text-white mt-0.5">Mês anterior</p>
                      </div>
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">Vendas {anoSel}</p>
                        <p className="text-xl font-black text-white leading-tight">{totalAnoVendasQ}</p>
                        <p className="text-[10px] text-white mt-0.5">Contratos compra</p>
                      </div>
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">Rec. Venda</p>
                        <p className="text-xl font-black leading-tight" style={{ color: '#C28A18' }}>{fmtK(totalAnoVendasV)}</p>
                        <p className="text-[10px] text-white mt-0.5">Receita compra {anoSel}</p>
                      </div>
                      <div className="border rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,rgba(228,180,46,.12),rgba(154,106,16,.05))', borderColor: 'rgba(228,180,46,.25)' }}>
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">Total {anoSel}</p>
                        <p className="text-xl font-black leading-tight" style={{ color: '#E4B42E' }}>{fmtK(totalAno)}</p>
                        <p className="text-[10px] text-white mt-0.5">Todas as receitas</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Two bar charts side by side */}
                {(() => {
                  const projectoes = Array.from({ length: 12 }, (_, i) => {
                    const prev = dadosAno.find(x => x.month === i - 1);
                    return prev ? prev.total * 1.15 : 0;
                  });
                  const barMax = Math.max(maxTotal, ...projectoes, 1);
                  const BAR_H = 96;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Monthly Revenue */}
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
                        <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Receita Mensal — {anoSel}</h2>
                        <div className="flex items-end gap-1" style={{ height: `${BAR_H + 18}px` }}>
                          {Array.from({ length: 12 }, (_, i) => {
                            const d   = dadosAno.find(x => x.month === i);
                            const pct = d ? (d.total / maxTotal) * 100 : 0;
                            const isCur = i === mesAtual && anoSel === anoAtual;
                            const isSel = mesSel === i;
                            return (
                              <button key={i} onClick={() => setMesSel(isSel ? null : i)}
                                className="flex-1 flex flex-col items-center gap-1 group min-w-0"
                                title={`${MESES_FULL[i]}: ${fmt(d?.total ?? 0)}`}>
                                <div className="w-full flex flex-col justify-end" style={{ height: `${BAR_H}px` }}>
                                  <div className="w-full rounded-t-sm transition-all duration-300"
                                    style={{
                                      height: pct > 0 ? `${pct}%` : '2px',
                                      background: isSel
                                        ? '#F0CD49'
                                        : isCur
                                        ? 'linear-gradient(180deg,#F0CD49 0%,#E4B42E 100%)'
                                        : d
                                        ? 'linear-gradient(180deg,#E4B42E 0%,#C28A18 100%)'
                                        : 'rgba(63,63,70,0.35)',
                                    }} />
                                </div>
                                <span className={`text-[8px] font-bold leading-none ${isCur ? 'text-amber-400' : 'text-white'}`}>
                                  {MESES_ABR[i]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Revenue vs Projections */}
                      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
                        <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Receita vs. Projeções</h2>
                        <div className="flex items-end gap-1" style={{ height: `${BAR_H + 18}px` }}>
                          {Array.from({ length: 12 }, (_, i) => {
                            const d      = dadosAno.find(x => x.month === i);
                            const actual = d?.total ?? 0;
                            const proj   = projectoes[i];
                            const isCur  = i === mesAtual && anoSel === anoAtual;
                            const isSel  = mesSel === i;
                            const projH  = proj  > 0 ? (proj  / barMax) * BAR_H : 0;
                            const actH   = proj  > 0 ? (actual / proj)  * projH  : (actual > 0 ? (actual / barMax) * BAR_H : 0);
                            const gapH   = Math.max(0, projH - actH);
                            return (
                              <button key={i} onClick={() => setMesSel(isSel ? null : i)}
                                className="flex-1 flex flex-col items-center gap-1 group min-w-0"
                                title={`${MESES_FULL[i]}: ${fmt(actual)} / Proj: ${fmt(proj)}`}>
                                <div className="w-full flex flex-col justify-end" style={{ height: `${BAR_H}px` }}>
                                  <div className="w-full rounded-t-sm overflow-hidden flex flex-col"
                                    style={{ height: `${projH > 0 ? projH : (actual > 0 ? (actual / barMax) * BAR_H : 2)}px` }}>
                                    {gapH > 0 && (
                                      <div style={{ height: `${gapH}px`, background: 'rgba(100,55,10,0.45)', flexShrink: 0 }} />
                                    )}
                                    <div style={{
                                      flex: 1,
                                      background: isSel
                                        ? '#F0CD49'
                                        : isCur
                                        ? 'linear-gradient(180deg,#F0CD49,#E4B42E)'
                                        : 'linear-gradient(180deg,#E4B42E,#C28A18)',
                                    }} />
                                  </div>
                                </div>
                                <span className={`text-[8px] font-bold leading-none ${isCur ? 'text-amber-400' : 'text-white'}`}>
                                  {MESES_ABR[i]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-zinc-800/60">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-2 rounded-sm" style={{ background: '#E4B42E' }} />
                            <span className="text-[10px] text-white">Real</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(100,55,10,0.6)' }} />
                            <span className="text-[10px] text-white">Projecção +15%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabela mensal */}
                <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                    <h2 className="text-white font-black text-sm uppercase tracking-wider">
                      {mesSel !== null ? `Detalhe — ${MESES_FULL[mesSel]} ${anoSel}` : `Todos os Meses — ${anoSel}`}
                    </h2>
                    {mesSel !== null && (
                      <button onClick={() => setMesSel(null)} className="text-[10px] text-white hover:text-amber-400 font-bold transition">
                        ← Ver todos
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                          {['Mês', 'Alugueres', 'Rec. Aluguer', 'Vendas', 'Rec. Venda', 'Total', 'Var.'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {(mesSel !== null ? dadosAno.filter(d => d.month === mesSel) : dadosAno).map((d, i, arr) => {
                          const prev = arr[i - 1];
                          const var_ = prev && prev.total > 0
                            ? Math.round(((d.total - prev.total) / prev.total) * 100)
                            : null;
                          const isCurrentMonth = d.month === mesAtual && anoSel === anoAtual;
                          return (
                            <tr key={d.key}
                              onClick={() => setMesSel(mesSel === d.month ? null : d.month)}
                              className={`cursor-pointer transition-colors hover:bg-zinc-800/40 ${isCurrentMonth ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-5 py-4 text-sm font-black text-white whitespace-nowrap">
                                {MESES_FULL[d.month]}
                                {isCurrentMonth && <span className="ml-1.5 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">Actual</span>}
                              </td>
                              <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: '#F0CD49' }}>{d.aluguerQty}</td>
                              <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#F0CD49' }}>{fmt(d.aluguerVal)}</td>
                              <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: '#C28A18' }}>{d.compraQty}</td>
                              <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#C28A18' }}>{fmt(d.compraVal)}</td>
                              <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(d.total)}</td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                {isCurrentMonth ? (
                                  <span className="text-white text-xs font-bold">—</span>
                                ) : i === 0 ? (
                                  <MiniSparkline values={dadosAno.map(x => x.total)} />
                                ) : var_ !== null ? (
                                  <span className={`text-xs font-bold ${var_ >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {var_ >= 0 ? '▲' : '▼'} {Math.abs(var_)}%
                                  </span>
                                ) : (
                                  <span className="text-white text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {dadosAno.length > 1 && mesSel === null && (
                        <tfoot>
                          <tr className="bg-zinc-800/40 border-t border-zinc-700">
                            <td className="px-5 py-4 text-xs font-black text-white uppercase">Total {anoSel}</td>
                            <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#F0CD49' }}>{dadosAno.reduce((s, d) => s + d.aluguerQty, 0)}</td>
                            <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#F0CD49' }}>{fmt(dadosAno.reduce((s, d) => s + d.aluguerVal, 0))}</td>
                            <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#C28A18' }}>{dadosAno.reduce((s, d) => s + d.compraQty, 0)}</td>
                            <td className="px-5 py-4 text-sm font-black whitespace-nowrap" style={{ color: '#C28A18' }}>{fmt(dadosAno.reduce((s, d) => s + d.compraVal, 0))}</td>
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
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <h3 className="text-white font-black text-sm uppercase tracking-wider">
                          Contratos de {MESES_FULL[mesSel]} {anoSel} · {resDoMes.length} total
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-zinc-800/50">
                              {['#','Data','Viatura','Cliente','Tipo','Valor','Estado'].map(h => (
                                <th key={h} className={`text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${h === '#' ? 'text-white/40 w-10' : 'text-white'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {resDoMes.map((r, idx) => {
                              const isCompra = compraIds.has(r.vehicleId);
                              return (
                                <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                                  <td className="px-4 py-2.5 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                                  <td className="px-5 py-4 text-xs text-white whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                                  <td className="px-5 py-4 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                                  <td className="px-5 py-4 text-xs text-white truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                                  <td className="px-5 py-4">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                      style={isCompra
                                        ? { color: '#C28A18', background: 'rgba(194,138,24,.1)', borderColor: 'rgba(194,138,24,.2)' }
                                        : { color: '#F0CD49', background: 'rgba(240,205,73,.1)', borderColor: 'rgba(240,205,73,.2)' }
                                      }
                                    >{isCompra ? 'Compra' : 'Aluguer'}</span>
                                  </td>
                                  <td className="px-5 py-4 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                                  <td className="px-5 py-4 text-xs text-white capitalize">{r.status.replace(/_/g, ' ')}</td>
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
              <KpiCard label="Lucro"            value={fmt(lucroLiquido)}          color={lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <KpiCard label="Dívidas Activas" value={fmt(totalDividasPendentes)} color="text-amber-400" />
            </div>

            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Transações Manuais</h2>
                <span className="text-[10px] text-white">{transacoes.length} registos</span>
              </div>
              {transacoes.length === 0 ? (
                <p className="text-center text-white text-sm py-12">Sem transações manuais registadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        {['#','Data','Descrição','Categoria','Tipo','Valor'].map(h => (
                          <th key={h} className={`text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${h === '#' ? 'text-white/40 w-10' : 'text-white'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {[...transacoes].sort((a, b) => b.data.localeCompare(a.data)).map((t, idx) => (
                        <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-2.5 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                          <td className="px-5 py-4 text-xs text-white whitespace-nowrap">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                          <td className="px-5 py-4 text-sm text-white font-medium truncate max-w-[200px]">{t.descricao}</td>
                          <td className="px-5 py-4 text-xs text-white">{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</td>
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
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total Contratos"  value={String(aluguerRes.length)}  color="text-blue-400"    accent="border-blue-500/20" />
              <KpiCard label="Receita Total"    value={fmt(receitaAluguer)}         color="text-amber-400"   accent="border-amber-500/20" />
            </div>

            {/* Distribuição por estado */}
            {aluguerRes.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Estado dos Contratos</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(aluguerByStatus).sort((a, b) => b[1] - a[1]).map(([status, qty]) => {
                    const s = STATUS_ALUGUER[status] ?? { label: status, color: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
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
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Contratos de Aluguer</h2>
                <span className="text-[10px] text-white">{aluguerRes.length} contrato{aluguerRes.length !== 1 ? 's' : ''}</span>
              </div>
              {aluguerRes.length === 0 ? (
                <p className="text-center text-white text-sm py-12">Sem contratos de aluguer registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                        {['#','Data Início','Data Fim','Viatura','Matrícula','Cliente','Duração','Valor','Estado Viatura','Estado'].map(h => (
                          <th key={h} className={`text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${h === '#' ? 'text-white/40 w-10' : 'text-white'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {aluguerSorted.map((r, idx) => {
                        const dias = Math.max(1, Math.round((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86_400_000));
                        const s = STATUS_ALUGUER[r.status] ?? { label: r.status, color: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
                        return (
                          <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-3 py-1.5 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{new Date(r.dataFim).toLocaleDateString('pt-PT')}</td>
                            <td className="px-3 py-1.5 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{getVehicleMatricula(r.vehicleId)}</td>
                            <td className="px-3 py-1.5 text-xs text-white truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{dias} dia{dias !== 1 ? 's' : ''}</td>
                            <td className="px-3 py-1.5 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                            <td className="px-3 py-1.5 text-xs font-semibold text-white truncate max-w-[160px]" title={r.estadoViaturaDevolucao}>{r.estadoViaturaDevolucao ?? '—'}</td>
                            <td className="px-3 py-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${s.bg} ${s.color}`}>{s.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-800/40 border-t border-zinc-700">
                        <td colSpan={7} className="px-3 py-1.5 text-xs font-black text-white uppercase">Total</td>
                        <td className="px-3 py-1.5 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(receitaAluguer)}</td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Viaturas com mais saída */}
            {rankingAluguer.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Viaturas com Mais Saída</h2>
                  <span className="text-[10px] text-white">{rankingAluguer.length} viatura{rankingAluguer.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-zinc-800/40">
                  {rankingAluguer.map((v, i) => {
                    const pct = (v.receita / maxReceitaAluguer) * 100;
                    return (
                      <div key={v.nome + i} className="px-5 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            i === 0 ? 'bg-amber-500 text-zinc-950' : i === 1 ? 'bg-zinc-400 text-zinc-950' : i === 2 ? 'bg-amber-800 text-white' : 'bg-zinc-800 text-white'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-sm font-bold text-white truncate">{v.nome}</span>
                              <span className="text-sm font-black text-amber-400 shrink-0">{fmt(v.receita)}</span>
                            </div>
                            <Bar pct={pct} color={i === 0 ? 'bg-amber-500' : 'bg-zinc-600'} />
                          </div>
                        </div>
                        <div className="ml-10 flex gap-5 text-xs text-white">
                          <span>Contratos: <strong className="text-white">{v.qty}</strong></span>
                          <span>Média/contrato: <strong className="text-amber-400">{fmt(v.mediaValor)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/20 flex justify-between text-sm">
                  <span className="text-white font-semibold">Total alugueres</span>
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
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total Contratos"    value={String(compraRes.length)}   color="text-white" />
              <KpiCard label="Receita Total"      value={fmt(receitaCompra)}          color="text-amber-400"   accent="border-amber-500/20" />
            </div>

            {/* Distribuição por estado */}
            {compraRes.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Estado dos Contratos</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(compraByStatus).sort((a, b) => b[1] - a[1]).map(([status, qty]) => {
                    const s = STATUS_COMPRA[status] ?? { label: status, color: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
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
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <h2 className="text-white font-black text-sm uppercase tracking-wider">Contratos de Compra & Venda</h2>
                <span className="text-[10px] text-white">{compraRes.length} contrato{compraRes.length !== 1 ? 's' : ''}</span>
              </div>
              {compraRes.length === 0 ? (
                <p className="text-center text-white text-sm py-12">Sem contratos de compra registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                        {['Data','Viatura','Matrícula','Cliente','Prestações','Valor Total','Estado'].map(h => (
                          <th key={h} className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {compraSorted.map(r => {
                        const s = STATUS_COMPRA[r.status] ?? { label: r.status, color: 'text-white', bg: 'bg-zinc-800 border-zinc-700' };
                        const prestStr = r.totalPrestacoes
                          ? `${r.prestacoesPagas ?? 0}/${r.totalPrestacoes}`
                          : '—';
                        return (
                          <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{new Date(r.dataInicio).toLocaleDateString('pt-PT')}</td>
                            <td className="px-3 py-1.5 text-sm font-semibold text-white truncate max-w-[140px]">{getVehicleName(r.vehicleId)}</td>
                            <td className="px-3 py-1.5 text-xs text-white whitespace-nowrap">{getVehicleMatricula(r.vehicleId)}</td>
                            <td className="px-3 py-1.5 text-xs text-white truncate max-w-[120px]">{r.clientName ?? '—'}</td>
                            <td className="px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap">{prestStr}</td>
                            <td className="px-3 py-1.5 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(r.valorTotal)}</td>
                            <td className="px-3 py-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${s.bg} ${s.color}`}>{s.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-800/40 border-t border-zinc-700">
                        <td colSpan={5} className="px-3 py-1.5 text-xs font-black text-white uppercase">Total</td>
                        <td className="px-3 py-1.5 text-sm font-black text-amber-400 whitespace-nowrap">{fmt(receitaCompra)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Viaturas mais vendidas */}
            {rankingCompra.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider">Viaturas Mais Vendidas</h2>
                  <span className="text-[10px] text-white">{rankingCompra.length} viatura{rankingCompra.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-zinc-800/40">
                  {rankingCompra.map((v, i) => {
                    const pct = (v.receita / maxReceitaCompra) * 100;
                    return (
                      <div key={v.nome + i} className="px-5 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            i === 0 ? 'bg-amber-500 text-zinc-950' : i === 1 ? 'bg-zinc-400 text-zinc-950' : i === 2 ? 'bg-amber-800 text-white' : 'bg-zinc-800 text-white'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-sm font-bold text-white truncate">{v.nome}</span>
                              <span className="text-sm font-black text-amber-400 shrink-0">{fmt(v.receita)}</span>
                            </div>
                            <Bar pct={pct} color={i === 0 ? 'bg-amber-500' : 'bg-zinc-600'} />
                          </div>
                        </div>
                        <div className="ml-10 flex gap-5 text-xs text-white">
                          <span>Contratos: <strong className="text-white">{v.qty}</strong></span>
                          <span>Média/contrato: <strong className="text-amber-400">{fmt(v.mediaValor)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/20 flex justify-between text-sm">
                  <span className="text-white font-semibold">Total vendas</span>
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
