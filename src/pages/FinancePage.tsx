import { useState, useMemo } from 'react';
import { AdminNav } from '../components/AdminNav';
import { useFinance, CATEGORIA_LABEL, STATUS_TX_LABEL, STATUS_DIV_LABEL } from '../context/FinanceContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import type { CategoriaTransacao, TipoTransacao, StatusTransacao, Transacao, Divida } from '../types/finance';

const fmt = (n: number) => new Intl.NumberFormat('pt-PT').format(Math.round(n)) + ' MT';

type Tab = 'dashboard' | 'transacoes' | 'dividas' | 'viaturas';

const CATEGORIAS: CategoriaTransacao[] = [
  'aluguer','compra_venda','xitique','manutencao','salario','combustivel','seguro','outro'
];

// ── Formulário de transação ───────────────────────────────────────────────────
function TransacaoForm({
  initial, onSave, onCancel,
}: {
  initial?: Partial<Transacao>;
  onSave: (data: Omit<Transacao, 'id'>) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [tipo,        setTipo]        = useState<TipoTransacao>(initial?.tipo ?? 'entrada');
  const [categoria,   setCategoria]   = useState<CategoriaTransacao>(initial?.categoria ?? 'outro');
  const [descricao,   setDescricao]   = useState(initial?.descricao ?? '');
  const [valor,       setValor]       = useState(String(initial?.valor ?? ''));
  const [data,        setData]        = useState(initial?.data ?? today);
  const [status,      setStatus]      = useState<StatusTransacao>(initial?.status ?? 'pago');
  const [clienteNome, setClienteNome] = useState(initial?.clienteNome ?? '');
  const [referencia,  setReferencia]  = useState(initial?.referencia ?? '');
  const [erro,        setErro]        = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valor.replace(/\s/g, '').replace(',', '.'));
    if (!descricao.trim()) { setErro('Insira uma descrição.'); return; }
    if (!v || v <= 0)      { setErro('Valor inválido.'); return; }
    setErro('');
    onSave({ tipo, categoria, descricao: descricao.trim(), valor: v, data, status, clienteNome: clienteNome.trim() || undefined, referencia: referencia.trim() || undefined });
  };

  const field = 'w-full rounded-xl bg-zinc-950/60 border border-zinc-700 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(['entrada','saida'] as TipoTransacao[]).map(t => (
          <button key={t} type="button" onClick={() => setTipo(t)}
            className={`py-2.5 rounded-xl text-sm font-black uppercase tracking-wider border transition ${
              tipo === t
                ? t === 'entrada' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' : 'bg-red-400/10 text-red-400 border-red-400/30'
                : 'bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaTransacao)} className={field}>
            {CATEGORIAS.map(c => <option key={c} value={c} className="bg-zinc-900">{CATEGORIA_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value as StatusTransacao)} className={field}>
            <option value="pago"      className="bg-zinc-900">Pago</option>
            <option value="pendente"  className="bg-zinc-900">Pendente</option>
            <option value="cancelado" className="bg-zinc-900">Cancelado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Descrição</label>
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento aluguer Toyota Hilux" className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Valor (MT)</label>
          <input type="text" inputMode="numeric" value={valor} onChange={e => setValor(e.target.value)} placeholder="0" className={field} />
        </div>
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className={field} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Cliente (opcional)</label>
          <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" className={field} />
        </div>
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Referência</label>
          <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Nº reserva, factura..." className={field} />
        </div>
      </div>

      {erro && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition text-sm">Cancelar</button>
        <button type="submit" className="flex-1 py-3 rounded-2xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 transition">Guardar</button>
      </div>
    </form>
  );
}

// ── Formulário de dívida ──────────────────────────────────────────────────────
function DividaForm({ onSave, onCancel }: { onSave: (d: Omit<Divida, 'id'>) => void; onCancel: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [clienteNome,     setClienteNome]     = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [descricao,       setDescricao]       = useState('');
  const [valorTotal,      setValorTotal]      = useState('');
  const [dataVencimento,  setDataVencimento]  = useState('');
  const [erro,            setErro]            = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome.trim()) { setErro('Insira o nome do cliente.'); return; }
    const v = parseFloat(valorTotal.replace(/\s/g,'').replace(',','.'));
    if (!v || v <= 0) { setErro('Valor inválido.'); return; }
    setErro('');
    onSave({ clienteNome: clienteNome.trim(), clienteTelefone: clienteTelefone.trim() || undefined, descricao: descricao.trim(), valorTotal: v, valorPago: 0, dataCriacao: today, dataVencimento: dataVencimento || undefined, status: 'pendente' });
  };

  const field = 'w-full rounded-xl bg-zinc-950/60 border border-zinc-700 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Nome do Cliente</label>
          <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome completo" className={field} />
        </div>
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Telemóvel</label>
          <input type="tel" value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="+258 84..." className={field} />
        </div>
      </div>

      <div>
        <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Descrição da Dívida</label>
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Prestações em atraso — Toyota RAV4" className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Valor Total (MT)</label>
          <input type="text" inputMode="numeric" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0" className={field} />
        </div>
        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Vencimento</label>
          <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className={field} />
        </div>
      </div>

      {erro && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition text-sm">Cancelar</button>
        <button type="submit" className="flex-1 py-3 rounded-2xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 transition">Registar</button>
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function FinancePage({ onExit }: { onExit?: () => void }) {
  const {
    transacoes, dividas,
    totalEntradas, totalSaidas, lucroLiquido, totalDividasPendentes,
    addTransacao, updateTransacao, deleteTransacao,
    addDivida, registarPagamentoDivida, deleteDivida,
  } = useFinance();

  const { reservations } = useReservations();
  const { vehicles }     = useVehicles();

  const [tab,         setTab]         = useState<Tab>('dashboard');
  const [showForm,    setShowForm]    = useState<'transacao' | 'divida' | null>(null);
  const [editTx,      setEditTx]      = useState<Transacao | null>(null);
  const [pagDiv,      setPagDiv]      = useState<{ id: string; max: number } | null>(null);
  const [pagValor,    setPagValor]    = useState('');
  const [filterTipo,  setFilterTipo]  = useState<TipoTransacao | 'todos'>('todos');
  const [filterMes,   setFilterMes]   = useState('');
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [deleteTipo,  setDeleteTipo]  = useState<'tx' | 'div'>('tx');

  // ── KPIs operacionais ────────────────────────────────────────────────────
  const operKpis = useMemo(() => {
    const today     = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);
    const receitaHoje = transacoes
      .filter(t => t.tipo === 'entrada' && t.status === 'pago' && t.data === today)
      .reduce((s, t) => s + t.valor, 0);
    const receitaMes = transacoes
      .filter(t => t.tipo === 'entrada' && t.status === 'pago' && t.data.startsWith(thisMonth))
      .reduce((s, t) => s + t.valor, 0);
    const prestacoesHoje = transacoes
      .filter(t => t.categoria === 'compra_venda' && t.tipo === 'entrada' && t.status === 'pago' && t.data === today)
      .reduce((s, t) => s + t.valor, 0);
    const caucoes = reservations
      .filter(r => r.status === 'ativa')
      .reduce((s, r) => s + (r.deposito ?? 0), 0);
    return { receitaHoje, receitaMes, prestacoesHoje, caucoes };
  }, [transacoes, reservations]);

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

  // ── Filtro transações ────────────────────────────────────────────────────
  const txFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const matchTipo = filterTipo === 'todos' || t.tipo === filterTipo;
      const matchMes  = !filterMes || t.data.startsWith(filterMes);
      return matchTipo && matchMes;
    });
  }, [transacoes, filterTipo, filterMes]);

  const handleSaveTx = (data: Omit<Transacao, 'id'>) => {
    if (editTx) updateTransacao(editTx.id, data);
    else        addTransacao(data);
    setShowForm(null);
    setEditTx(null);
  };

  const handlePagarDivida = () => {
    if (!pagDiv) return;
    const v = parseFloat(pagValor.replace(/\s/g,'').replace(',','.'));
    if (!v || v <= 0) return;
    registarPagamentoDivida(pagDiv.id, v);
    setPagDiv(null);
    setPagValor('');
  };

  const meses = useMemo(() => {
    const set = new Set(transacoes.map(t => t.data.slice(0, 7)));
    return [...set].sort().reverse();
  }, [transacoes]);

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
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <AdminNav subtitle="Financeiro" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-zinc-800 flex-wrap">
          {([
            { key: 'dashboard',  label: 'Dashboard'    },
            { key: 'transacoes', label: 'Transações'   },
            { key: 'dividas',    label: `Dívidas (${dividas.filter(d=>d.status!=='quitado').length})` },
            { key: 'viaturas',   label: 'Viaturas'     },
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

        {/* ══ TAB: Dashboard ══ */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Resumo por categoria */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4">Receitas por Categoria</h3>
              {CATEGORIAS.map(cat => {
                const total = transacoes.filter(t => t.tipo === 'entrada' && t.status === 'pago' && t.categoria === cat).reduce((s,t) => s+t.valor, 0);
                if (!total) return null;
                const pct = totalEntradas > 0 ? (total / totalEntradas) * 100 : 0;
                return (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white">{CATEGORIA_LABEL[cat]}</span>
                      <span className="text-white font-bold">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalEntradas === 0 && <p className="text-white text-xs text-center py-4">Sem receitas registadas.</p>}
            </div>

            {/* Resumo por categoria — saídas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4">Despesas por Categoria</h3>
              {CATEGORIAS.map(cat => {
                const total = transacoes.filter(t => t.tipo === 'saida' && t.status === 'pago' && t.categoria === cat).reduce((s,t) => s+t.valor, 0);
                if (!total) return null;
                const pct = totalSaidas > 0 ? (total / totalSaidas) * 100 : 0;
                return (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white">{CATEGORIA_LABEL[cat]}</span>
                      <span className="text-white font-bold">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalSaidas === 0 && <p className="text-white text-xs text-center py-4">Sem despesas registadas.</p>}
            </div>

            {/* Vendas e Alugueres */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:col-span-2">
              <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4">Resumo de Viaturas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/60 rounded-xl p-4">
                  <div className="text-xs text-white uppercase font-bold mb-1">Vendas</div>
                  <div className="text-2xl font-black text-white">{viaturasVendidas.length}</div>
                  <div className="text-sm text-amber-400 font-bold mt-1">{fmt(totalVendas)}</div>
                </div>
                <div className="bg-zinc-800/60 rounded-xl p-4">
                  <div className="text-xs text-white uppercase font-bold mb-1">Alugueres</div>
                  <div className="text-2xl font-black text-white">{viaturasAlugadas.length}</div>
                  <div className="text-sm text-amber-400 font-bold mt-1">{fmt(totalAluguers)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: Transações ══ */}
        {tab === 'transacoes' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(['todos','entrada','saida'] as const).map(t => (
                  <button key={t} onClick={() => setFilterTipo(t)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                      filterTipo === t ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-zinc-800 text-white border-zinc-700 hover:text-white'
                    }`}
                  >
                    {t === 'todos' ? 'Todas' : t === 'entrada' ? '↑ Entradas' : '↓ Saídas'}
                  </button>
                ))}
                <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
                  className="text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 outline-none focus:border-amber-500">
                  <option value="">Todos os meses</option>
                  {meses.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                </select>
              </div>
              <button onClick={() => { setEditTx(null); setShowForm('transacao'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs hover:bg-amber-400 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Transação
              </button>
            </div>

            {txFiltradas.length === 0 ? (
              <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhuma transação encontrada.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {['Data','Descrição','Categoria','Tipo','Valor','Estado',''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txFiltradas.map(t => {
                        const st = STATUS_TX_LABEL[t.status];
                        return (
                          <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                            <td className="px-4 py-3 text-xs text-white whitespace-nowrap">
                              {new Date(t.data).toLocaleDateString('pt-PT')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-white font-medium">{t.descricao}</div>
                              {t.clienteNome && <div className="text-xs text-white">{t.clienteNome}</div>}
                            </td>
                            <td className="px-4 py-3 text-xs text-white hidden sm:table-cell whitespace-nowrap">
                              {CATEGORIA_LABEL[t.categoria]}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-black whitespace-nowrap">
                              <span className={t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}>
                                {t.tipo === 'entrada' ? '+' : '-'}{fmt(t.valor)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => { setEditTx(t); setShowForm('transacao'); }}
                                  className="p-1.5 text-white hover:text-amber-400 transition rounded-lg hover:bg-zinc-700">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button onClick={() => { setDeleteId(t.id); setDeleteTipo('tx'); }}
                                  className="p-1.5 text-white hover:text-red-400 transition rounded-lg hover:bg-zinc-700">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                </button>
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
          </div>
        )}

        {/* ══ TAB: Dívidas ══ */}
        {tab === 'dividas' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowForm('divida')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs hover:bg-amber-400 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Registar Dívida
              </button>
            </div>

            {dividas.length === 0 ? (
              <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhuma dívida registada.
              </div>
            ) : (
              <div className="space-y-3">
                {dividas.map(d => {
                  const st     = STATUS_DIV_LABEL[d.status];
                  const restante = d.valorTotal - d.valorPago;
                  const pct    = d.valorTotal > 0 ? (d.valorPago / d.valorTotal) * 100 : 0;
                  const vencido = d.dataVencimento && new Date(d.dataVencimento) < new Date() && d.status !== 'quitado';
                  return (
                    <div key={d.id} className={`bg-zinc-900 border rounded-2xl p-4 space-y-3 ${vencido ? 'border-red-400/30' : 'border-zinc-800'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white">{d.clienteNome}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                            {vencido && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">Vencido</span>}
                          </div>
                          <div className="text-xs text-white mt-0.5">{d.descricao}</div>
                          {d.clienteTelefone && <div className="text-xs text-white mt-0.5">{d.clienteTelefone}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-red-400">{fmt(restante)}</div>
                          <div className="text-[10px] text-white">de {fmt(d.valorTotal)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-white mb-1">
                          <span>Pago: {fmt(d.valorPago)}</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {d.dataVencimento && (
                        <div className="text-[10px] text-white">
                          Vencimento: {new Date(d.dataVencimento).toLocaleDateString('pt-PT')}
                        </div>
                      )}

                      {d.status !== 'quitado' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setPagDiv({ id: d.id, max: restante }); setPagValor(''); }}
                            className="flex-1 text-xs font-bold py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/20 hover:bg-amber-500/20 transition">
                            Registar Pagamento
                          </button>
                          <button onClick={() => { setDeleteId(d.id); setDeleteTipo('div'); }}
                            className="p-2 text-white hover:text-red-400 transition rounded-xl hover:bg-red-400/10">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Receita Hoje',              value: fmt(operKpis.receitaHoje),      color: 'text-emerald-400', dot: 'bg-emerald-400' },
            { label: 'Receita do Mês',            value: fmt(operKpis.receitaMes),       color: 'text-amber-400',   dot: 'bg-amber-400' },
            { label: 'Prestações Recebidas Hoje', value: fmt(operKpis.prestacoesHoje),   color: 'text-blue-400',    dot: 'bg-blue-400' },
            { label: 'Valor em Dívida',           value: fmt(totalDividasPendentes),     color: 'text-red-400',     dot: 'bg-red-400' },
            { label: 'Cauções Ativas',            value: fmt(operKpis.caucoes),          color: 'text-orange-400',  dot: 'bg-orange-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                <span className="text-xs text-white uppercase font-bold tracking-wide leading-tight">{k.label}</span>
              </div>
              <div className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Formulário transação/dívida ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { setShowForm(null); setEditTx(null); }} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Archivo', sans-serif" }}>
            <div className="px-6 pt-6 pb-2 border-b border-zinc-800">
              <h2 className="text-white font-black text-lg">
                {showForm === 'transacao' ? (editTx ? 'Editar Transação' : 'Nova Transação') : 'Registar Dívida'}
              </h2>
            </div>
            <div className="px-6 py-5">
              {showForm === 'transacao'
                ? <TransacaoForm initial={editTx ?? undefined} onSave={handleSaveTx} onCancel={() => { setShowForm(null); setEditTx(null); }} />
                : <DividaForm onSave={d => { addDivida(d); setShowForm(null); }} onCancel={() => setShowForm(null)} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Registar pagamento de dívida ── */}
      {pagDiv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPagDiv(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4" style={{ fontFamily: "'Archivo', sans-serif" }}>
            <h2 className="text-white font-black text-lg">Registar Pagamento</h2>
            <p className="text-white text-sm">Valor máximo: <strong className="text-white">{fmt(pagDiv.max)}</strong></p>
            <input
              type="text" inputMode="numeric"
              value={pagValor} onChange={e => setPagValor(e.target.value)}
              placeholder="Valor pago (MT)"
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 text-sm text-white outline-none focus:border-amber-500 transition"
            />
            <div className="flex gap-3">
              <button onClick={() => setPagDiv(null)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition text-sm">Cancelar</button>
              <button onClick={handlePagarDivida} className="flex-1 py-3 rounded-2xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 transition">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmação de eliminação ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="text-2xl">🗑️</div>
            <h3 className="text-white font-black text-lg">Eliminar registo?</h3>
            <p className="text-white text-sm">Esta acção é irreversível.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition">Cancelar</button>
              <button onClick={() => {
                if (deleteTipo === 'tx') deleteTransacao(deleteId);
                else deleteDivida(deleteId);
                setDeleteId(null);
              }} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-400 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
