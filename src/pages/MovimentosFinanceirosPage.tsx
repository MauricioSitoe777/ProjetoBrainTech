import { useState, useMemo } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useFinance, CATEGORIA_LABEL, STATUS_TX_LABEL } from '../context/FinanceContext';
import { VEHICLES as VEHICLES_STATIC } from '../data/constants';
import { TransacaoModal } from '../components/finance/TransacaoModal';
import type { Transacao, TipoTransacao, CategoriaTransacao } from '../types/finance';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
const compraIds = new Set(VEHICLES_STATIC.filter(v => v.mode === 'compra').map(v => v.id));
const MOV_POR_PAGINA = 6;

export function MovimentosFinanceirosPage() {
  const { reservations } = useReservations();
  const { transacoes, addTransacao, updateTransacao, deleteTransacao } = useFinance();

  const [movModal, setMovModal] = useState<{ tipo: TipoTransacao; transacao?: Transacao } | null>(null);
  const [movConfirmDelete, setMovConfirmDelete] = useState<string | null>(null);
  const [movPeriodo, setMovPeriodo]   = useState<'mes' | 'mes_passado' | 'ano' | 'tudo'>('mes');
  const [movTipo, setMovTipo]         = useState<'todos' | TipoTransacao>('todos');
  const [movCategoria, setMovCategoria] = useState<'todas' | CategoriaTransacao>('todas');
  const [movBusca, setMovBusca]       = useState('');
  const [movPagina, setMovPagina]     = useState(1);

  const resActivas = useMemo(() => reservations.filter(r => r.status !== 'cancelada'), [reservations]);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
  const fimMesPassado    = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
  const inicioAno = `${hoje.getFullYear()}-01-01`;

  const transacoesMes = useMemo(() => transacoes.filter(t => t.data >= inicioMes), [transacoes, inicioMes]);
  const entradasMes = useMemo(() => transacoesMes.filter(t => t.tipo === 'entrada' && t.status === 'pago').reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const saidasMes   = useMemo(() => transacoesMes.filter(t => t.tipo === 'saida'   && t.status === 'pago').reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const saldoMes    = entradasMes - saidasMes;

  const movFiltradas = useMemo(() => {
    let list = [...transacoes];
    if (movPeriodo === 'mes')         list = list.filter(t => t.data >= inicioMes);
    if (movPeriodo === 'mes_passado') list = list.filter(t => t.data >= inicioMesPassado && t.data <= fimMesPassado);
    if (movPeriodo === 'ano')         list = list.filter(t => t.data >= inicioAno);
    if (movTipo !== 'todos')          list = list.filter(t => t.tipo === movTipo);
    if (movCategoria !== 'todas')     list = list.filter(t => t.categoria === movCategoria);
    if (movBusca.trim())              list = list.filter(t => t.descricao.toLowerCase().includes(movBusca.trim().toLowerCase()));
    return list.sort((a, b) => b.data.localeCompare(a.data));
  }, [transacoes, movPeriodo, movTipo, movCategoria, movBusca, inicioMes, inicioMesPassado, fimMesPassado, inicioAno]);

  const movTotalPaginas = Math.max(1, Math.ceil(movFiltradas.length / MOV_POR_PAGINA));
  const movPaginaAtual  = Math.min(movPagina, movTotalPaginas);
  const movPageItems    = movFiltradas.slice((movPaginaAtual - 1) * MOV_POR_PAGINA, movPaginaAtual * MOV_POR_PAGINA);

  // Entradas vs Saídas — últimos 14 dias
  const movSerieDiaria = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(hoje); d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });
    return dias.map(dia => ({
      dia,
      entradas: transacoes.filter(t => t.data === dia && t.tipo === 'entrada' && t.status === 'pago').reduce((s, t) => s + t.valor, 0),
      saidas:   transacoes.filter(t => t.data === dia && t.tipo === 'saida'   && t.status === 'pago').reduce((s, t) => s + t.valor, 0),
    }));
  }, [transacoes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Receitas por categoria (este mês)
  const movPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const t of transacoesMes) {
      if (t.tipo !== 'entrada' || t.status !== 'pago') continue;
      mapa[t.categoria] = (mapa[t.categoria] ?? 0) + t.valor;
    }
    const cores: Record<string, string> = {
      aluguer: '#E4B42E', compra_venda: '#34D399', xitique: '#60A5FA', outro: '#A78BFA',
      manutencao: '#F87171', salario: '#F87171', combustivel: '#F87171', seguro: '#F87171',
    };
    return Object.entries(mapa)
      .map(([cat, valor]) => ({ cat, label: CATEGORIA_LABEL[cat as CategoriaTransacao] ?? cat, valor, cor: cores[cat] ?? '#E4B42E' }))
      .sort((a, b) => b.valor - a.valor);
  }, [transacoesMes]);
  const movCategoriaTotal = movPorCategoria.reduce((s, c) => s + c.valor, 0);

  // Alertas
  const movAlertas = useMemo(() => {
    const list: { texto: string; sub: string; tag: string; tagColor: string }[] = [];
    if (saidasMes > entradasMes && entradasMes > 0) {
      list.push({ texto: 'Despesas superiores às receitas este mês', sub: 'Reveja os gastos operacionais.', tag: 'Atenção', tagColor: 'bg-red-500/15 text-red-400 border-red-500/25' });
    }
    const compraAtrasoRes = resActivas.filter(r => compraIds.has(r.vehicleId) && r.status === 'prestacao_atraso');
    if (compraAtrasoRes.length > 0) {
      const valorRisco = compraAtrasoRes.reduce((s, r) => s + r.valorTotal, 0);
      list.push({
        texto: `${compraAtrasoRes.length} cliente${compraAtrasoRes.length > 1 ? 's' : ''} com pagamentos em atraso`,
        sub: `Valor em risco: ${fmt(valorRisco)}`,
        tag: 'Aviso', tagColor: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      });
    }
    return list;
  }, [saidasMes, entradasMes, resActivas]);

  // Resumo do mês
  const movResumo = useMemo(() => {
    const entradasPagas = transacoesMes.filter(t => t.tipo === 'entrada' && t.status === 'pago');
    const saidasPagas   = transacoesMes.filter(t => t.tipo === 'saida'   && t.status === 'pago');
    const maiorReceita = entradasPagas.reduce((max, t) => (!max || t.valor > max.valor) ? t : max, null as Transacao | null);
    const maiorDespesa = saidasPagas.reduce((max, t) => (!max || t.valor > max.valor) ? t : max, null as Transacao | null);
    const diasNoMes = hoje.getDate();
    return {
      maiorReceita, maiorDespesa,
      mediaEntradasDia: entradasMes / diasNoMes,
      mediaSaidasDia:   saidasMes / diasNoMes,
      numTransacoes: transacoesMes.length,
    };
  }, [transacoesMes, entradasMes, saidasMes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveMov = (data: Omit<Transacao, 'id'>) => {
    if (movModal?.transacao) updateTransacao(movModal.transacao.id, data);
    else addTransacao(data);
    setMovModal(null);
  };

  return (
    <div className="bg-zinc-950 text-white">
      <div className="w-full px-5 sm:px-8 py-8 space-y-5">

        <div>
          <h1 className="text-2xl font-black text-white">Movimentos Financeiros</h1>
          <p className="text-sm text-white mt-1">Controle todas as entradas e saídas da empresa</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-white mb-2">Entradas do Mês</p>
            <p className="text-xl font-black text-emerald-400 leading-tight">{fmt(entradasMes)}</p>
            <p className="text-[11px] text-white mt-0.5">Total de receitas</p>
          </div>
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-white mb-2">Saídas do Mês</p>
            <p className="text-xl font-black text-red-400 leading-tight">{fmt(saidasMes)}</p>
            <p className="text-[11px] text-white mt-0.5">Total de despesas</p>
          </div>
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-white mb-2">Saldo Actual</p>
            <p className={`text-xl font-black leading-tight ${saldoMes >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(saldoMes)}</p>
            <p className="text-[11px] text-white mt-0.5">Entradas - Saídas</p>
          </div>
        </div>

        {/* Acções rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-black text-sm">Registar Nova Receita</p>
              <p className="text-xs text-white mt-0.5">Regista aqui todas as entradas de dinheiro.</p>
            </div>
            <button onClick={() => setMovModal({ tipo: 'entrada' })}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors whitespace-nowrap">
              + Nova Receita
            </button>
          </div>
          <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-black text-sm">Registar Nova Despesa</p>
              <p className="text-xs text-white mt-0.5">Regista aqui todas as saídas de dinheiro.</p>
            </div>
            <button onClick={() => setMovModal({ tipo: 'saida' })}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-zinc-950 bg-red-500 hover:bg-red-400 transition-colors whitespace-nowrap">
              + Nova Despesa
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Período</label>
            <select value={movPeriodo} onChange={e => { setMovPeriodo(e.target.value as typeof movPeriodo); setMovPagina(1); }}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
              <option value="mes">Este Mês</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="ano">Este Ano</option>
              <option value="tudo">Tudo</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Tipo</label>
            <select value={movTipo} onChange={e => { setMovTipo(e.target.value as typeof movTipo); setMovPagina(1); }}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
              <option value="todos">Todos</option>
              <option value="entrada">Receita</option>
              <option value="saida">Despesa</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Categoria</label>
            <select value={movCategoria} onChange={e => { setMovCategoria(e.target.value as typeof movCategoria); setMovPagina(1); }}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
              <option value="todas">Todas</option>
              {(Object.entries(CATEGORIA_LABEL) as [CategoriaTransacao, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Pesquisar</label>
            <input value={movBusca} onChange={e => { setMovBusca(e.target.value); setMovPagina(1); }} placeholder="Descrição..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 placeholder:text-white/40" />
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
            <h2 className="text-white font-black text-sm uppercase tracking-wider">Histórico Financeiro</h2>
            <span className="text-[10px] text-white">{movFiltradas.length} registo{movFiltradas.length !== 1 ? 's' : ''}</span>
          </div>
          {movFiltradas.length === 0 ? (
            <p className="text-center text-white text-sm py-12">Sem transações para os filtros seleccionados.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                      {['Data','Tipo','Categoria','Descrição','Valor','Estado',''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {movPageItems.map(t => {
                      const st = STATUS_TX_LABEL[t.status];
                      return (
                        <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3 text-xs text-white whitespace-nowrap">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.tipo === 'entrada'
                                ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                            }`}>{t.tipo === 'entrada' ? 'Receita' : 'Despesa'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white whitespace-nowrap">{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</td>
                          <td className="px-4 py-3 text-sm text-white font-medium truncate max-w-[220px]">
                            {t.descricao}
                            {t.clienteNome && <span className="block text-[11px] text-white/70">{t.clienteNome}</span>}
                          </td>
                          <td className={`px-4 py-3 text-sm font-black whitespace-nowrap ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.tipo === 'entrada' ? '+' : '-'}{fmt(t.valor)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setMovModal({ tipo: t.tipo, transacao: t })}
                                className="text-white hover:text-amber-400 transition-colors" title="Editar">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                </svg>
                              </button>
                              <button onClick={() => setMovConfirmDelete(t.id)}
                                className="text-white hover:text-red-400 transition-colors" title="Eliminar">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {movTotalPaginas > 1 && (
                <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-white">
                    A mostrar {(movPaginaAtual - 1) * MOV_POR_PAGINA + 1}–{Math.min(movPaginaAtual * MOV_POR_PAGINA, movFiltradas.length)} de {movFiltradas.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button disabled={movPaginaAtual <= 1} onClick={() => setMovPagina(p => p - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">‹</button>
                    {Array.from({ length: movTotalPaginas }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setMovPagina(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          p === movPaginaAtual ? 'bg-amber-500 text-zinc-950' : 'text-white hover:bg-zinc-800'
                        }`}>{p}</button>
                    ))}
                    <button disabled={movPaginaAtual >= movTotalPaginas} onClick={() => setMovPagina(p => p + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Entradas vs Saídas */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Entradas vs Saídas <span className="text-white font-normal normal-case">(últimos 14 dias)</span></h2>
            {(() => {
              const SVG_W = 480, SVG_H = 140, PAD = 10;
              const maxVal = Math.max(1, ...movSerieDiaria.map(d => Math.max(d.entradas, d.saidas)));
              const dataH = SVG_H - PAD * 2;
              const toPts = (key: 'entradas' | 'saidas') => movSerieDiaria.map((d, i) => [
                (i / (movSerieDiaria.length - 1)) * SVG_W,
                PAD + dataH - (d[key] / maxVal) * dataH,
              ] as [number, number]);
              const toPath = (pts: [number, number][]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
              const ptsEntradas = toPts('entradas'), ptsSaidas = toPts('saidas');
              return (
                <>
                  <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }} preserveAspectRatio="none">
                    {[0.25, 0.5, 0.75, 1].map(f => (
                      <line key={f} x1="0" y1={PAD + dataH * (1 - f)} x2={SVG_W} y2={PAD + dataH * (1 - f)} stroke="#27272a" strokeWidth="1" />
                    ))}
                    <path d={toPath(ptsEntradas)} fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={toPath(ptsSaidas)}   fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded-full" /><span className="text-[11px] text-white">Entradas</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 rounded-full" /><span className="text-[11px] text-white">Saídas</span></div>
                  </div>
                </>
              );
            })()}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800/60">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Total Entradas</p>
                <p className="text-sm font-black text-emerald-400">{fmt(entradasMes)}</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Total Saídas</p>
                <p className="text-sm font-black text-red-400">{fmt(saidasMes)}</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Saldo</p>
                <p className={`text-sm font-black ${saldoMes >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(saldoMes)}</p>
              </div>
            </div>
          </div>

          {/* Receitas por Categoria */}
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Receitas por Categoria <span className="text-white font-normal normal-case">(Este Mês)</span></h2>
            {movPorCategoria.length === 0 ? (
              <p className="text-center text-white text-sm py-10">Sem receitas registadas este mês.</p>
            ) : (
              <div className="flex items-center gap-6">
                {(() => {
                  const R = 40, C = 2 * Math.PI * R;
                  let acc = 0;
                  return (
                    <svg viewBox="0 0 100 100" width="140" height="140" className="shrink-0 -rotate-90">
                      {movPorCategoria.map(c => {
                        const frac = movCategoriaTotal > 0 ? c.valor / movCategoriaTotal : 0;
                        const dash = frac * C;
                        const offset = -acc;
                        acc += dash;
                        return (
                          <circle key={c.cat} cx="50" cy="50" r={R} fill="none" stroke={c.cor} strokeWidth="14"
                            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={offset} />
                        );
                      })}
                    </svg>
                  );
                })()}
                <div className="flex-1 min-w-0 space-y-2">
                  {movPorCategoria.map(c => (
                    <div key={c.cat} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.cor }} />
                        <span className="text-sm text-white truncate">{c.label}</span>
                      </div>
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        {fmt(c.valor)} <span className="text-white/70">({movCategoriaTotal > 0 ? Math.round((c.valor / movCategoriaTotal) * 100 * 10) / 10 : 0}%)</span>
                      </span>
                    </div>
                  ))}
                  <p className="text-xs font-black text-amber-400 pt-2 border-t border-zinc-800/60">Total: {fmt(movCategoriaTotal)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alertas + Resumo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-white font-black text-sm uppercase tracking-wider mb-3">Alertas Importantes</h2>
            {movAlertas.length === 0 ? (
              <p className="text-white text-sm py-2">Sem alertas de momento.</p>
            ) : (
              <div className="space-y-3">
                {movAlertas.map((a, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 bg-zinc-800/40 rounded-xl p-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-amber-400 mt-0.5 shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">{a.texto}</p>
                        <p className="text-xs text-white mt-0.5">{a.sub}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${a.tagColor}`}>{a.tag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-white font-black text-sm uppercase tracking-wider mb-3">Resumo do Mês</h2>
            <div className="divide-y divide-zinc-800/50">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-white">Maior Receita</span>
                <span className="text-sm font-black text-emerald-400 text-right">
                  {movResumo.maiorReceita ? `${movResumo.maiorReceita.descricao} — ${fmt(movResumo.maiorReceita.valor)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-white">Maior Despesa</span>
                <span className="text-sm font-black text-red-400 text-right">
                  {movResumo.maiorDespesa ? `${movResumo.maiorDespesa.descricao} — ${fmt(movResumo.maiorDespesa.valor)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-white">Média de Entradas por Dia</span>
                <span className="text-sm font-black text-emerald-400">{fmt(movResumo.mediaEntradasDia)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-white">Média de Saídas por Dia</span>
                <span className="text-sm font-black text-red-400">{fmt(movResumo.mediaSaidasDia)}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-sm text-white">Número de Transacções</span>
                <span className="text-sm font-black text-amber-400">{movResumo.numTransacoes}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {movModal && (
        <TransacaoModal
          tipo={movModal.tipo}
          transacao={movModal.transacao}
          onSave={handleSaveMov}
          onClose={() => setMovModal(null)}
        />
      )}

      {movConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm" onClick={() => setMovConfirmDelete(null)}>
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-black text-base mb-1">Eliminar transacção?</h2>
            <p className="text-sm text-white mb-5">Esta acção não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setMovConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-black text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => { deleteTransacao(movConfirmDelete); setMovConfirmDelete(null); }}
                className="flex-1 py-2.5 text-sm font-black text-zinc-950 bg-red-500 hover:bg-red-400 rounded-xl transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
