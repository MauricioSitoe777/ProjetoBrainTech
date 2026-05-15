import { useAuth } from '../context/AuthContext';
import { useUsers } from '../context/UsersContext';
import { UserProfileContent } from '../components/UserProfileContent';

export function ClientProfilePage({ onExit }: { onExit?: () => void }) {
  const { user: authUser, logout } = useAuth();
  const { getUser } = useUsers();

  const profile = authUser ? getUser(authUser.id) : undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
                <rect x="9" y="11" width="14" height="10" rx="2"/>
                <circle cx="12" cy="16" r="1"/>
                <circle cx="20" cy="16" r="1"/>
              </svg>
            </div>
            <span className="font-black text-white tracking-tight" style={{ fontFamily: "'Archivo', sans-serif" }}>
              Rent<span className="text-amber-500">Car</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-sm text-zinc-400">A minha conta</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:block">{authUser?.nome}</span>
            {onExit && (
              <button
                onClick={onExit}
                className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm flex items-center gap-1"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Site
              </button>
            )}
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={logout} className="text-zinc-400 hover:text-white transition-colors text-sm">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {!profile ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
            Perfil não encontrado. Contacte o suporte.
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <UserProfileContent user={profile} showRole={false} />
          </div>
        )}
      </div>
    </div>
  );
}
