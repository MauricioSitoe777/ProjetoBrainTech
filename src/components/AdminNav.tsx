import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './BrandLogo';
import { AdminSidebar } from './AdminSidebar';

const roleConfig = {
  admin:   { label: 'Administrador', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  cliente: { label: 'Cliente',       className: 'bg-zinc-700 text-white border-zinc-600' },
};

interface AdminNavProps {
  subtitle?: string;
  onExit?: () => void;
}

export function AdminNav({ onExit }: AdminNavProps) {
  const { user: authUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — mobile only */}
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
          {onExit && (
            <button
              onClick={onExit}
              aria-label="Voltar"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-700 hover:border-amber-500 hover:text-amber-500 text-white transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          )}
          <BrandLogo className="h-8 w-auto max-w-[120px] shrink-0" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-white hidden md:block">{authUser?.nome}</span>
          <span className={`text-xs border rounded-md px-2 py-0.5 hidden sm:inline ${roleConfig[authUser?.role || 'cliente'].className}`}>
            {roleConfig[authUser?.role || 'cliente'].label}
          </span>
          <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
          <NotificationBell />
          <div className="w-px h-4 bg-zinc-800" />
          <button onClick={logout} className="text-white hover:text-amber-400 transition-colors text-sm font-medium">
            Sair
          </button>
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
            <AdminSidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
