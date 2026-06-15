import { useMemo } from 'react';
import { useUsers } from '../context/UsersContext';
import { useMotoristas } from '../context/MotoristasContext';
import { useGuests } from '../context/GuestsContext';
import { useReservations } from '../context/ReservationsContext';
import { AcoesNecessarias } from '../components/AcoesNecessarias';
import { useRoute } from '../hooks/useRoute';
import { VEHICLES } from '../data/constants';

const compraIds = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));

export function DashboardPage() {
  const { users } = useUsers();
  const { motoristas } = useMotoristas();
  const { guests } = useGuests();
  const { reservations } = useReservations();
  const { navigate } = useRoute();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeUsers    = users.filter(u => !u.xitique && u.status === 'ativo').length;
    const aluguerAtivos  = reservations.filter(r => !compraIds.has(r.vehicleId) && r.status === 'ativa').length;
    const pendingGuests  = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;
    const motorDisp      = motoristas.filter(m => m.status === 'disponivel').length;
    const devolvemHoje   = reservations.filter(r => !compraIds.has(r.vehicleId) && r.status === 'ativa' && r.dataFim === today).length;
    const aluguerPend    = reservations.filter(r => !compraIds.has(r.vehicleId) && r.status === 'pendente').length;
    return { activeUsers, aluguerAtivos, pendingGuests, motorDisp, devolvemHoje, aluguerPend };
  }, [users, motoristas, guests, reservations]);

  const quickNav = [
    { label: 'Aluguer',    path: '/admin/aluguer',    color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
    { label: 'Compra',     path: '/admin/compra',     color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
    { label: 'Xitique',    path: '/admin/xitique',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    { label: 'Relatórios', path: '/admin/financas',   color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20' },
    { label: 'Veículos',   path: '/admin/veiculos',   color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/20' },
    { label: 'Utilizadores', path: '/admin/utilizadores', color: 'text-white', bg: 'bg-zinc-700/30', border: 'border-zinc-700' },
  ];

  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-white text-sm mt-1">Resumo do estado actual do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Utilizadores ativos"  value={stats.activeUsers}  color="text-white" />
          <StatCard label="Alugueres ativos"      value={stats.aluguerAtivos} color="text-amber-400"
            sub={stats.devolvemHoje > 0 ? `${stats.devolvemHoje} devolvem hoje` : undefined} />
          <StatCard label="Pendentes de conf."    value={stats.aluguerPend}  color="text-red-400" />
          <StatCard label="Visitantes pendentes"  value={stats.pendingGuests} color="text-purple-400"
            onClick={stats.pendingGuests > 0 ? () => navigate('/admin/visitantes/pendentes') : undefined} />
          <StatCard label="Motoristas disponíveis" value={stats.motorDisp}  color="text-blue-400" />
          <StatCard label="Total motoristas"       value={motoristas.length} color="text-white" />
        </div>

        {/* Ações necessárias */}
        <AcoesNecessarias />

        {/* Acesso rápido */}
        <div>
          <p className="text-xs font-black text-white uppercase tracking-widest mb-3">Acesso rápido</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickNav.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${n.bg} ${n.border} hover:brightness-125 transition-all`}>
                <span className={`text-sm font-bold ${n.color}`}>{n.label}</span>
                <svg className={`ml-auto w-4 h-4 ${n.color} opacity-60`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub, onClick }: {
  label: string;
  value: number;
  color: string;
  sub?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left ${onClick ? 'hover:border-zinc-700 transition-colors cursor-pointer' : ''}`}
    >
      <p className="text-xs text-white font-medium">{label}</p>
      <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-white mt-1">{sub}</p>}
    </Tag>
  );
}
