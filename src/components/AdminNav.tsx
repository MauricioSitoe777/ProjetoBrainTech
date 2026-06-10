import { useAuth } from '../context/AuthContext';
import { useRoute } from '../hooks/useRoute';
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './BrandLogo';

const roleConfig = {
  admin: { label: 'Administrador', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  cliente: { label: 'Cliente', className: 'bg-zinc-700 text-white border-zinc-600' },
};

interface AdminNavProps {
  subtitle?: string;
  onExit?: () => void;
}

export function AdminNav({ subtitle: _subtitle, onExit }: AdminNavProps) {
  const { user: authUser, logout } = useAuth();
  const { path, navigate } = useRoute();
  const isAluguer   = path.startsWith('/admin/aluguer');
  const isCompra    = path.startsWith('/admin/compra');
  const isVeiculos  = path.startsWith('/admin/veiculos');
  const isXitique   = path.startsWith('/admin/xitique');
  const isFinancas  = path.startsWith('/admin/financas');
  const isUsers = !isAluguer && !isCompra && !isVeiculos && !isXitique && !isFinancas;

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
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
            <BrandLogo className="h-10 w-auto max-w-[140px] shrink-0" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-white hidden md:block">{authUser?.nome}</span>
            <span className={`text-xs border rounded-md px-2 py-0.5 ${roleConfig[authUser?.role || 'cliente'].className}`}>
              {roleConfig[authUser?.role || 'cliente'].label}
            </span>
            <div className="w-px h-4 bg-zinc-800" />
            <NotificationBell />
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={logout} className="text-white hover:text-amber-400 transition-colors text-sm">
              Logout
            </button>
          </div>
        </div>
        {authUser?.role === 'admin' && (
          <div className="flex gap-1.5 pb-3 -mt-1">
            <button
              onClick={() => navigate('/admin')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isUsers
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Utilizadores
            </button>
            <button
              onClick={() => navigate('/admin/aluguer')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isAluguer
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Aluguer
            </button>
            <button
              onClick={() => navigate('/admin/compra')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isCompra
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Compra
            </button>
            <button
              onClick={() => navigate('/admin/veiculos')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isVeiculos
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Veículos
            </button>
            <button
              onClick={() => navigate('/admin/xitique')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isXitique
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Xitique
            </button>
            <button
              onClick={() => navigate('/admin/financas')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 ${
                isFinancas
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Financeiro
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
