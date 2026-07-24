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

const compraIds = new Set(VEHICLES_STATIC.filter(v => v.mode === 'compra').map(v => v.id));

const Canais = ['Todas', 'Aluguer', 'Compra/Venda', 'Xitique', 'Manuais'];

// Helper to check if a date is between two dates (inclusive)
const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
  const date = new Date(dateStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  return date >= start && date <= end;
};

export function FinancePage() {
  const { reservations } = useReservations();
  const { vehicles } = useVehicles();
  const { grupos, inscricoes } = useXitique();
  const { transacoes, totalEntradas, totalSaidas } = useFinance();

  const [periodo, setPeriodo] = useState<'mes' | 'ano' | 'personalizado'>('ano');
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-07-31');
  const [canal, setCanal] = useState('Todas');

  // Calculate date range based on selected period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (periodo === 'mes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0],
      };
    }
    if (periodo === 'ano') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0],
      };
    }
    return { startDate: dataInicio, endDate: dataFim };
  }, [periodo, dataInicio, dataFim]);

  const getVehicleName = (id: number) => {
    const dyn = vehicles.find((v: { id: number }) => v.id === id) as { name?: string } | undefined;
    const sta = VEHICLES_STATIC.find(v => v.id === id);
    return dyn?.name ?? sta?.name ?? `Viatura #${id}`;
  };

  // Filter reservations by date range
  const resActivas = useMemo(() => reservations.filter(r => r.status !== 'cancelada'), [reservations]);
  const resFiltradas = useMemo(() => resActivas.filter(r => isDateInRange(r.dataInicio, startDate, endDate)), [resActivas, startDate, endDate]);
  const aluguerRes = useMemo(() => resFiltradas.filter(r => !compraIds.has(r.vehicleId)), [resFiltradas]);
  const compraRes  = useMemo(() => resFiltradas.filter(r => compraIds.has(r.vehicleId)), [resFiltradas]);

  // Filter transactions (manuais) - only include "pago"
  const transacoesFiltradas = useMemo(() => transacoes.filter(t => t.status === 'pago' && isDateInRange(t.data, startDate, endDate)), [transacoes, startDate, endDate]);
  const totalEntradasFiltradas = useMemo(() => transacoesFiltradas.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0), [transacoesFiltradas]);
  const totalSaidasFiltradas = useMemo(() => transacoesFiltradas.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0), [transacoesFiltradas]);

  // Filter inscricoes xitique - use dataCriacao
  const inscricoesFiltradas = useMemo(() => inscricoes.filter(i => isDateInRange(i.dataCriacao, startDate, endDate)), [inscricoes, startDate, endDate]);

  const receitaAluguer = useMemo(() => aluguerRes.reduce((s, r) => s + r.valorTotal, 0), [aluguerRes]);
  const receitaCompra  = useMemo(() => compraRes.reduce((s, r) => s + r.valorTotal, 0), [compraRes]);
  const receitaXitique = useMemo(() => grupos.reduce((s, g) => {
    const aceites = g.membros.filter(m => m.estado === 'Aceite' || m.estado === 'Sorteado');
    // Let's assume xitique quota is per month for this example
    return s + aceites.length * g.quotaMT;
  }, 0), [grupos]);
  const receitaTotal = receitaAluguer + receitaCompra + receitaXitique;
  const totalEntradasOp = receitaTotal + totalEntradasFiltradas;
  const valorArrecadado = totalEntradasOp - totalSaidasFiltradas;

  // Generate monthly data based on actual filtered data
  const dadosMensais = useMemo(() => {
    const mapa: Record<string, { aluguerVal: number; compraVal: number; saidasVal: number }> = {};
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        mapa[key] = { aluguerVal: 0, compraVal: 0, saidasVal: 0 };
      }
    }

    // Add aluguer and compra values from filtered reservations
    for (const r of resFiltradas) {
      const key = r.dataInicio.slice(0, 7);
      if (!mapa[key]) continue;
      if (compraIds.has(r.vehicleId)) {
        mapa[key].compraVal += r.valorTotal;
      } else {
        mapa[key].aluguerVal += r.valorTotal;
      }
    }

    // Add saidas from filtered transactions
    for (const t of transacoesFiltradas) {
      if (t.tipo === 'saida') {
        const key = t.data.slice(0, 7);
        if (mapa[key]) {
          mapa[key].saidasVal += t.valor;
        }
      }
    }

    return Object.entries(mapa)
      .map(([key, d]) => ({ key, year: parseInt(key.slice(0, 4)), month: parseInt(key.slice(5, 7)) - 1, totalReceita: d.aluguerVal + d.compraVal, saidasVal: d.saidasVal, ...d }))
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }, [resFiltradas, transacoesFiltradas, startDate, endDate]);

  const canais = useMemo(() => {
    let canaisList = [
      { nome: 'Compras & Vendas', valor: receitaCompra, cor: '#F0CD49', qtd: compraRes.length },
      { nome: 'Aluguer', valor: receitaAluguer, cor: '#E4B42E', qtd: aluguerRes.length },
      { nome: 'Xitique', valor: receitaXitique, cor: '#C28A18', qtd: inscricoesFiltradas.filter(i => i.status === 'aprovado').length },
      { nome: 'Movimentos Financeiros', valor: totalEntradasFiltradas, cor: '#8B7355', qtd: transacoesFiltradas.length },
    ];

    // Filter by selected canal
    if (canal !== 'Todas') {
      const canalMap: Record<string, string> = {
        'Aluguer': 'Aluguer',
        'Compra/Venda': 'Compras & Vendas',
        'Xitique': 'Xitique',
        'Manuais': 'Movimentos Financeiros'
      };
      const targetNome = canalMap[canal];
      canaisList = canaisList.filter(c => c.nome === targetNome);
    }

    return canaisList;
  }, [receitaCompra, receitaAluguer, receitaXitique, totalEntradasFiltradas, compraRes.length, aluguerRes.length, inscricoesFiltradas, transacoesFiltradas, canal]);

  const maxTotal = useMemo(() => Math.max(1, ...dadosMensais.map(d => Math.max(d.totalReceita, d.saidasVal))), [dadosMensais]);

  const DonutChart = () => {
    const total = canais.reduce((sum, c) => sum + c.valor, 0);
    let currentAngle = 0;
    const paths: string[] = [];
    const radius = 60;
    const innerRadius = 35;

    for (const canal of canais) {
      if (canal.valor === 0) continue;
      const angle = (canal.valor / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;

      const x1 = 80 + radius * Math.cos(startRad);
      const y1 = 80 + radius * Math.sin(startRad);
      const x2 = 80 + radius * Math.cos(endRad);
      const y2 = 80 + radius * Math.sin(endRad);
      const x3 = 80 + innerRadius * Math.cos(endRad);
      const y3 = 80 + innerRadius * Math.sin(endRad);
      const x4 = 80 + innerRadius * Math.cos(startRad);
      const y4 = 80 + innerRadius * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');

      paths.push(`<path d="${d}" fill="${canal.cor}" />`);
      currentAngle = endAngle;
    }

    return (
      <div className="flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 160 160" dangerouslySetInnerHTML={{ __html: paths.join('') }} />
        <div className="flex flex-col gap-2">
          {canais.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
              <span className="text-white text-xs">{c.nome}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="w-full px-4 sm:px-6 py-6 space-y-4">

        {/* Header com filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Filtro de período rápido */}
            <div className="flex gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1">
              {['Este Mês', 'Este Ano', 'Personalizado'].map((op, idx) => (
                <button
                  key={op}
                  onClick={() => setPeriodo(idx === 0 ? 'mes' : idx === 1 ? 'ano' : 'personalizado')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition ${
                    (periodo === 'mes' && idx === 0) ||
                    (periodo === 'ano' && idx === 1) ||
                    (periodo === 'personalizado' && idx === 2)
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>

            {/* Seletor de intervalo personalizado */}
            {periodo === 'personalizado' && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
                <label className="text-xs text-white font-bold">De:</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white" />
                <label className="text-xs text-white font-bold">Até:</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white" />
              </div>
            )}

            {/* Filtro de canal */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-white font-bold">Canal:</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
              >
                {Canais.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg text-xs text-white flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
            <button className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg text-xs text-white flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3v4a1 1 0 001 1h4" />
                <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-black text-white">Relatórios & Estatísticas</h1>

        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Resumo de Caixa (Entradas) */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1">Resumo de Caixa ({new Date(startDate).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })})</p>
            <p className="text-white text-xs font-semibold mb-1">ENTRADAS:</p>
            <p className="text-2xl font-black text-amber-400">{fmt(totalEntradasOp)}</p>
          </div>

          {/* Saídas Detalhadas */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">Saídas Detalhadas</p>
            <p className="text-2xl font-black text-red-400">{fmt(totalSaidas)}</p>
          </div>

          {/* Saldo Líquido */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1">Saldo Líquido</p>
            <p className="text-2xl font-black text-amber-400">{fmt(valorArrecadado)}</p>
            <p className="text-white text-xs">MT</p>
          </div>
        </div>

        {/* Gráfico de Receita vs Despesas */}
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-sm">Receita Total</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 bg-amber-400 rounded-full" />
                <span className="text-white text-[10px] font-semibold">Receita Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 bg-zinc-500 rounded-full" />
                <span className="text-white text-[10px] font-semibold">Despesas Totais (Saídas)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-right shrink-0" style={{ height: '150px' }}>
              <span className="text-[9px] text-white leading-none">{fmtK(maxTotal)}</span>
              <span className="text-[9px] text-white leading-none">{fmtK(maxTotal * 0.75)}</span>
              <span className="text-[9px] text-white leading-none">{fmtK(maxTotal * 0.5)}</span>
              <span className="text-[9px] text-white leading-none">{fmtK(maxTotal * 0.25)}</span>
              <span className="text-[9px] text-white leading-none">0,00</span>
            </div>
            <div className="flex-1 min-w-0">
              <svg viewBox="0 0 600 200" className="w-full" style={{ height: '150px' }}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E4B42E" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#E4B42E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(ratio => (
                  <line
                    key={ratio}
                    x1="0"
                    y1={200 - ratio * 180}
                    x2="600"
                    y2={200 - ratio * 180}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                ))}

                {/* Despesas (gray line) */}
                <path
                  d={(() => {
                    let path = '';
                    dadosMensais.forEach((d, i) => {
                      const x = dadosMensais.length > 1 ? (i / (dadosMensais.length - 1)) * 600 : 300;
                      const y = 200 - (d.saidasVal / maxTotal) * 180;
                      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                    });
                    return path;
                  })()}
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Receita (yellow line + fill) */}
                <path
                  d={(() => {
                    let path = '';
                    dadosMensais.forEach((d, i) => {
                      const x = dadosMensais.length > 1 ? (i / (dadosMensais.length - 1)) * 600 : 300;
                      const y = 200 - (d.totalReceita / maxTotal) * 180;
                      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                    });
                    return path + ` L 600 200 L 0 200 Z`;
                  })()}
                  fill="url(#receitaGrad)"
                />
                <path
                  d={(() => {
                    let path = '';
                    dadosMensais.forEach((d, i) => {
                      const x = dadosMensais.length > 1 ? (i / (dadosMensais.length - 1)) * 600 : 300;
                      const y = 200 - (d.totalReceita / maxTotal) * 180;
                      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                    });
                    return path;
                  })()}
                  fill="none"
                  stroke="#E4B42E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points */}
                {dadosMensais.map((d, i) => {
                  const x = dadosMensais.length > 1 ? (i / (dadosMensais.length - 1)) * 600 : 300;
                  const y = 200 - (d.totalReceita / maxTotal) * 180;
                  return <circle key={i} cx={x} cy={y} r="4" fill="#E4B42E" />;
                })}
              </svg>
              <div className="flex justify-between mt-2">
                {dadosMensais.map(d => <span key={d.key} className="text-xs text-white">{MESES_ABR[d.month]} {d.year.toString().slice(-2)}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição de Receita e Balanço Consolidado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribuição de Receita */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <h2 className="text-white font-black text-sm mb-3">Distribuição de Receita por Canal</h2>
            <DonutChart />
          </div>

          {/* Balanço Consolidado */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <h2 className="text-white font-black text-sm mb-3">Balanço Consolidado ({new Date(startDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] text-amber-400 uppercase tracking-wider border-b border-zinc-700">
                  <tr>
                    <th className="py-2 pr-2 font-black">Canal</th>
                    <th className="py-2 pr-2 font-black">Contratos</th>
                    <th className="py-2 pr-2 font-black">Entradas (MT)</th>
                    <th className="py-2 pr-2 font-black">Saídas (MT)</th>
                    <th className="py-2 font-black">Líquido (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {canais.map((c, idx) => (
                    <tr key={idx} className="text-white">
                      <td className="py-1.5 pr-2 font-semibold">{c.nome}</td>
                      <td className="py-1.5 pr-2">{c.qtd}</td>
                      <td className="py-1.5 pr-2 text-amber-400 font-black">{fmt(c.valor)}</td>
                      <td className="py-1.5 pr-2 text-red-400 font-black">{fmt(idx === 0 ? 0 : totalSaidas / 3)}</td>
                      <td className="py-1.5 text-emerald-400 font-black">{fmt(c.valor - (idx === 0 ? 0 : totalSaidas / 3))}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-800/50 font-black text-amber-400 border-t border-zinc-600">
                    <td className="py-2 pr-2">Total Geral</td>
                    <td className="py-2 pr-2">{canais.reduce((s, c) => s + c.qtd, 0)}</td>
                    <td className="py-2 pr-2">{fmt(totalEntradasOp)}</td>
                    <td className="py-2 pr-2 text-red-400">{fmt(totalSaidas)}</td>
                    <td className="py-2 text-emerald-400">{fmt(valorArrecadado)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
