import { useMemo } from 'react';
import { useRoute } from '../hooks/useRoute';
import { useAuth } from '../context/AuthContext';
import { useGuests } from '../context/GuestsContext';
import { useNotifications } from '../context/NotificationsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';

function getInitials(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

interface Props {
  onClose?: () => void;
}

function Icon({ d, d2, extra }: { d: string; d2?: string; extra?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
      {d2 && <path d={d2} />}
      {extra && <path d={extra} />}
    </svg>
  );
}

const ALUGUER_INACTIVE = new Set(['cancelada', 'concluida']);
const COMPRA_INACTIVE  = new Set(['cancelada', 'concluida', 'liquidada']);
const ALUGUER_URGENT   = new Set(['pendente', 'devolucao_pendente']);
const COMPRA_URGENT    = new Set(['pendente', 'prestacao_atraso']);

export function AdminSidebar({ onClose }: Props) {
  const { path, navigate } = useRoute();
  const { user, allUsers, logout } = useAuth();
  const { guests } = useGuests();
  const { unreadCount } = useNotifications();
  const { reservations } = useReservations();
  const { vehicles: allVehicles } = useVehicles();
  const { grupos, inscricoes } = useXitique();

  const fullUser = user ? allUsers.find(u => u.id === user.id) : null;

  const pendingCount = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;

  // IDs dinâmicos dos veículos por modo
  const aluguerIds = useMemo(
    () => new Set(allVehicles.filter(v => v.mode === 'aluguer').map(v => v.id)),
    [allVehicles],
  );
  const compraIds = useMemo(
    () => new Set(allVehicles.filter(v => v.mode === 'compra').map(v => v.id)),
    [allVehicles],
  );

  // Contadores de acções pendentes
  const aluguerPending = useMemo(
    () => reservations.filter(r => aluguerIds.has(r.vehicleId) && !ALUGUER_INACTIVE.has(r.status)).length,
    [reservations, aluguerIds],
  );
  const compraPending = useMemo(
    () => reservations.filter(r => compraIds.has(r.vehicleId) && !COMPRA_INACTIVE.has(r.status)).length,
    [reservations, compraIds],
  );
  const aluguerUrgent = useMemo(
    () => reservations.some(r => aluguerIds.has(r.vehicleId) && ALUGUER_URGENT.has(r.status)),
    [reservations, aluguerIds],
  );
  const compraUrgent = useMemo(
    () => reservations.some(r => compraIds.has(r.vehicleId) && COMPRA_URGENT.has(r.status)),
    [reservations, compraIds],
  );

  // Xitique: inscrições a aguardar validação + membros com estado Pendente
  const xitiquePending = useMemo(() => {
    const inscPendentes = inscricoes.filter(i => i.status === 'aguarda_validacao').length;
    const membrosPendentes = grupos.reduce(
      (sum, g) => sum + g.membros.filter(m => m.estado === 'Pendente').length,
      0,
    );
    return inscPendentes + membrosPendentes;
  }, [inscricoes, grupos]);

  const go = (to: string) => {
    navigate(to);
    onClose?.();
  };

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return path === '/admin' || path === '/admin/dashboard';
    return path === href;
  };

  const isSectionActive = (prefix: string) => path.startsWith(prefix);

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">

      {/* ── Navegação ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">

        <NavLink
          active={isActive('/admin/dashboard')}
          onClick={() => go('/admin/dashboard')}
          label="Painel"
          icon={<Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10" />}
        />

        <div className="my-1.5 h-px bg-zinc-800/80" />

        <NavLink
          active={isSectionActive('/admin/utilizadores')}
          onClick={() => go('/admin/utilizadores')}
          label="Utilizadores"
          icon={<Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" d2="M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />}
        />

        <NavLink
          active={isSectionActive('/admin/visitantes')}
          onClick={() => go('/admin/visitantes')}
          label="Visitantes"
          icon={<Icon d="M20 21v-2a4 4 0 0 0-3-3.87" d2="M4 21v-2a4 4 0 0 1 3-3.87M16 3.13a4 4 0 0 1 0 7.75M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />}
          badge={pendingCount > 0 ? pendingCount : undefined}
          urgent={pendingCount > 0}
        />

        <div className="my-1.5 h-px bg-zinc-800/80" />

        <NavLink
          active={isSectionActive('/admin/aluguer')}
          onClick={() => go('/admin/aluguer')}
          label="Aluguer"
          icon={<Icon d="M1 3h15v13H1z" d2="M16 8h4l3 3v5h-7V8z" extra="M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />}
          badge={aluguerPending > 0 ? aluguerPending : undefined}
          urgent={aluguerUrgent}
        />
        <NavLink
          active={isSectionActive('/admin/compra')}
          onClick={() => go('/admin/compra')}
          label="Compra"
          icon={<Icon d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" d2="M3 6h18M16 10a4 4 0 0 1-8 0" />}
          badge={compraPending > 0 ? compraPending : undefined}
          urgent={compraUrgent}
        />
        <NavLink
          active={isSectionActive('/admin/xitique')}
          onClick={() => go('/admin/xitique')}
          label="Xitique"
          icon={<Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" d2="M12 6v6l4 2" />}
          badge={xitiquePending > 0 ? xitiquePending : undefined}
          urgent={xitiquePending > 0}
        />
        <NavLink
          active={isSectionActive('/admin/financas')}
          onClick={() => go('/admin/financas')}
          label="Relatórios"
          icon={<Icon d="M18 20V10M12 20V4M6 20v-6" />}
        />
        <NavLink
          active={isSectionActive('/admin/veiculos')}
          onClick={() => go('/admin/veiculos')}
          label="Veículos"
          icon={<Icon d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" d2="M14 17h1a2 2 0 0 0 0-4h-1v4zM9 17v-5.34A5 5 0 0 1 14 17" extra="M17 17m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />}
        />

        <div className="my-1.5 h-px bg-zinc-800/80" />

        <NavLink
          active={isSectionActive('/admin/notificacoes')}
          onClick={() => go('/admin/notificacoes')}
          label="Notificações"
          icon={<Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />}
          badge={unreadCount > 0 ? unreadCount : undefined}
          urgent={unreadCount > 0}
        />

      </nav>

      {/* ── Perfil + Sair — apenas visível no drawer móvel ── */}
      {user && (
        <div className="md:hidden border-t border-zinc-800 p-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 min-w-0">
            {fullUser?.avatar ? (
              <img
                src={fullUser.avatar}
                alt={user.nome}
                className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/40 shrink-0"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">
                {getInitials(user.nome)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-bold leading-tight truncate">{user.nome}</p>
              <p className="text-amber-400 text-[10px]">Administrador</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); onClose?.(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair da conta
          </button>
        </div>
      )}

    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavLink({ active, onClick, label, icon, badge, urgent }: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-amber-500/15 text-amber-400 font-bold'
          : 'text-white hover:bg-zinc-800 font-medium'
      }`}
    >
      <span className={active ? 'text-amber-400' : 'text-white'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-black px-1 transition-colors ${
          urgent
            ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
