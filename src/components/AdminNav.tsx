import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { AdminSidebar } from './AdminSidebar';
import { BrandLogo } from './BrandLogo';

const roleConfig = {
  admin:   { label: 'Administrador', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  cliente: { label: 'Cliente',       className: 'bg-zinc-700 text-white border-zinc-600' },
};

interface AdminNavProps {
  onExit?: () => void;
}

export function AdminNav({ onExit }: AdminNavProps) {
  const { user: authUser, allUsers } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fullUser = authUser ? allUsers.find(u => u.id === authUser.id) : null;
  const initials = authUser?.nome
    ? authUser.nome.trim().split(/\s+/).map(n => n[0].toUpperCase()).slice(0, 2).join('')
    : '?';

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0">

        {/* Esquerda: hamburger (mobile) + logótipo */}
        <div className="flex items-center gap-3">
          {authUser?.role === 'admin' && (
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors shrink-0"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <BrandLogo className="h-8 w-auto max-w-[120px]" />
        </div>

        {/* Direita: role badge + notificações + avatar */}
        <div className="flex items-center gap-3 ml-auto">

          <span className={`text-xs border rounded-md px-2 py-0.5 hidden sm:inline ${roleConfig[authUser?.role || 'cliente'].className}`}>
            {roleConfig[authUser?.role || 'cliente'].label}
          </span>

          <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

          <NotificationBell />

          <div className="w-px h-4 bg-zinc-800" />

          {/* Avatar — foto ou iniciais */}
          {fullUser?.avatar ? (
            <img
              src={fullUser.avatar}
              alt={authUser?.nome}
              className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/50 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center shrink-0">
              <span className="text-amber-400 text-[11px] font-black leading-none">{initials}</span>
            </div>
          )}

        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden">
            <AdminSidebar onClose={() => setDrawerOpen(false)} onExit={onExit} />
          </div>
        </>
      )}
    </>
  );
}
