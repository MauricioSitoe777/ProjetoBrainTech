import { useRoute } from '../hooks/useRoute';
import { useGuests } from '../context/GuestsContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose?: () => void;
  onExit?: () => void;
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

export function AdminSidebar({ onClose, onExit }: Props) {
  const { path, navigate } = useRoute();
  const { guests } = useGuests();
  const { logout } = useAuth();

  const pendingCount = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;

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
        />

        <div className="my-1.5 h-px bg-zinc-800/80" />

        <NavLink
          active={isSectionActive('/admin/aluguer')}
          onClick={() => go('/admin/aluguer')}
          label="Aluguer"
          icon={<Icon d="M1 3h15v13H1z" d2="M16 8h4l3 3v5h-7V8z" extra="M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />}
        />
        <NavLink
          active={isSectionActive('/admin/compra')}
          onClick={() => go('/admin/compra')}
          label="Compra"
          icon={<Icon d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" d2="M3 6h18M16 10a4 4 0 0 1-8 0" />}
        />
        <NavLink
          active={isSectionActive('/admin/xitique')}
          onClick={() => go('/admin/xitique')}
          label="Xitique"
          icon={<Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" d2="M12 6v6l4 2" />}
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

      </nav>

      {/* ── Fundo: voltar ao site + logout ─────────────────── */}
      <div className="border-t border-zinc-800 px-3 py-4 shrink-0 flex flex-col gap-2">
        {onExit && (
          <button
            onClick={onExit}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors font-medium"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            <span>Voltar ao Site</span>
          </button>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 hover:text-red-300 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavLink({ active, onClick, label, icon, badge }: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
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
        <span className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-black px-1">
          {badge}
        </span>
      )}
    </button>
  );
}
