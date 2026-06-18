import { useMemo } from 'react';
import { useUsers } from '../context/UsersContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useGuests } from '../context/GuestsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { AcoesNecessarias } from '../components/AcoesNecessarias';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';
import {
  IconUsers, IconCar, IconTag, IconFleet,
  IconSteering, IconWallet, IconChevronRight,
} from '../components/Icons';

const compraIds = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));
const aluguerIds = new Set(VEHICLES.filter(v => v.mode === 'aluguer').map(v => v.id));

// ── Mini progress bar ─────────────────────────────────────────────────────────
function MiniBar({ value, max, color = 'bg-amber-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Detail Card ───────────────────────────────────────────────────────────────
interface SubItem { label: string; value: string | number; color?: string; dot?: string }
interface DetailCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  value: string | number;
  valueColor?: string;
  accent?: string;
  items: SubItem[];
  bar?: { value: number; max: number; color?: string };
  onClick?: () => void;
}

function DetailCard({ icon, iconColor = 'text-zinc-400', label, value, valueColor = 'text-white', accent = 'border-zinc-800', items, bar, onClick }: DetailCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group w-full text-left bg-zinc-900 border ${accent} rounded-2xl p-5 space-y-4 transition-all ${
        onClick ? 'hover:brightness-110 hover:border-zinc-600 cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 ${iconColor}`}>{icon}</span>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider leading-tight">{label}</p>
        </div>
        {onClick && <IconChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mt-0.5" />}
      </div>

      {/* Main value */}
      <p className={`text-4xl font-black leading-none ${valueColor}`}>{value}</p>

      {/* Progress bar */}
      {bar && <MiniBar value={bar.value} max={bar.max} color={bar.color} />}

      {/* Sub items */}
      {items.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/70">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {item.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />}
                <span className="text-[11px] text-zinc-500">{item.label}</span>
              </div>
              <span className={`text-[11px] font-black tabular-nums ${item.color ?? 'text-zinc-300'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Tag>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { users }       = useUsers();
  const { motoristas }  = useMotoristas();
  const { guests }      = useGuests();
  const { reservations } = useReservations();
  const { vehicles }    = useVehicles();
  const { grupos, inscricoes } = useXitique();
  const { navigate }    = useRoute();

  const today = new Date().toISOString().split('T')[0];

  const s = useMemo(() => {
    // ── Utilizadores ──
    const totalUsers    = users.length;
    const activeUsers   = users.filter(u => u.status === 'ativo').length;
    const adminUsers    = users.filter(u => u.role === 'admin').length;
    const clientUsers   = users.filter(u => u.role === 'client').length;
    const pendentUsers  = users.filter(u => u.status === 'pendente').length;

    // ── Alugueres ──
    const aluguerRes       = reservations.filter(r => aluguerIds.has(r.vehicleId));
    const aluguerAtivos    = aluguerRes.filter(r => r.status === 'ativa').length;
    const aluguerPendentes = aluguerRes.filter(r => r.status === 'pendente').length;
    const aluguerConfirm   = aluguerRes.filter(r => r.status === 'confirmada').length;
    const aluguerProntos   = aluguerRes.filter(r => r.status === 'pronta_levantamento').length;
    const aluguerAtraso    = aluguerRes.filter(r => r.status === 'ativa' && r.dataFim < today).length;
    const devolvemHoje     = aluguerRes.filter(r => r.status === 'ativa' && r.dataFim === today).length;
    const devolucaoPend    = aluguerRes.filter(r => r.status === 'devolucao_pendente').length;

    // ── Compras ──
    const compraRes        = reservations.filter(r => compraIds.has(r.vehicleId));
    const compraPendentes  = compraRes.filter(r => r.status === 'pendente').length;
    const compraAprovadas  = compraRes.filter(r => r.status === 'compra_aprovada').length;
    const compraEmPrest    = compraRes.filter(r => r.status === 'em_prestacao').length;
    const compraAtraso     = compraRes.filter(r => r.status === 'prestacao_atraso').length;
    const compraAtivas     = compraPendentes + compraAprovadas + compraEmPrest + compraAtraso;

    // ── Frota ──
    const totalVeiculos  = vehicles.length;
    const totalAluguer   = vehicles.filter(v => v.mode === 'aluguer').length;
    const totalCompra    = vehicles.filter(v => v.mode === 'compra').length;
    const disponíveis    = vehicles.filter(v => v.available !== false).length;

    // ── Motoristas ──
    const totalMotoristas = motoristas.length;
    const motorDisp       = motoristas.filter(m => m.status === 'disponivel').length;
    const motorOcupado    = motoristas.filter(m => m.status === 'em_viagem' || m.status === 'ocupado').length;
    const motorIndisp     = motoristas.filter(m => m.status === 'indisponivel').length;

    // ── Visitantes ──
    const totalGuests   = guests.length;
    const guestsPend    = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;
    const guestsAprov   = guests.filter(g => g.status === 'aprovado').length;
    const guestsRej     = guests.filter(g => g.status === 'rejeitado').length;

    // ── Xitique ──
    const gruposAbertos  = grupos.filter(g => g.estadoGrupo === 'Aberto').length;
    const gruposAtivos   = grupos.filter(g => g.estadoGrupo === 'EmAndamento').length;
    const inscricoesAprov = inscricoes.filter(i => i.status === 'aprovado').length;
    const inscricoesPend  = inscricoes.filter(i => i.status === 'aguarda_validacao').length;

    return {
      totalUsers, activeUsers, adminUsers, clientUsers, pendentUsers,
      aluguerAtivos, aluguerPendentes, aluguerConfirm, aluguerProntos,
      aluguerAtraso, devolvemHoje, devolucaoPend,
      compraPendentes, compraAprovadas, compraEmPrest, compraAtraso, compraAtivas,
      totalVeiculos, totalAluguer, totalCompra, disponíveis,
      totalMotoristas, motorDisp, motorOcupado, motorIndisp,
      totalGuests, guestsPend, guestsAprov, guestsRej,
      gruposAbertos, gruposAtivos, inscricoesAprov, inscricoesPend,
    };
  }, [users, motoristas, guests, reservations, vehicles, grupos, inscricoes, today]);

  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Resumo do estado actual do sistema</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Utilizadores */}
          <DetailCard
            icon={<IconUsers size={18} />}
            iconColor="text-zinc-400"
            label="Utilizadores"
            value={s.activeUsers}
            valueColor="text-white"
            accent={s.pendentUsers > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/utilizadores')}
            items={[
              { label: 'Total registados', value: s.totalUsers, color: 'text-zinc-300' },
              { label: 'Administradores',  value: s.adminUsers,  color: 'text-amber-400',   dot: 'bg-amber-400' },
              { label: 'Clientes',         value: s.clientUsers, color: 'text-blue-400',    dot: 'bg-blue-400' },
              ...(s.pendentUsers > 0 ? [{ label: 'Pendentes activação', value: s.pendentUsers, color: 'text-red-400', dot: 'bg-red-400' }] : []),
            ]}
          />

          {/* Alugueres */}
          <DetailCard
            icon={<IconCar size={18} />}
            iconColor="text-amber-400"
            label="Alugueres Activos"
            value={s.aluguerAtivos}
            valueColor="text-amber-400"
            accent={s.aluguerAtraso > 0 ? 'border-red-500/40' : s.aluguerPendentes > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/aluguer?tab=acoes')}
            items={[
              { label: 'Pendentes confirmação',    value: s.aluguerPendentes, color: s.aluguerPendentes > 0 ? 'text-amber-400' : 'text-zinc-500', dot: s.aluguerPendentes > 0 ? 'bg-amber-400' : 'bg-zinc-700' },
              { label: 'Prontas p/ levantamento',  value: s.aluguerProntos,   color: s.aluguerProntos > 0 ? 'text-sky-400' : 'text-zinc-500',    dot: s.aluguerProntos > 0 ? 'bg-sky-400' : 'bg-zinc-700' },
              { label: 'Devolvem hoje',            value: s.devolvemHoje,     color: s.devolvemHoje > 0 ? 'text-emerald-400' : 'text-zinc-500',  dot: s.devolvemHoje > 0 ? 'bg-emerald-400' : 'bg-zinc-700' },
              { label: 'Em atraso',                value: s.aluguerAtraso,    color: s.aluguerAtraso > 0 ? 'text-red-400' : 'text-zinc-500',     dot: s.aluguerAtraso > 0 ? 'bg-red-500' : 'bg-zinc-700' },
              { label: 'Devolução pendente',       value: s.devolucaoPend,    color: s.devolucaoPend > 0 ? 'text-orange-400' : 'text-zinc-500',  dot: s.devolucaoPend > 0 ? 'bg-orange-400' : 'bg-zinc-700' },
            ]}
          />

          {/* Compras */}
          <DetailCard
            icon={<IconTag size={18} />}
            iconColor="text-blue-400"
            label="Compras em Curso"
            value={s.compraAtivas}
            valueColor="text-blue-400"
            accent={s.compraAtraso > 0 ? 'border-red-500/40' : 'border-zinc-800'}
            onClick={() => navigate('/admin/compra?tab=acoes')}
            items={[
              { label: 'Pendentes aprovação',   value: s.compraPendentes, color: s.compraPendentes > 0 ? 'text-amber-400' : 'text-zinc-500', dot: s.compraPendentes > 0 ? 'bg-amber-400' : 'bg-zinc-700' },
              { label: 'Aprovadas',             value: s.compraAprovadas, color: s.compraAprovadas > 0 ? 'text-teal-400' : 'text-zinc-500',  dot: s.compraAprovadas > 0 ? 'bg-teal-400' : 'bg-zinc-700' },
              { label: 'Em prestações',         value: s.compraEmPrest,   color: s.compraEmPrest > 0 ? 'text-blue-400' : 'text-zinc-500',    dot: s.compraEmPrest > 0 ? 'bg-blue-400' : 'bg-zinc-700' },
              { label: 'Prestação em atraso',   value: s.compraAtraso,    color: s.compraAtraso > 0 ? 'text-red-400' : 'text-zinc-500',      dot: s.compraAtraso > 0 ? 'bg-red-500' : 'bg-zinc-700' },
            ]}
          />

          {/* Frota */}
          <DetailCard
            icon={<IconFleet size={18} />}
            iconColor="text-sky-400"
            label="Frota"
            value={s.totalVeiculos}
            valueColor="text-sky-400"
            accent="border-zinc-800"
            onClick={() => navigate('/admin/veiculos')}
            bar={{ value: s.disponíveis, max: s.totalVeiculos, color: 'bg-sky-500' }}
            items={[
              { label: 'Disponíveis',         value: `${s.disponíveis} / ${s.totalVeiculos}`, color: 'text-sky-400',    dot: 'bg-sky-400' },
              { label: 'Para aluguer',        value: s.totalAluguer,   color: 'text-amber-400',  dot: 'bg-amber-400' },
              { label: 'Para compra',         value: s.totalCompra,    color: 'text-purple-400', dot: 'bg-purple-400' },
            ]}
          />

          {/* Motoristas */}
          <DetailCard
            icon={<IconSteering size={18} />}
            iconColor="text-blue-400"
            label="Motoristas"
            value={`${s.motorDisp} / ${s.totalMotoristas}`}
            valueColor="text-blue-400"
            accent="border-zinc-800"
            bar={{ value: s.motorDisp, max: s.totalMotoristas, color: 'bg-blue-500' }}
            items={[
              { label: 'Disponíveis',    value: s.motorDisp,    color: s.motorDisp > 0 ? 'text-emerald-400' : 'text-zinc-500',  dot: s.motorDisp > 0 ? 'bg-emerald-400' : 'bg-zinc-700' },
              { label: 'Em viagem',      value: s.motorOcupado, color: s.motorOcupado > 0 ? 'text-amber-400' : 'text-zinc-500', dot: s.motorOcupado > 0 ? 'bg-amber-400' : 'bg-zinc-700' },
              { label: 'Indisponíveis',  value: s.motorIndisp,  color: s.motorIndisp > 0 ? 'text-red-400' : 'text-zinc-500',   dot: s.motorIndisp > 0 ? 'bg-red-400' : 'bg-zinc-700' },
            ]}
          />

          {/* Xitique */}
          <DetailCard
            icon={<IconWallet size={18} />}
            iconColor="text-emerald-400"
            label="Xitique"
            value={s.gruposAtivos + s.gruposAbertos}
            valueColor="text-emerald-400"
            accent={s.inscricoesPend > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/xitique')}
            items={[
              { label: 'Grupos abertos',       value: s.gruposAbertos,   color: s.gruposAbertos > 0 ? 'text-blue-400' : 'text-zinc-500',    dot: s.gruposAbertos > 0 ? 'bg-blue-400' : 'bg-zinc-700' },
              { label: 'Grupos em andamento',  value: s.gruposAtivos,    color: s.gruposAtivos > 0 ? 'text-emerald-400' : 'text-zinc-500',  dot: s.gruposAtivos > 0 ? 'bg-emerald-400' : 'bg-zinc-700' },
              { label: 'Membros activos',      value: s.inscricoesAprov, color: 'text-zinc-300',  dot: 'bg-zinc-600' },
              ...(s.inscricoesPend > 0 ? [{ label: 'Inscrições pendentes', value: s.inscricoesPend, color: 'text-amber-400', dot: 'bg-amber-400' }] : []),
            ]}
          />

        </div>

        {/* Ações necessárias */}
        <AcoesNecessarias />

      </div>
    </div>
  );
}
