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
interface DetailCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  value: string | number;
  valueColor?: string;
  accent?: string;
  bar?: { value: number; max: number; color?: string };
  onClick?: () => void;
}

function DetailCard({ icon, iconColor = 'text-white', label, value, valueColor = 'text-white', accent = 'border-zinc-800', bar, onClick }: DetailCardProps) {
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
          <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider leading-tight">{label}</p>
        </div>
        {onClick && <IconChevronRight size={16} className="text-white group-hover:text-white transition-colors shrink-0 mt-0.5" />}
      </div>

      {/* Main value */}
      <p className={`text-4xl font-black leading-none ${valueColor}`}>{value}</p>

      {/* Progress bar */}
      {bar && <MiniBar value={bar.value} max={bar.max} color={bar.color} />}
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
      <div className="w-full px-5 sm:px-8 py-8 space-y-8">

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Utilizadores */}
          <DetailCard
            icon={<IconUsers size={18} />}
            iconColor="text-white"
            label="Pessoas com conta activa"
            value={s.activeUsers}
            valueColor="text-white"
            accent={s.pendentUsers > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/utilizadores')}
          />

          {/* Alugueres */}
          <DetailCard
            icon={<IconCar size={18} />}
            iconColor="text-amber-400"
            label="Carros alugados agora"
            value={s.aluguerAtivos}
            valueColor="text-amber-400"
            accent={s.aluguerAtraso > 0 ? 'border-red-500/40' : s.aluguerPendentes > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/aluguer?tab=acoes')}
          />

          {/* Compras */}
          <DetailCard
            icon={<IconTag size={18} />}
            iconColor="text-blue-400"
            label="Compras a decorrer"
            value={s.compraAtivas}
            valueColor="text-blue-400"
            accent={s.compraAtraso > 0 ? 'border-red-500/40' : 'border-zinc-800'}
            onClick={() => navigate('/admin/compra?tab=acoes')}
          />

          {/* Frota */}
          <DetailCard
            icon={<IconFleet size={18} />}
            iconColor="text-sky-400"
            label="Total de carros"
            value={s.totalVeiculos}
            valueColor="text-sky-400"
            accent="border-zinc-800"
            onClick={() => navigate('/admin/veiculos')}
            bar={{ value: s.disponíveis, max: s.totalVeiculos, color: 'bg-sky-500' }}
          />

          {/* Motoristas */}
          <DetailCard
            icon={<IconSteering size={18} />}
            iconColor="text-blue-400"
            label="Motoristas livres"
            value={`${s.motorDisp} / ${s.totalMotoristas}`}
            valueColor="text-blue-400"
            accent="border-zinc-800"
            bar={{ value: s.motorDisp, max: s.totalMotoristas, color: 'bg-blue-500' }}
          />

          {/* Xitique */}
          <DetailCard
            icon={<IconWallet size={18} />}
            iconColor="text-emerald-400"
            label="Grupos Xitique"
            value={s.gruposAtivos + s.gruposAbertos}
            valueColor="text-emerald-400"
            accent={s.inscricoesPend > 0 ? 'border-amber-500/30' : 'border-zinc-800'}
            onClick={() => navigate('/admin/xitique')}
          />

        </div>

        {/* Ações necessárias */}
        <AcoesNecessarias />

      </div>
    </div>
  );
}
