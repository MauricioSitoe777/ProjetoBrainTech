import type { ReactElement } from 'react';
import { useNotifications, type Toast, type AppNotification } from '../context/NotificationsContext';
import { useRoute } from '../hooks/useRoute';

const TYPE_STYLES: Record<AppNotification['type'], { bar: string; icon: string; iconEl: ReactElement }> = {
  success: {
    bar:    'bg-emerald-500',
    icon:   'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    iconEl: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  warning: {
    bar:    'bg-amber-500',
    icon:   'bg-amber-500/15 border-amber-500/30 text-amber-400',
    iconEl: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  alert: {
    bar:    'bg-red-500',
    icon:   'bg-red-500/15 border-red-500/30 text-red-400',
    iconEl: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  info: {
    bar:    'bg-blue-500',
    icon:   'bg-blue-500/15 border-blue-500/30 text-blue-400',
    iconEl: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
};

function ToastItem({
  toast,
  onDismiss,
  onNavigate,
}: {
  toast: Toast;
  onDismiss: () => void;
  onNavigate: (link: string) => void;
}) {
  const s = TYPE_STYLES[toast.type];
  const hasLink = !!toast.link;

  const handleClick = () => {
    if (toast.link) {
      onNavigate(toast.link);
      onDismiss();
    }
  };

  return (
    <div
      onClick={hasLink ? handleClick : undefined}
      className={`${toast.leaving ? 'toast-out' : 'toast-in'} relative flex gap-3 w-full max-w-sm bg-zinc-900 border border-amber-500/20 rounded-xl shadow-2xl overflow-hidden pointer-events-auto ${hasLink ? 'cursor-pointer hover:border-zinc-600 active:scale-[0.98] transition-all' : ''}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />

      <div className="flex gap-3 items-start px-4 py-3 pl-5 w-full">
        {/* Icon */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${s.icon}`}>
          {s.iconEl}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words">{toast.message}</p>
          {hasLink && (
            <p className="text-[10px] text-amber-400 font-bold mt-1">Toque para ver →</p>
          )}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="shrink-0 mt-0.5 text-zinc-500 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${s.bar} opacity-40 toast-progress`} />
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  const { navigate } = useRoute();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[300] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '24rem' }}>
      {toasts.map(t => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => dismissToast(t.id)}
          onNavigate={navigate}
        />
      ))}
    </div>
  );
}
