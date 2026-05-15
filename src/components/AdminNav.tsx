import { useAuth } from '../context/AuthContext';
import { useRoute } from '../hooks/useRoute';

const roleConfig = {
  admin: { label: 'Admin', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
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

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
                <rect x="9" y="11" width="14" height="10" rx="2"/>
                <circle cx="12" cy="16" r="1"/>
                <circle cx="20" cy="16" r="1"/>
              </svg>
            </div>
            <span className="font-black text-white tracking-tight shrink-0" style={{ fontFamily: "'Archivo', sans-serif" }}>
              Rent<span className="text-amber-500">Car</span>
            </span>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="text-sm text-zinc-400 truncate hidden sm:inline">{subtitle}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-zinc-400 hidden md:block">{authUser?.nome}</span>
            <span className={`text-xs border rounded-md px-2 py-0.5 ${roleConfig[authUser?.role || 'cliente'].className}`}>
              {roleConfig[authUser?.role || 'cliente'].label}
            </span>
            {onExit && (
              <button
                onClick={onExit}
                className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm flex items-center gap-1"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                <span className="hidden sm:inline">Site</span>
              </button>
            )}
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={logout} className="text-zinc-400 hover:text-white transition-colors text-sm">
              Sair
            </button>
          </div>
        </div>
        {authUser?.role === 'admin' && (
          <div className="flex gap-1 pb-3 -mt-1">
            <button
              onClick={() => navigate('/admin')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                !isReservas ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Utilizadores
            </button>
            <button
              onClick={() => navigate('/admin/reservas')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                isReservas ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Reservas &amp; Disponibilidade
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
