import { useMemo, useState, useEffect } from 'react';
import { useUsers } from '../context/UsersContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useGuests } from '../context/GuestsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';

const compraIds  = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));
const aluguerIds = new Set(VEHICLES.filter(v => v.mode === 'aluguer').map(v => v.id));

type AlertTab = 'todos' | 'alugueres' | 'veiculos' | 'xitique' | 'utilizadores';

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
    const devolucaoPend    = aluguerRes.filter(r => r.status === 'devolucao_pendente').length;

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

  const tabs: { key: AlertTab; label: string; badge: number }[] = [
    { key: 'todos',        label: 'Todos',        badge: badgeTodos },
    { key: 'alugueres',    label: 'Alugueres',    badge: badgeAluguer },
    { key: 'veiculos',     label: 'Veículos',      badge: badgeVeiculos },
    { key: 'xitique',      label: 'Xitique',       badge: badgeXitique },
    { key: 'utilizadores', label: 'Utilizadores',  badge: badgeUtilizadores },
  ];

  const showAluguer     = alertTab === 'todos' || alertTab === 'alugueres';
  const showVeiculos    = alertTab === 'todos' || alertTab === 'veiculos';
  const showXitique     = alertTab === 'todos' || alertTab === 'xitique';
  const showUtilizadores = alertTab === 'todos' || alertTab === 'utilizadores';

  const hasAluguerAlert     = s.aluguerAtraso > 0 || s.aluguerPendentes > 0 || s.devolucaoPend > 0;
  const hasVeiculosAlert    = s.totalVeiculos - s.disponíveis > 0 || s.compraAtraso > 0 || s.motorOcupado > 0;
  const hasXitiqueAlert     = s.inscricoesPend > 0 || s.gruposAbertos > 0 || s.gruposAtivos > 0;
  const hasUtilizadoresAlert = s.pendentUsers > 0 || s.guestsPend > 0;

  const hasAnyInView = (showAluguer && hasAluguerAlert) || (showVeiculos && hasVeiculosAlert)
    || (showXitique && hasXitiqueAlert) || (showUtilizadores && hasUtilizadoresAlert);

  // botão de acção consoante o tab activo
  const tabAction: Record<AlertTab, { primary: string; route: string; secondary?: { label: string; route: string } }> = {
    todos:        { primary: 'Ver Alugueres', route: '/admin/aluguer?tab=acoes' },
    alugueres:    { primary: 'Gerir Alugueres', route: '/admin/aluguer?tab=acoes', secondary: { label: 'Aprovar', route: '/admin/aluguer?tab=acoes' } },
    veiculos:     { primary: 'Gerir Veículos',  route: '/admin/veiculos' },
    xitique:      { primary: 'Gerir Xitique',   route: '/admin/xitique' },
    utilizadores: { primary: 'Gerir Utilizadores', route: '/admin/utilizadores' },
  };
  const action = tabAction[alertTab];

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

          {/* 8 métricas: 4 operacional + separador âmbar + 4 negócio */}
          <div className="flex divide-x divide-zinc-800/50">
            {/* Grupo operacional */}
            <div className="flex-1 grid grid-cols-4 divide-x divide-zinc-800/50">
              <div className="px-4 py-4">
                <Metric label="Frota" value={s.totalVeiculos} sub="Veículos" onClick={() => navigate('/admin/veiculos')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Em Atraso" value={s.aluguerAtraso} sub="Alugueres" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Devoluções" value={s.devolucaoPend} sub="Pendentes" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Motoristas" value={s.motorDisp} sub="Disponíveis" onClick={() => navigate('/admin/motoristas')} />
              </div>
            </div>

            {/* Separador âmbar */}
            <div className="w-px bg-amber-500/25" />

            {/* Grupo negócio */}
            <div className="flex-1 grid grid-cols-4 divide-x divide-zinc-800/50">
              <div className="px-4 py-4">
                <Metric label="Utilizadores" value={s.activeUsers} sub="Activos" onClick={() => navigate('/admin/utilizadores')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Alugueres" value={s.aluguerAtivos} sub="Activos" onClick={() => navigate('/admin/aluguer')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Compras" value={s.compraAtivas} sub="A Decorrer" onClick={() => navigate('/admin/compra')} />
              </div>
              <div className="px-4 py-4">
                <Metric label="Xitique" value={s.gruposAtivos + s.gruposAbertos} sub="Grupos" onClick={() => navigate('/admin/xitique')} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Painel de alertas unificado ─────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">

          {/* Header com tabs de filtro */}
          <div className="flex items-center gap-2.5 px-5 pt-3.5 border-b border-zinc-800/70 flex-wrap">
            <div className="w-1 h-4 bg-amber-500 rounded-full shrink-0" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mr-2 shrink-0">Alertas</p>

            <div className="flex items-center gap-1 flex-wrap pb-3.5">
              {tabs.map(tab => {
                const active = alertTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAlertTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                      active
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'text-white hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                        active
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-zinc-700 text-white'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo dos alertas */}
          <div className="px-5 py-4">
            {!hasAnyInView ? (
              <p className="text-xs text-white py-2">Sem alertas activos para esta categoria.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-3">

                {/* Alugueres */}
                {showAluguer && hasAluguerAlert && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Alugueres</p>
                    {s.aluguerAtraso > 0 && (
                      <AlertRow dot="bg-red-500"
                        label={`${s.aluguerAtraso} Aluguer${s.aluguerAtraso > 1 ? 'es' : ''} Fora do Prazo`}
                        sub="Devolução em atraso" />
                    )}
                    {s.aluguerPendentes > 0 && (
                      <AlertRow dot="bg-amber-500"
                        label={`${s.aluguerPendentes} Reserva${s.aluguerPendentes > 1 ? 's' : ''} Pendente${s.aluguerPendentes > 1 ? 's' : ''}`}
                        sub="Aguarda confirmação" />
                    )}
                    {s.devolucaoPend > 0 && (
                      <AlertRow dot="bg-amber-400"
                        label={`${s.devolucaoPend} Devolução Pendente`}
                        sub="Aguarda verificação" />
                    )}
                  </div>
                )}

                {/* Veículos */}
                {showVeiculos && hasVeiculosAlert && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Veículos</p>
                    {s.totalVeiculos - s.disponíveis > 0 && (
                      <AlertRow dot="bg-amber-500"
                        label={`${s.totalVeiculos - s.disponíveis} Veículo${s.totalVeiculos - s.disponíveis > 1 ? 's' : ''} Indisponível${s.totalVeiculos - s.disponíveis > 1 ? 'is' : ''}`}
                        sub={`${s.disponíveis} de ${s.totalVeiculos} disponíveis`} />
                    )}
                    {s.compraAtraso > 0 && (
                      <AlertRow dot="bg-red-500"
                        label={`${s.compraAtraso} Prestação${s.compraAtraso > 1 ? 'ões' : ''} em Atraso`}
                        sub="Compras com pagamento em falta" />
                    )}
                    {s.motorOcupado > 0 && (
                      <AlertRow dot="bg-emerald-500"
                        label={`${s.motorOcupado} Motorista${s.motorOcupado > 1 ? 's' : ''} em Serviço`}
                        sub={`${s.motorDisp} de ${s.totalMotoristas} disponíveis`} />
                    )}
                  </div>
                )}

                {/* Xitique */}
                {showXitique && hasXitiqueAlert && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Xitique</p>
                    {s.inscricoesPend > 0 && (
                      <AlertRow dot="bg-amber-500"
                        label={`${s.inscricoesPend} Nova${s.inscricoesPend > 1 ? 's' : ''} Inscrição${s.inscricoesPend > 1 ? 'ões' : ''}`}
                        sub="Aguarda validação" />
                    )}
                    {s.gruposAbertos > 0 && (
                      <AlertRow dot="bg-emerald-500"
                        label={`${s.gruposAbertos} Grupo${s.gruposAbertos > 1 ? 's' : ''} Aberto${s.gruposAbertos > 1 ? 's' : ''}`}
                        sub="A aceitar membros" />
                    )}
                    {s.gruposAtivos > 0 && (
                      <AlertRow dot="bg-white/60"
                        label={`${s.gruposAtivos} Grupo${s.gruposAtivos > 1 ? 's' : ''} Em Andamento`}
                        sub="Ciclo activo" />
                    )}
                  </div>
                )}

                {/* Utilizadores */}
                {showUtilizadores && hasUtilizadoresAlert && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Utilizadores</p>
                    {s.pendentUsers > 0 && (
                      <AlertRow dot="bg-amber-500"
                        label={`${s.pendentUsers} Utilizador${s.pendentUsers > 1 ? 'es' : ''} em Revisão`}
                        sub={`Conta${s.pendentUsers > 1 ? 's' : ''} sob investigação`} />
                    )}
                    {s.guestsPend > 0 && (
                      <AlertRow dot="bg-amber-400"
                        label={`${s.guestsPend} Visitante${s.guestsPend > 1 ? 's' : ''} Pendente${s.guestsPend > 1 ? 's' : ''}`}
                        sub="Aguarda aprovação" />
                    )}
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Rodapé com botões de acção */}
          <div className="px-5 pb-4 pt-1 flex gap-2.5 border-t border-zinc-800/50">
            <BtnPrimary label={action.primary} onClick={() => navigate(action.route)} />
            {action.secondary && (
              <BtnGhost label={action.secondary.label} onClick={() => navigate(action.secondary!.route)} />
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
