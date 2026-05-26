import { useAuth } from '../context/AuthContext';
import { useRoute } from '../hooks/useRoute';
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './BrandLogo';

const roleConfig = {
  admin: { label: 'Administrador', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  cliente: { label: 'Cliente', className: 'bg-zinc-700 text-zinc-300 border-zinc-600' },
};

interface AdminNavProps {
  subtitle: string;
  onExit?: () => void;
}

export function AdminNav({ subtitle, onExit }: AdminNavProps) {
  const { user: authUser, logout } = useAuth();
  const { path, navigate } = useRoute();
  const isReservas = path.startsWith('/admin/reservas');
  const isVeiculos = path.startsWith('/admin/veiculos');
  const isUsers = !isReservas && !isVeiculos;

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo className="h-10 w-auto max-w-[140px] shrink-0" />
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="text-sm text-white truncate hidden sm:inline">{subtitle}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-white hidden md:block">{authUser?.nome}</span>
            <span className={`text-xs border rounded-md px-2 py-0.5 ${roleConfig[authUser?.role || 'cliente'].className}`}>
              {roleConfig[authUser?.role || 'cliente'].label}
            </span>
            {onExit && (
              <button
                onClick={onExit}
                className="text-zinc-200 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                <span className="hidden sm:inline">Site</span>
              </button>
            )}
            <div className="w-px h-4 bg-zinc-800" />
            <NotificationBell />
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={logout} className="text-white hover:text-amber-400 transition-colors text-sm">
              Sair
            </button>
          </div>
        </div>
        {authUser?.role === 'admin' && (
          <div className="flex gap-1 pb-3 -mt-1">
            <button
              onClick={() => navigate('/admin')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                isUsers ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Utilizadores
            </button>
            <button
              onClick={() => navigate('/admin/reservas')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                isReservas ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Reservas &amp; Disponibilidade
            </button>
            <button
              onClick={() => navigate('/admin/veiculos')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                isVeiculos ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Veículos
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
