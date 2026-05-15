import type { User } from '../types/user';
import { UserProfileContent } from './UserProfileContent';

interface UserDetailProps {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

export function UserDetail({ user, onClose, onEdit }: UserDetailProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-end p-4 border-b border-zinc-800 sm:hidden">
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <UserProfileContent user={user} />
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onEdit}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Editar utilizador
          </button>
        </div>
      </div>
    </div>
  );
}
