import { useMemo, useState, useEffect } from 'react';
import { useUsers } from '../context/UsersContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useGuests } from '../context/GuestsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';

const EM_USO_STATUSES = new Set(['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente']);

const compraIds  = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));
const aluguerIds = new Set(VEHICLES.filter(v => v.mode === 'aluguer').map(v => v.id));

type AlertTab = 'todos' | 'alugueres' | 'em_uso' | 'veiculos' | 'xitique' | 'utilizadores';
type EmUsoFilter = 'todos' | 'em_uso' | 'em_atraso' | 'confirmadas' | 'devolucao';

// ── Helpers ───────────────────────────────────────────────────────────────────
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function Dot({ color = 'bg-amber-500' }: { color?: string }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${color}`} />;
}

function Metric({ label, value, sub, onClick }: {
  label: string; value: string | number; sub?: string; onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`text-left w-full ${onClick ? 'group cursor-pointer' : ''}`}>
      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-2xl font-black text-white leading-none tabular-nums">{value}</p>
        {onClick && (
          <span className="text-white/30 group-hover:text-amber-400 transition-colors mt-0.5"><ArrowRight /></span>
        )}
      </div>
      {sub && <p className="text-[11px] text-white mt-0.5 leading-tight">{sub}</p>}
    </Tag>
  );
}

function AlertRow({ dot, label, sub }: { dot: string; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <Dot color={dot} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-white leading-snug">{label}</p>
        <p className="text-xs text-white leading-tight mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function BtnPrimary({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 py-2.5 text-sm font-black text-zinc-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors">
      {label}
    </button>
  );
}

function BtnGhost({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 py-2.5 text-sm font-black text-amber-400 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors border border-amber-500/30">
      {label}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { users }        = useUsers();
  const { motoristas }   = useMotoristas();
  const { guests }       = useGuests();
  const { reservations } = useReservations();
  const { vehicles }     = useVehicles();
  const { grupos, inscricoes } = useXitique();
  const { navigate }     = useRoute();

  const today = new Date().toISOString().split('T')[0];
  const [alertTab, setAlertTab] = useState<AlertTab>('todos');
  const [emUsoFilter, setEmUsoFilter] = useState<EmUsoFilter>('todos');
  const [ts, setTs] = useState(
    () => new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTs(new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const s = useMemo(() => {
    const activeUsers  = users.filter(u => u.status === 'ativo').length;
    const pendentUsers = users.filter(u => u.status === 'pendente').length;

    const aluguerRes       = reservations.filter(r => aluguerIds.has(r.vehicleId));
    const aluguerAtivos    = aluguerRes.filter(r => r.status === 'ativa').length;
    const aluguerPendentes = aluguerRes.filter(r => r.status === 'pendente').length;
    const aluguerAtraso    = aluguerRes.filter(r => r.status === 'ativa' && r.dataFim < today).length;
    const devolucaoPend    = aluguerRes.filter(r => r.status === 'devolucao_pendente' || (r.status === 'ativa' && r.dataFim < today)).length;

    const compraRes     = reservations.filter(r => compraIds.has(r.vehicleId));
    const compraPend    = compraRes.filter(r => r.status === 'pendente').length;
    const compraAprov   = compraRes.filter(r => r.status === 'compra_aprovada').length;
    const compraEmPrest = compraRes.filter(r => r.status === 'em_prestacao').length;
    const compraAtraso  = compraRes.filter(r => r.status === 'prestacao_atraso').length;
    const compraAtivas  = compraPend + compraAprov + compraEmPrest + compraAtraso;

    const totalVeiculos  = vehicles.length;
    const disponíveis    = vehicles.filter(v => v.available !== false).length;
    const totalMotoristas = motoristas.length;
    const motorDisp       = motoristas.filter(m => m.status === 'disponivel').length;
    const motorOcupado    = motoristas.filter(m => m.status === 'em_servico').length;

    const guestsPend     = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;
    const gruposAbertos  = grupos.filter(g => g.estadoGrupo === 'Aberto').length;
    const gruposAtivos   = grupos.filter(g => g.estadoGrupo === 'EmAndamento').length;
    const inscricoesPend = inscricoes.filter(i => i.status === 'aguarda_validacao').length;

    return {
      activeUsers, pendentUsers,
      aluguerAtivos, aluguerPendentes, aluguerAtraso, devolucaoPend,
      compraAtivas, compraAtraso,
      totalVeiculos, disponíveis,
      totalMotoristas, motorDisp, motorOcupado,
      guestsPend,
      gruposAbertos, gruposAtivos, inscricoesPend,
    };
  }, [users, motoristas, guests, reservations, vehicles, grupos, inscricoes, today]);

  // badge counts por categoria
  const badgeAluguer     = s.aluguerAtraso + (s.aluguerPendentes > 0 ? 1 : 0) + (s.devolucaoPend > 0 ? 1 : 0);
  const badgeVeiculos    = (s.totalVeiculos - s.disponíveis) + (s.compraAtraso > 0 ? 1 : 0) + (s.motorOcupado > 0 ? 1 : 0);
  const badgeXitique     = s.inscricoesPend + (s.gruposAbertos > 0 ? 1 : 0);
  const badgeUtilizadores = s.pendentUsers + s.guestsPend;
  const badgeTodos       = badgeAluguer + badgeVeiculos + badgeXitique + badgeUtilizadores;

  // ── Viaturas em uso ──
  const emUsoAll = useMemo(
    () => reservations.filter(r => EM_USO_STATUSES.has(r.status)),
    [reservations],
  );
  const emUsoAtivos    = emUsoAll.filter(r => r.status === 'ativa' && r.dataFim >= today).length;
  const emUsoAtrasados = emUsoAll.filter(r => r.status === 'ativa' && r.dataFim < today).length;
  const emUsoConfirm   = emUsoAll.filter(r => r.status === 'confirmada' || r.status === 'pronta_levantamento').length;
  const emUsoDev       = emUsoAll.filter(r => r.status === 'devolucao_pendente').length;

  const emUsoFiltered = useMemo(() => {
    let list = emUsoAll;
    if (emUsoFilter === 'em_uso')      list = list.filter(r => r.status === 'ativa' && r.dataFim >= today);
    if (emUsoFilter === 'em_atraso')   list = list.filter(r => r.status === 'ativa' && r.dataFim < today);
    if (emUsoFilter === 'confirmadas') list = list.filter(r => r.status === 'confirmada' || r.status === 'pronta_levantamento');
    if (emUsoFilter === 'devolucao')   list = list.filter(r => r.status === 'devolucao_pendente');
    return list.sort((a, b) => {
      if (a.status === 'ativa' && a.dataFim < today) return -1;
      if (b.status === 'ativa' && b.dataFim < today) return 1;
      return a.dataFim.localeCompare(b.dataFim);
    });
  }, [emUsoAll, emUsoFilter, today]);

  const getVehicleName = (id: number) =>
    vehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const getVehicleImg  = (id: number) =>
    vehicles.find(v => v.id === id)?.img  ?? VEHICLES.find(v => v.id === id)?.img;
  const fmtD = (iso: string) => { const [,m,d] = iso.split('-'); return `${d}/${m}`; };

  // ── Alertas tabs ──
  const tabs: { key: AlertTab; label: string; badge: number; dot?: string }[] = [
    { key: 'todos',        label: 'Todos',        badge: badgeTodos },
    { key: 'alugueres',    label: 'Alugueres',    badge: badgeAluguer },
    { key: 'em_uso',       label: 'Em Uso',        badge: emUsoAll.length, dot: 'bg-amber-400' },
    { key: 'veiculos',     label: 'Veículos',      badge: badgeVeiculos },
    { key: 'xitique',      label: 'Xitique',       badge: badgeXitique },
    { key: 'utilizadores', label: 'Utilizadores',  badge: badgeUtilizadores },
  ];

  const emUsoSubTabs: { key: EmUsoFilter; label: string; count: number; dot: string }[] = [
    { key: 'todos',       label: 'Todos',        count: emUsoAll.length,  dot: 'bg-zinc-400' },
    { key: 'em_uso',      label: 'Em Uso',       count: emUsoAtivos,      dot: 'bg-amber-400' },
    { key: 'em_atraso',   label: 'Em Atraso',    count: emUsoAtrasados,   dot: 'bg-red-500' },
    { key: 'confirmadas', label: 'Confirmadas',   count: emUsoConfirm,     dot: 'bg-blue-400' },
    { key: 'devolucao',   label: 'Devoluções',    count: emUsoDev,         dot: 'bg-orange-400' },
  ];

  const showAluguer      = alertTab === 'todos' || alertTab === 'alugueres';
  const showVeiculos     = alertTab === 'todos' || alertTab === 'veiculos';
  const showXitique      = alertTab === 'todos' || alertTab === 'xitique';
  const showUtilizadores = alertTab === 'todos' || alertTab === 'utilizadores';

  const hasAluguerAlert      = s.aluguerAtraso > 0 || s.aluguerPendentes > 0 || s.devolucaoPend > 0;
  const hasVeiculosAlert     = s.totalVeiculos - s.disponíveis > 0 || s.compraAtraso > 0 || s.motorOcupado > 0;
  const hasXitiqueAlert      = s.inscricoesPend > 0 || s.gruposAbertos > 0 || s.gruposAtivos > 0;
  const hasUtilizadoresAlert = s.pendentUsers > 0 || s.guestsPend > 0;

  const hasAnyInView = alertTab !== 'em_uso' && (
    (showAluguer && hasAluguerAlert) || (showVeiculos && hasVeiculosAlert)
    || (showXitique && hasXitiqueAlert) || (showUtilizadores && hasUtilizadoresAlert)
  );

  const tabAction: Partial<Record<AlertTab, { primary: string; route: string; secondary?: { label: string; route: string } }>> = {
    todos:        { primary: 'Ver Alugueres',      route: '/admin/aluguer?tab=acoes' },
    alugueres:    { primary: 'Gerir Alugueres',    route: '/admin/aluguer?tab=acoes', secondary: { label: 'Aprovar', route: '/admin/aluguer?tab=acoes' } },
    veiculos:     { primary: 'Gerir Veículos',     route: '/admin/veiculos' },
    xitique:      { primary: 'Gerir Xitique',      route: '/admin/xitique' },
    utilizadores: { primary: 'Gerir Utilizadores', route: '/admin/utilizadores' },
  };
  const action = alertTab !== 'em_uso' ? tabAction[alertTab] : undefined;

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">Painel Administrativo</h1>
            <p className="text-xs text-white mt-0.5">SOS Motors · Vista Geral</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-400/50 uppercase tracking-widest leading-tight">Última Actualização</p>
            <p className="text-sm font-black text-amber-400 tabular-nums">{ts}</p>
          </div>
        </div>

        {/* ── Métricas unificadas ──────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          {/* Header com dois grupos */}
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-zinc-800/70">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest flex-1">Métricas Gerais</p>
            <span className="text-[9px] text-white font-black uppercase tracking-widest">Operacional</span>
            <div className="w-px h-3 bg-amber-500/20 mx-1" />
            <span className="text-[9px] text-white font-black uppercase tracking-widest">Negócio</span>
          </div>

          {/* 8 métricas: 2 colunas mobile → 4 tablet → 8 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-zinc-800/50">
            <div className="px-4 py-4 border-r border-b sm:border-b-0 border-zinc-800/50">
              <Metric label="Frota" value={s.totalVeiculos} sub="Veículos" onClick={() => navigate('/admin/veiculos')} />
            </div>
            <div className="px-4 py-4 border-b sm:border-r sm:border-b-0 border-zinc-800/50">
              <Metric label="Em Atraso" value={s.aluguerAtraso} sub="Alugueres" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
            </div>
            <div className="px-4 py-4 border-r border-b sm:border-b-0 border-zinc-800/50">
              <Metric label="Devoluções" value={s.devolucaoPend} sub="Pendentes" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
            </div>
            <div className="px-4 py-4 border-b lg:border-r border-zinc-800/50 lg:border-amber-500/25">
              <Metric label="Motoristas" value={s.motorDisp} sub="Disponíveis" onClick={() => navigate('/admin/motoristas')} />
            </div>
            <div className="px-4 py-4 border-r border-zinc-800/50">
              <Metric label="Utilizadores" value={s.activeUsers} sub="Activos" onClick={() => navigate('/admin/utilizadores')} />
            </div>
            <div className="px-4 py-4 border-r border-zinc-800/50">
              <Metric label="Alugueres" value={s.aluguerAtivos} sub="Activos" onClick={() => navigate('/admin/aluguer')} />
            </div>
            <div className="px-4 py-4 border-r border-zinc-800/50">
              <Metric label="Compras" value={s.compraAtivas} sub="A Decorrer" onClick={() => navigate('/admin/compra')} />
            </div>
            <div className="px-4 py-4">
              <Metric label="Xitique" value={s.gruposAtivos + s.gruposAbertos} sub="Grupos" onClick={() => navigate('/admin/xitique')} />
            </div>
          </div>
        </div>

        {/* ── Painel unificado: Alertas + Viaturas em Uso ─────────────────────── */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">

          {/* ── Header com tabs unificadas ── */}
          <div className="flex items-center gap-2 px-5 pt-3.5 border-b border-zinc-800/70 flex-wrap">
            <div className="w-1 h-4 bg-amber-500 rounded-full shrink-0" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mr-1 shrink-0">Painel</p>
            <div className="flex items-center gap-1 flex-wrap pb-3.5">
              {tabs.map(tab => {
                const active = alertTab === tab.key;
                return (
                  <button key={tab.key} type="button"
                    onClick={() => { setAlertTab(tab.key); if (tab.key !== 'em_uso') setEmUsoFilter('todos'); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                      active ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-white hover:bg-zinc-800 border border-transparent'
                    }`}>
                    {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                        active ? 'bg-amber-500/30 text-amber-300' : 'bg-zinc-700 text-white'
                      }`}>{tab.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Conteúdo: Viaturas em Uso ── */}
          {alertTab === 'em_uso' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-800/50">
                {[
                  { label: 'Em Uso',       value: emUsoAtivos,    color: 'text-amber-400' },
                  { label: 'Em Atraso',    value: emUsoAtrasados, color: emUsoAtrasados > 0 ? 'text-red-400' : 'text-zinc-500' },
                  { label: 'Confirmadas',  value: emUsoConfirm,   color: 'text-blue-400' },
                  { label: 'Devoluções',   value: emUsoDev,       color: 'text-orange-400' },
                ].map((k, i) => (
                  <div key={k.label} className={`px-4 py-3 ${i < 3 ? 'border-r border-zinc-800/50' : ''} ${i < 2 ? 'border-b sm:border-b-0 border-zinc-800/50' : ''}`}>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">{k.label}</p>
                    <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Sub-filtros */}
              <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-zinc-800/50 flex-wrap">
                {emUsoSubTabs.map(t => (
                  <button key={t.key} onClick={() => setEmUsoFilter(t.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all whitespace-nowrap border ${
                      emUsoFilter === t.key
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'text-white hover:bg-zinc-800 border-transparent'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                    {t.label}
                    <span className={`text-[10px] font-black ${emUsoFilter === t.key ? 'text-amber-300' : 'text-white/50'}`}>{t.count}</span>
                  </button>
                ))}
              </div>

              {/* Lista */}
              {emUsoFiltered.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-zinc-500">Sem viaturas para este filtro.</div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {emUsoFiltered.map((r, idx) => {
                    const nome = getVehicleName(r.vehicleId);
                    const img  = getVehicleImg(r.vehicleId);
                    const isAtrasado = r.status === 'ativa' && r.dataFim < today;
                    return (
                      <div key={r.id} className={`flex items-center gap-3 px-5 py-2.5 ${isAtrasado ? 'bg-red-500/5' : idx % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                        <div className="w-12 h-9 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
                          {img
                            ? <img src={img} alt={nome} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">🚗</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">{nome}</p>
                          <p className="text-[10px] text-zinc-400">{r.clientName}{r.clientPhone ? ` · ${r.clientPhone}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-zinc-400 tabular-nums">{fmtD(r.dataInicio)} → {fmtD(r.dataFim)}</p>
                          {isAtrasado
                            ? <span className="text-[9px] font-black text-red-400 uppercase">⚠ Atraso</span>
                            : <span className="text-[9px] font-bold text-amber-400 uppercase">
                                {r.status === 'ativa' ? 'Em Uso' : r.status === 'devolucao_pendente' ? 'Devolução' : 'Confirmada'}
                              </span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rodapé */}
              <div className="px-5 py-3 border-t border-zinc-800/50 flex items-center justify-between">
                <span className="text-[11px] text-white">{emUsoFiltered.length} registo{emUsoFiltered.length !== 1 ? 's' : ''}</span>
                <button onClick={() => navigate('/admin/viaturas-em-uso')}
                  className="flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors">
                  Ver lista completa
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ── Conteúdo: Alertas ── */}
          {alertTab !== 'em_uso' && (
            <>
              <div className="px-5 py-4">
                {!hasAnyInView ? (
                  <p className="text-xs text-white py-2">Sem alertas activos para esta categoria.</p>
                ) : (
                  <div className="flex flex-wrap gap-y-5 divide-x-2 divide-amber-500/40">
                    {showAluguer && hasAluguerAlert && (
                      <div className="flex-1 min-w-[160px] space-y-3 px-6 first:pl-0 last:pr-0">
                        <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest pb-1 border-b border-zinc-800/60">Alugueres</p>
                        {s.aluguerAtraso > 0 && <AlertRow dot="bg-red-500" label={`${s.aluguerAtraso} Aluguer${s.aluguerAtraso > 1 ? 'es' : ''} Fora do Prazo`} sub="Devolução em atraso" />}
                        {s.aluguerPendentes > 0 && <AlertRow dot="bg-amber-500" label={`${s.aluguerPendentes} Reserva${s.aluguerPendentes > 1 ? 's' : ''} Pendente${s.aluguerPendentes > 1 ? 's' : ''}`} sub="Aguarda confirmação" />}
                        {s.devolucaoPend > 0 && <AlertRow dot="bg-amber-400" label={`${s.devolucaoPend} Devolução Pendente`} sub="Aguarda verificação" />}
                      </div>
                    )}
                    {showVeiculos && hasVeiculosAlert && (
                      <div className="flex-1 min-w-[160px] space-y-3 px-6 first:pl-0 last:pr-0">
                        <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest pb-1 border-b border-zinc-800/60">Veículos</p>
                        {s.totalVeiculos - s.disponíveis > 0 && <AlertRow dot="bg-amber-500" label={`${s.totalVeiculos - s.disponíveis} Veículo${s.totalVeiculos - s.disponíveis > 1 ? 's' : ''} Indisponível${s.totalVeiculos - s.disponíveis > 1 ? 'is' : ''}`} sub={`${s.disponíveis} de ${s.totalVeiculos} disponíveis`} />}
                        {s.compraAtraso > 0 && <AlertRow dot="bg-red-500" label={`${s.compraAtraso} Prestação${s.compraAtraso > 1 ? 'ões' : ''} em Atraso`} sub="Compras com pagamento em falta" />}
                        {s.motorOcupado > 0 && <AlertRow dot="bg-emerald-500" label={`${s.motorOcupado} Motorista${s.motorOcupado > 1 ? 's' : ''} em Serviço`} sub={`${s.motorDisp} de ${s.totalMotoristas} disponíveis`} />}
                      </div>
                    )}
                    {showXitique && hasXitiqueAlert && (
                      <div className="flex-1 min-w-[160px] space-y-3 px-6 first:pl-0 last:pr-0">
                        <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest pb-1 border-b border-zinc-800/60">Xitique</p>
                        {s.inscricoesPend > 0 && <AlertRow dot="bg-amber-500" label={`${s.inscricoesPend} Nova${s.inscricoesPend > 1 ? 's' : ''} Inscrição${s.inscricoesPend > 1 ? 'ões' : ''}`} sub="Aguarda validação" />}
                        {s.gruposAbertos > 0 && <AlertRow dot="bg-emerald-500" label={`${s.gruposAbertos} Grupo${s.gruposAbertos > 1 ? 's' : ''} Aberto${s.gruposAbertos > 1 ? 's' : ''}`} sub="A aceitar membros" />}
                        {s.gruposAtivos > 0 && <AlertRow dot="bg-white/60" label={`${s.gruposAtivos} Grupo${s.gruposAtivos > 1 ? 's' : ''} Em Andamento`} sub="Ciclo activo" />}
                      </div>
                    )}
                    {showUtilizadores && hasUtilizadoresAlert && (
                      <div className="flex-1 min-w-[160px] space-y-3 px-6 first:pl-0 last:pr-0">
                        <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest pb-1 border-b border-zinc-800/60">Utilizadores</p>
                        {s.pendentUsers > 0 && <AlertRow dot="bg-amber-500" label={`${s.pendentUsers} Utilizador${s.pendentUsers > 1 ? 'es' : ''} em Revisão`} sub={`Conta${s.pendentUsers > 1 ? 's' : ''} sob investigação`} />}
                        {s.guestsPend > 0 && <AlertRow dot="bg-amber-400" label={`${s.guestsPend} Visitante${s.guestsPend > 1 ? 's' : ''} Pendente${s.guestsPend > 1 ? 's' : ''}`} sub="Aguarda aprovação" />}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {action && (
                <div className="px-5 pb-4 pt-1 flex gap-2.5 border-t border-zinc-800/50">
                  <BtnPrimary label={action.primary} onClick={() => navigate(action.route)} />
                  {action.secondary && (
                    <BtnGhost label={action.secondary.label} onClick={() => navigate(action.secondary!.route)} />
                  )}
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}

// ── Secção Viaturas em Uso (dentro do card unificado) ────────────────────────
function ViaturaEmUsoInline({
  navigate,
  reservations,
  vehicles,
  today,
}: {
  navigate: (to: string) => void;
  reservations: ReturnType<typeof useReservations>['reservations'];
  vehicles: ReturnType<typeof useVehicles>['vehicles'];
  today: string;
}) {
  const emUso = useMemo(
    () => reservations.filter(r => EM_USO_STATUSES.has(r.status)),
    [reservations],
  );

  const atrasados = emUso.filter(r => r.status === 'ativa' && r.dataFim < today).length;
  const ativos    = emUso.filter(r => r.status === 'ativa' && r.dataFim >= today).length;

  const getVehicleName = (id: number) =>
    vehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const getVehicleImg  = (id: number) =>
    vehicles.find(v => v.id === id)?.img  ?? VEHICLES.find(v => v.id === id)?.img;

  const preview = emUso.slice(0, 4);
  const fmtD = (iso: string) => { const [,m,d] = iso.split('-'); return `${d}/${m}`; };

  return (
    <>
      {/* Sub-header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
        <div className="w-1 h-4 bg-amber-500 rounded-full" />
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest flex-1">Viaturas em Uso</p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-400">{emUso.length} total</span>
          {atrasados > 0 && (
            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
              ⚠ {atrasados} em atraso
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800/50 border-b border-zinc-800/50">
        {[
          { label: 'Em Uso Agora',  value: ativos,       color: 'text-amber-400' },
          { label: 'Em Atraso',     value: atrasados,    color: atrasados > 0 ? 'text-red-400' : 'text-zinc-500' },
          { label: 'Total Activas', value: emUso.length, color: 'text-white' },
        ].map(k => (
          <div key={k.label} className="px-5 py-3">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">{k.label}</p>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Lista prévia */}
      {emUso.length === 0 ? (
        <div className="px-5 py-5 text-center text-xs text-zinc-500">Sem viaturas activas no momento.</div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {preview.map((r, idx) => {
            const nome = getVehicleName(r.vehicleId);
            const img  = getVehicleImg(r.vehicleId);
            const isAtrasado = r.status === 'ativa' && r.dataFim < today;
            return (
              <div key={r.id} className={`flex items-center gap-3 px-5 py-2.5 ${isAtrasado ? 'bg-red-500/5' : idx % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                <div className="w-12 h-9 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
                  {img
                    ? <img src={img} alt={nome} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">🚗</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{nome}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{r.clientName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-zinc-400 tabular-nums">{fmtD(r.dataInicio)} → {fmtD(r.dataFim)}</p>
                  {isAtrasado
                    ? <span className="text-[9px] font-black text-red-400 uppercase">Em Atraso</span>
                    : <span className="text-[9px] font-bold text-amber-400 uppercase">
                        {r.status === 'ativa' ? 'Em Uso' : r.status === 'devolucao_pendente' ? 'Devolução' : 'Confirmada'}
                      </span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rodapé */}
      <div className="px-5 py-3 border-t border-zinc-800/50 flex items-center justify-between">
        {emUso.length > 4 && <span className="text-[11px] text-zinc-500">+{emUso.length - 4} mais</span>}
        <button
          onClick={() => navigate('/admin/viaturas-em-uso')}
          className="ml-auto flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors"
        >
          Ver lista completa
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </>
  );
}
