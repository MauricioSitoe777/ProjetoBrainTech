import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../context/UsersContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useFinance, CATEGORIA_LABEL } from '../context/FinanceContext';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';

const compraIds  = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));

const fmt  = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
const fmtK = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M MT' : n >= 1_000 ? (n / 1_000).toFixed(0) + 'k MT' : fmt(n);
const parsePrice = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0;

// ── Ícones ────────────────────────────────────────────────────────────────────
const IconReceive = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v8m-3-3 3 3 3-3"/>
  </svg>
);
const IconBank = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/>
    <line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 21 8 3 8"/>
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconCar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h14M5 17a2 2 0 1 1-4 0M5 17V9l2-5h10l2 5v8M19 17a2 2 0 1 0 4 0"/>
  </svg>
);
const IconCart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconWrench = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconTrend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconPie = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Cartão de KPI padrão ──────────────────────────────────────────────────────
function KpiCard({ icon, iconBg, iconColor, label, value, valueColor, sub, subColor, onClick }: {
  icon: ReactNode; iconBg: string; iconColor: string;
  label: string; value: string | number; valueColor?: string;
  sub?: string; subColor?: string; onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`text-left w-full bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-3 ${
        onClick ? 'hover:border-amber-500/40 transition-colors cursor-pointer group' : ''
      }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-xs font-bold text-amber-400 flex-1 min-w-0 leading-tight">{label}</p>
        {onClick && <span className="text-white/20 group-hover:text-amber-400 transition-colors shrink-0"><ArrowRight /></span>}
      </div>
      <div>
        <p className={`text-xl font-black leading-tight tabular-nums truncate ${valueColor ?? 'text-white'}`}>{value}</p>
        {sub && <p className={`text-[11px] mt-0.5 ${subColor ?? 'text-white'}`}>{sub}</p>}
      </div>
    </Tag>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-1 h-4 bg-amber-500 rounded-full" />
      <h2 className="text-sm font-black text-white uppercase tracking-widest">{children}</h2>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user: authUser } = useAuth();
  const { users }        = useUsers();
  const { reservations } = useReservations();
  const { vehicles }     = useVehicles();
  const { transacoes, lucroLiquido } = useFinance();
  const { navigate }     = useRoute();

  const today = new Date();
  const dataFormatada = today.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  const s = useMemo(() => {
    const aluguerRes = reservations.filter(r => !compraIds.has(r.vehicleId) && r.status !== 'cancelada');
    const compraRes  = reservations.filter(r =>  compraIds.has(r.vehicleId) && r.status !== 'cancelada');

    const receitaAluguer = aluguerRes.reduce((sum, r) => sum + r.valorTotal, 0);
    const receitaCompra  = compraRes.reduce((sum, r) => sum + r.valorTotal, 0);
    const receitaTotal   = receitaAluguer + receitaCompra;

    // Mesma fonte de verdade dos Movimentos Financeiros — nunca deriva de reservas.
    const dinheiroPorReceber = transacoes
      .filter(t => t.tipo === 'entrada' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.valor, 0);

    const vendasLiquidadas = compraRes.filter(r => r.status === 'liquidada');
    const valorMedioVenda  = vendasLiquidadas.length > 0 ? receitaCompra / vendasLiquidadas.length : 0;

    const mesAtual = today.getMonth(), anoAtual = today.getFullYear();
    const isNesteMes = (iso: string) => { const d = new Date(iso); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual; };
    const vendasMes    = compraRes.filter(r => isNesteMes(r.dataInicio));
    const vendasMesVal = vendasMes.reduce((sum, r) => sum + r.valorTotal, 0);

    const mesPassado = new Date(anoAtual, mesAtual - 1, 1);
    const isMesPassado = (iso: string) => { const d = new Date(iso); return d.getMonth() === mesPassado.getMonth() && d.getFullYear() === mesPassado.getFullYear(); };
    const receitaMesAtual   = reservations.filter(r => r.status !== 'cancelada' && isNesteMes(r.dataInicio)).reduce((sum, r) => sum + r.valorTotal, 0);
    const receitaMesPassado = reservations.filter(r => r.status !== 'cancelada' && isMesPassado(r.dataInicio)).reduce((sum, r) => sum + r.valorTotal, 0);
    const crescimentoMes = receitaMesPassado > 0 ? Math.round(((receitaMesAtual - receitaMesPassado) / receitaMesPassado) * 100) : null;

    const clientesRegistados = users.filter(u => u.role === 'cliente').length;
    const clientesNovosMes   = users.filter(u => u.role === 'cliente' && u.dataCriacao && isNesteMes(u.dataCriacao)).length;

    const disponiveis  = vehicles.filter(v => v.mode === 'aluguer' && v.available !== false).length;
    const alugados     = aluguerRes.filter(r => r.status === 'ativa').length;
    const vendidos     = vendasLiquidadas.length;
    const manutencao   = vehicles.filter(v => v.available === false).length;

    const compraFrotaVehicles     = vehicles.filter(v => v.mode === 'compra');
    const patrimonioEmpresa       = compraFrotaVehicles.reduce((sum, v) => sum + parsePrice(v.price), 0);
    const valorDisponivel         = compraFrotaVehicles.filter(v => v.available !== false).reduce((sum, v) => sum + parsePrice(v.price), 0);

    const reservasPendentes  = reservations.filter(r => r.status === 'pendente').length;
    const pagamentosAtraso   = reservations.filter(r => r.status === 'prestacao_atraso').length;
    const contratosActivos   = reservations.filter(r => !['cancelada', 'concluida', 'liquidada'].includes(r.status)).length;
    const aluguerAtivos      = aluguerRes.filter(r => r.status === 'ativa').length;

    return {
      receitaTotal, lucroLiquido, dinheiroPorReceber,
      clientesRegistados, clientesNovosMes,
      disponiveis, alugados, vendidos, manutencao, totalVeiculos: vehicles.length,
      vendasMesQty: vendasMes.length, vendasMesVal,
      patrimonioEmpresa, valorDisponivel, valorMedioVenda,
      reservasPendentes, pagamentosAtraso, contratosActivos, aluguerAtivos,
      crescimentoMes,
    };
  }, [reservations, vehicles, users, transacoes, lucroLiquido, today]);

  const atividadeRecente = useMemo(() =>
    [...transacoes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6),
  [transacoes]);

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="text-sm text-white mt-0.5">Bem-vindo de volta, {authUser?.nome ?? 'Admin'}!</p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/20 rounded-xl px-4 py-2">
            <span className="text-amber-400"><IconCalendar /></span>
            <span className="text-sm font-bold text-white capitalize">{dataFormatada}</span>
          </div>
        </div>

        {/* ── Resumo Financeiro ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionTitle>Resumo Financeiro</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard icon={<IconReceive />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Dinheiro por Receber" value={fmt(s.dinheiroPorReceber)}
              sub="Receitas registadas por cobrar" subColor="text-white"
              onClick={() => navigate('/admin/financeiro')} />
            <KpiCard icon={<IconBank />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Património da Empresa" value={fmtK(s.patrimonioEmpresa)}
              sub="Valor total da empresa" subColor="text-white"
              onClick={() => navigate('/admin/veiculos')} />
            <KpiCard icon={<IconChart />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Lucro Total" value={fmt(s.lucroLiquido)} valueColor="text-emerald-400"
              sub="Ganhos acumulados até hoje" subColor="text-white"
              onClick={() => navigate('/admin/financeiro')} />
          </div>
        </div>

        {/* ── Actividade ───────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionTitle>Actividade</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={<IconUsers />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Clientes Registados" value={s.clientesRegistados}
              sub={`Novos este mês: ${s.clientesNovosMes}`} subColor="text-amber-400"
              onClick={() => navigate('/admin/utilizadores')} />

            <button type="button" onClick={() => navigate('/admin/veiculos')}
              className="text-left w-full bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2 hover:border-amber-500/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400"><IconCar /></div>
                <p className="text-xs font-bold text-amber-400 flex-1 min-w-0 truncate">Veículos Registados</p>
                <span className="text-white/20 group-hover:text-amber-400 transition-colors shrink-0"><ArrowRight /></span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xl font-black leading-tight tabular-nums text-white">{s.totalVeiculos}</p>
                <div className="space-y-0.5 text-right">
                  {[
                    { label: 'Disponíveis', value: s.disponiveis, dot: 'bg-emerald-400' },
                    { label: 'Alugados',    value: s.alugados,    dot: 'bg-amber-400' },
                    { label: 'Vendidos',    value: s.vendidos,    dot: 'bg-blue-400' },
                    { label: 'Manutenção',  value: s.manutencao,  dot: 'bg-red-400' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-end gap-1.5 text-[10px]">
                      <span className="text-white">{row.label}:</span>
                      <span className="font-black text-white tabular-nums w-4 text-right">{row.value}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                    </div>
                  ))}
                </div>
              </div>
            </button>

            <KpiCard icon={<IconCart />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Vendas do Mês" value={`${s.vendasMesQty} veículos`}
              sub={`Valor: ${fmt(s.vendasMesVal)}`} subColor="text-amber-400"
              onClick={() => navigate('/admin/compra')} />
            <KpiCard icon={<IconDollar />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Receita Total" value={fmt(s.receitaTotal)} valueColor="text-amber-400"
              sub="Total recebido pela empresa" subColor="text-white"
              onClick={() => navigate('/admin/financas')} />
          </div>
        </div>

        {/* ── Indicadores Principais ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionTitle>Indicadores Principais</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={<IconClock />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Alugueres Activos" value={s.aluguerAtivos}
              sub="Em curso neste momento" subColor="text-white"
              onClick={() => navigate('/admin/aluguer')} />
            <KpiCard icon={<IconCalendar />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Reservas Pendentes" value={s.reservasPendentes}
              sub="À espera de confirmação" subColor="text-white"
              onClick={() => navigate('/admin/aluguer?tab=acoes')} />
            <KpiCard icon={<IconWrench />} iconBg="bg-red-500/15" iconColor="text-red-400"
              label="Veículos em Manutenção" value={s.manutencao} valueColor={s.manutencao > 0 ? 'text-red-400' : 'text-white'}
              sub="Indisponíveis" subColor="text-white"
              onClick={() => navigate('/admin/veiculos')} />
            <KpiCard icon={<IconAlert />} iconBg="bg-red-500/15" iconColor="text-red-400"
              label="Pagamentos em Atraso" value={s.pagamentosAtraso} valueColor={s.pagamentosAtraso > 0 ? 'text-red-400' : 'text-white'}
              sub="Clientes com prestações em atraso" subColor="text-white"
              onClick={() => navigate('/admin/compra?tab=acoes')} />

            <KpiCard icon={<IconDoc />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Contratos Activos" value={s.contratosActivos}
              sub="Aluguer + Venda" subColor="text-white"
              onClick={() => navigate('/admin/financas?tab=aluguer')} />
            <KpiCard icon={<IconTrend />} iconBg="bg-emerald-500/15" iconColor="text-emerald-400"
              label="Crescimento do Mês" value={s.crescimentoMes !== null ? `${s.crescimentoMes >= 0 ? '+' : ''}${s.crescimentoMes}%` : '—'}
              valueColor={s.crescimentoMes === null ? 'text-white' : s.crescimentoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}
              sub="Comparado com o mês anterior" subColor="text-white" />
            <KpiCard icon={<IconTag />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Valor Médio por Venda" value={fmt(s.valorMedioVenda)}
              sub="Média recebida por cada venda" subColor="text-white"
              onClick={() => navigate('/admin/compra')} />
            <KpiCard icon={<IconPie />} iconBg="bg-amber-500/15" iconColor="text-amber-400"
              label="Valor dos Veículos Disponíveis" value={fmtK(s.valorDisponivel)}
              sub="Valor dos veículos disponíveis" subColor="text-white"
              onClick={() => navigate('/admin/veiculos')} />
          </div>
        </div>

        {/* ── Actividade Recente ───────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/70">
            <SectionTitle>Actividade Recente</SectionTitle>
            <button onClick={() => navigate('/admin/financeiro')}
              className="flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors">
              Ver tudo <ArrowRight />
            </button>
          </div>
          {atividadeRecente.length === 0 ? (
            <p className="text-center text-white text-sm py-10">Sem actividade recente registada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                    {['Descrição', 'Tipo', 'Referência', 'Data', 'Valor'].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {atividadeRecente.map(t => (
                    <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-bold text-white">{t.descricao}</p>
                        <p className="text-[11px] text-white">{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.tipo === 'entrada'
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                            : 'bg-red-400/10 text-red-400 border-red-400/20'
                        }`}>{t.tipo === 'entrada' ? 'Receita' : 'Despesa'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white whitespace-nowrap">{t.id}</td>
                      <td className="px-5 py-3.5 text-xs text-white whitespace-nowrap">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                      <td className={`px-5 py-3.5 text-sm font-black whitespace-nowrap ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
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
    </div>
  );
}
