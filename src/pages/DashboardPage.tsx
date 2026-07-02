import { useMemo, useState, useEffect } from 'react';
import { useUsers } from '../context/UsersContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useGuests } from '../context/GuestsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';

const compraIds = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));
const aluguerIds = new Set(VEHICLES.filter(v => v.mode === 'aluguer').map(v => v.id));

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
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${color}`} />;
}

// ── Metric item inside a top card ─────────────────────────────────────────────
function Metric({ label, value, sub, onClick }: {
  label: string;
  value: string | number;
  sub?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`text-left w-full ${onClick ? 'group cursor-pointer' : ''}`}>
      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-3xl font-black text-white leading-none tabular-nums">{value}</p>
        {onClick && (
          <span className="text-white/30 group-hover:text-amber-400 transition-colors mt-1">
            <ArrowRight />
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-white mt-1 leading-tight">{sub}</p>}
    </Tag>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ title, badge, children, footer }: {
  title: string;
  badge?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
        <div className="w-1 h-4 bg-amber-500 rounded-full" />
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest">{title}</p>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto text-xs font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 px-5 py-4 space-y-3">{children}</div>
      {footer && <div className="px-5 pb-4 pt-2 flex gap-2.5">{footer}</div>}
    </div>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
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

// ── Btn helpers ────────────────────────────────────────────────────────────────
function BtnPrimary({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 text-xs font-black text-zinc-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer"
    >
      {label}
    </button>
  );
}

function BtnGhost({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 text-xs font-black text-amber-400 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer border border-amber-500/30"
    >
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

    const totalVeiculos = vehicles.length;
    const disponíveis   = vehicles.filter(v => v.available !== false).length;

    const totalMotoristas = motoristas.length;
    const motorDisp       = motoristas.filter(m => m.status === 'disponivel').length;
    const motorOcupado    = motoristas.filter(m => m.status === 'em_servico').length;

    const guestsPend = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;

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

  const criticalCount = s.aluguerAtraso + (s.aluguerPendentes > 0 ? 1 : 0);
  const vehicleAlerts = (s.totalVeiculos - s.disponíveis) + (s.compraAtraso > 0 ? 1 : 0);

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="px-6 py-6 space-y-5">

        {/* Header + timestamp */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">Painel Administrativo</h1>
            <p className="text-xs text-white mt-0.5">SOS Motors · Vista Geral</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-widest leading-tight">Último Actualização</p>
            <p className="text-sm font-black text-amber-400 tabular-nums">{ts}</p>
          </div>
        </div>

        {/* ── Row 1: Two overview cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-5">

          {/* ALERTAS OPERACIONAIS */}
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Alertas Operacionais</p>
            </div>
            <div className="grid grid-cols-4 divide-x divide-zinc-800/60">
              <div className="px-5 py-5">
                <Metric label="Frota" value={s.totalVeiculos} sub="Veículos" onClick={() => navigate('/admin/veiculos')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Em Atraso" value={s.aluguerAtraso} sub="Alugueres" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Devoluções" value={s.devolucaoPend} sub="Pendentes" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Motoristas" value={s.motorDisp} sub="Disponíveis" onClick={() => navigate('/admin/motoristas')} />
              </div>
            </div>
          </div>

          {/* INDICADORES CHAVE */}
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Indicadores Chave</p>
            </div>
            <div className="grid grid-cols-4 divide-x divide-zinc-800/60">
              <div className="px-5 py-5">
                <Metric label="Utilizadores" value={s.activeUsers} sub="Activos" onClick={() => navigate('/admin/utilizadores')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Alugueres" value={s.aluguerAtivos} sub="Activos" onClick={() => navigate('/admin/aluguer')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Compras" value={s.compraAtivas} sub="A Decorrer" onClick={() => navigate('/admin/compra')} />
              </div>
              <div className="px-5 py-5">
                <Metric label="Xitique" value={s.gruposAtivos + s.gruposAbertos} sub="Grupos" onClick={() => navigate('/admin/xitique')} />
              </div>
            </div>
          </div>

        </div>

        {/* ── Row 2: Three alert cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-5">

          {/* ALUGUERES CRÍTICOS */}
          <Card
            title="Alugueres Críticos"
            badge={criticalCount}
            footer={
              <>
                <BtnPrimary label="Contactar" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
                <BtnGhost label="Aprovar" onClick={() => navigate('/admin/aluguer?tab=acoes')} />
              </>
            }
          >
            {s.aluguerAtraso === 0 && s.aluguerPendentes === 0 ? (
              <p className="text-xs text-white">Sem alertas activos</p>
            ) : (
              <>
                {s.aluguerAtraso > 0 && (
                  <AlertRow
                    dot="bg-red-500"
                    label={`${s.aluguerAtraso} Aluguer${s.aluguerAtraso > 1 ? 'es' : ''} Fora do Prazo`}
                    sub="Devolução em atraso"
                  />
                )}
                {s.aluguerPendentes > 0 && (
                  <AlertRow
                    dot="bg-amber-500"
                    label={`Aprovar ${s.aluguerPendentes} Reserva${s.aluguerPendentes > 1 ? 's' : ''} Pendente${s.aluguerPendentes > 1 ? 's' : ''}`}
                    sub="Aguarda confirmação"
                  />
                )}
                {s.devolucaoPend > 0 && (
                  <AlertRow
                    dot="bg-amber-400"
                    label={`${s.devolucaoPend} Devolução Pendente`}
                    sub="Aguarda verificação"
                  />
                )}
              </>
            )}
          </Card>

          {/* ALERTAS DE VEÍCULO */}
          <Card
            title="Alertas de Veículo"
            badge={vehicleAlerts > 0 ? vehicleAlerts : undefined}
            footer={
              <BtnPrimary label="Revisar Veículos" onClick={() => navigate('/admin/veiculos')} />
            }
          >
            {vehicleAlerts === 0 ? (
              <p className="text-xs text-white">Frota em ordem</p>
            ) : (
              <>
                {s.totalVeiculos - s.disponíveis > 0 && (
                  <AlertRow
                    dot="bg-amber-500"
                    label={`${s.totalVeiculos - s.disponíveis} Veículo${s.totalVeiculos - s.disponíveis > 1 ? 's' : ''} Indisponível${s.totalVeiculos - s.disponíveis > 1 ? 'is' : ''}`}
                    sub={`${s.disponíveis} de ${s.totalVeiculos} disponíveis`}
                  />
                )}
                {s.compraAtraso > 0 && (
                  <AlertRow
                    dot="bg-red-500"
                    label={`${s.compraAtraso} Prestação${s.compraAtraso > 1 ? 'ões' : ''} em Atraso`}
                    sub="Compras com pagamento em falta"
                  />
                )}
                {s.motorOcupado > 0 && (
                  <AlertRow
                    dot="bg-emerald-500"
                    label={`${s.motorOcupado} Motorista${s.motorOcupado > 1 ? 's' : ''} em Serviço`}
                    sub={`${s.motorDisp} de ${s.totalMotoristas} disponíveis`}
                  />
                )}
              </>
            )}
          </Card>

          {/* GRUPO XITIQUE */}
          <Card
            title="Grupo Xitique"
            badge={s.inscricoesPend > 0 ? s.inscricoesPend : undefined}
            footer={
              <BtnPrimary label="Revisar Grupos" onClick={() => navigate('/admin/xitique')} />
            }
          >
            {s.inscricoesPend === 0 && s.gruposAbertos === 0 ? (
              <p className="text-xs text-white">Sem inscrições pendentes</p>
            ) : (
              <>
                {s.inscricoesPend > 0 && (
                  <AlertRow
                    dot="bg-amber-500"
                    label={`Aprovar ${s.inscricoesPend} Nova${s.inscricoesPend > 1 ? 's' : ''} Inscrição${s.inscricoesPend > 1 ? 'ões' : ''}`}
                    sub="Aguarda validação"
                  />
                )}
                {s.gruposAbertos > 0 && (
                  <AlertRow
                    dot="bg-emerald-500"
                    label={`${s.gruposAbertos} Grupo${s.gruposAbertos > 1 ? 's' : ''} Aberto${s.gruposAbertos > 1 ? 's' : ''}`}
                    sub="A aceitar membros"
                  />
                )}
                {s.gruposAtivos > 0 && (
                  <AlertRow
                    dot="bg-white"
                    label={`${s.gruposAtivos} Grupo${s.gruposAtivos > 1 ? 's' : ''} Em Andamento`}
                    sub="Ciclo activo"
                  />
                )}
              </>
            )}
          </Card>

        </div>

        {/* ── Row 3: Alerts ───────────────────────────────────────────────────── */}
        <Card
          title="Alerts de Utilizadores"
          badge={(s.pendentUsers + s.guestsPend) > 0 ? s.pendentUsers + s.guestsPend : undefined}
          footer={
            <BtnPrimary label="Revisar Conta" onClick={() => navigate('/admin/utilizadores')} />
          }
        >
          {s.pendentUsers === 0 && s.guestsPend === 0 ? (
            <p className="text-xs text-white">Sem utilizadores pendentes</p>
          ) : (
            <>
              {s.pendentUsers > 0 && (
                <AlertRow
                  dot="bg-amber-500"
                  label={`${s.pendentUsers} Utilizador${s.pendentUsers > 1 ? 'es' : ''} em Revisão`}
                  sub={`Conta${s.pendentUsers > 1 ? 's' : ''} sob investigação`}
                />
              )}
              {s.guestsPend > 0 && (
                <AlertRow
                  dot="bg-amber-400"
                  label={`${s.guestsPend} Visitante${s.guestsPend > 1 ? 's' : ''} Pendente${s.guestsPend > 1 ? 's' : ''}`}
                  sub="Aguarda aprovação"
                />
              )}
            </>
          )}
        </Card>

      </div>
    </div>
  );
}
