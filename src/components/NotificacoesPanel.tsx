import { Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import type { AppNotification } from '../context/NotificationsContext';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

const TYPE_META: Record<AppNotification['type'], { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  info:    { icon: <Info size={14} />,           bg: 'bg-amber-400/10',   text: 'text-amber-400',   border: 'border-amber-400/20' },
  success: { icon: <CheckCircle size={14} />,    bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
  warning: { icon: <AlertTriangle size={14} />,  bg: 'bg-amber-400/10',   text: 'text-amber-400',   border: 'border-amber-400/20' },
  alert:   { icon: <AlertOctagon size={14} />,   bg: 'bg-red-400/10',     text: 'text-red-400',     border: 'border-red-400/20' },
};

export function NotificacoesPanel() {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-black text-lg">Notificações</h2>
          <p className="text-xs text-white mt-0.5">
            {unread > 0 ? `${unread} não lida${unread !== 1 ? 's' : ''}` : 'Tudo lido'}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
              >
                <CheckCheck size={12} /> Marcar lidas
              </button>
            )}
            <button
              onClick={clearNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={12} /> Limpar
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-14 text-center">
          <Bell size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Sem notificações</p>
          <p className="text-xs text-white mt-1">Novas notificações aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {notifications.map(n => {
            const meta = TYPE_META[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${n.read ? '' : 'bg-zinc-800/25'}`}
              >
                <div className={`w-8 h-8 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5 ${meta.text}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-bold leading-snug ${n.read ? 'text-white' : 'text-white'}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-[11px] text-white mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-white mt-1.5">{fmtTime(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="shrink-0 text-[10px] font-bold text-white hover:text-amber-400 transition-colors mt-1 px-1"
                    title="Marcar como lida"
                  >
                    ✓
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
