import { useState, useRef, useEffect } from 'react';
import { useNotifications, type AppNotification } from '../context/NotificationsContext';
import { useRoute } from '../hooks/useRoute';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const { navigate } = useRoute();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifStyles = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          dot: 'bg-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        };
      case 'warning':
        return {
          dot: 'bg-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
        };
      case 'alert':
        return {
          dot: 'bg-red-500',
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
        };
      default:
        return {
          dot: 'bg-blue-500',
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHrs < 24) return `Há ${diffHrs} h`;
      return date.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div ref={containerRef} className="relative z-40">
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-white hover:bg-zinc-800 transition-all active:scale-95 relative cursor-pointer"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1 border border-zinc-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden dropdown-animate">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold border border-amber-500/20">
                  {unreadCount} novas
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-white hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Ler tudo
                </button>
                <button
                  onClick={clearNotifications}
                  className="text-[10px] text-white hover:text-red-400 font-semibold transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-zinc-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-800/30 flex items-center justify-center mb-3 border border-zinc-800/40 text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-xs text-white font-medium">Sem notificações</p>
                <p className="text-[10px] text-white mt-1 max-w-[200px]">
                  Atualizações sobre compras e alugueres pendentes aparecerão aqui.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const styles = getNotifStyles(n.type);
                const handleClick = () => {
                  markAsRead(n.id);
                  if (n.link) {
                    setIsOpen(false);
                    navigate(n.link);
                  }
                };
                return (
                  <div
                    key={n.id}
                    onClick={handleClick}
                    className={`p-4 text-left transition-colors relative hover:bg-zinc-800/30 cursor-pointer ${
                      !n.read ? 'bg-zinc-800/10' : ''
                    } ${n.link ? 'group' : ''}`}
                  >
                    {!n.read && (
                      <span className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    )}
                    {n.link && n.read && (
                      <svg className="absolute top-4 right-4 w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                    <div className="flex gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${styles.bg}`}>
                        {styles.icon}
                      </div>
                      <div className="space-y-1 min-w-0 pr-4">
                        <p className="text-xs font-bold text-white">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-white leading-relaxed break-words">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-zinc-500 font-medium">
                            {formatTime(n.createdAt)}
                          </p>
                          {n.link && (
                            <span className="text-[9px] text-zinc-500 group-hover:text-amber-400 font-semibold transition-colors">
                              Toque para ver →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
