import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export interface AppNotification {
  id: string;
  userId: string; // 'admin' ou ID do cliente
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
  reservationId?: string;
  link?: string;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: AppNotification['type'];
  link?: string;
  leaving?: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (userId: string, title: string, message: string, type?: AppNotification['type'], reservationId?: string, link?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  toasts: Toast[];
  showToast: (title: string, message: string, type?: AppNotification['type'], link?: string) => void;
  dismissToast: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const LS_KEY         = 'rentcar:notifications:v1';
const SHOWN_KEY      = 'rentcar:shown-toasts:v1';
const TOAST_DURATION = 4500;
const TOAST_LEAVE    = 300;

// API returns Portuguese field names; map to English frontend names
interface ApiNotification {
  id: string;
  userId: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link: string | null;
  createdAt: string;
}

function fromApi(n: ApiNotification): AppNotification {
  return {
    id:        n.id,
    userId:    n.userId === null ? 'admin' : n.userId,
    type:      n.tipo as AppNotification['type'],
    title:     n.titulo,
    message:   n.mensagem,
    read:      n.lida,
    link:      n.link ?? undefined,
    createdAt: n.createdAt,
  };
}

function toApiUserId(userId: string): number | null {
  if (userId === 'admin') return null;
  const n = parseInt(userId, 10);
  return isNaN(n) ? null : n;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const allNotificationsRef = useRef(allNotifications);
  useEffect(() => { allNotificationsRef.current = allNotifications; }, [allNotifications]);

  const shownToastIds = useRef(new Set<string>(
    (() => { try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]'); } catch { return []; } })()
  ));
  const markToastShown = (id: string) => {
    shownToastIds.current.add(id);
    try { localStorage.setItem(SHOWN_KEY, JSON.stringify([...shownToastIds.current])); } catch { /* ignore */ }
  };

  // Load from API on mount
  useEffect(() => {
    if (!user) return;
    api.get<ApiNotification[]>('/notifications').then(data => {
      const mapped = data.map(fromApi);
      setAllNotifications(mapped);
    }).catch(() => {});
  }, [user?.id]);

  // Keep localStorage in sync as cache
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(allNotifications));
  }, [allNotifications]);

  const notifications = allNotifications.filter(n => {
    if (!user) return false;
    if (user.role === 'admin') return n.userId === 'admin';
    return n.userId === user.id;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_LEAVE);
  }, []);

  const showToast = useCallback((title: string, message: string, type: AppNotification['type'] = 'info', link?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, title, message, type, link }]);
    setTimeout(() => dismissToast(id), TOAST_DURATION);
  }, [dismissToast]);

  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // Show pending unread toasts on login
  useEffect(() => {
    if (!user) return;
    const pending = allNotifications
      .filter(n => {
        const isForUser = user.role === 'admin' ? n.userId === 'admin' : n.userId === user.id;
        return isForUser && !n.read && !shownToastIds.current.has(n.id);
      })
      .slice(0, 3);

    pending.forEach((n, i) => {
      setTimeout(() => {
        showToastRef.current(n.title, n.message, n.type, n.link);
        markToastShown(n.id);
      }, i * 700);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addNotification = useCallback((
    userId: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    reservationId?: string,
    link?: string,
  ) => {
    const newNotif: AppNotification = {
      id:        `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      message,
      type,
      read:      false,
      createdAt: new Date().toISOString(),
      reservationId,
      link,
    };
    const isDuplicate = allNotificationsRef.current.some(n =>
      n.userId === userId && n.title === title && n.message === message
    );

    if (!isDuplicate) {
      setAllNotifications(prev => [newNotif, ...prev]);
      api.post<ApiNotification>('/notifications', {
        tipo:     type,
        titulo:   title,
        mensagem: message,
        link,
        user_id:  toApiUserId(userId),
      }).then(created => {
        // Replace temp ID with real DB ID
        setAllNotifications(prev => prev.map(n => n.id === newNotif.id ? fromApi(created) : n));
      }).catch(() => {});
    }

    const isForCurrentUser = user?.role === 'admin' ? userId === 'admin' : userId === user?.id;
    if (!isDuplicate && isForCurrentUser) {
      showToast(title, message, type, link);
      markToastShown(newNotif.id);
    }
  }, [user, showToast]);

  const markAsRead = (id: string) => {
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    api.put(`/notifications/${id}/read`, {}).catch(() => {});
  };

  const markAllAsRead = () => {
    setAllNotifications(prev => prev.map(n => {
      const isForCurrentUser = user?.role === 'admin' ? n.userId === 'admin' : n.userId === user?.id;
      return isForCurrentUser ? { ...n, read: true } : n;
    }));
    const query = user?.role !== 'admin' && user?.id ? `?user_id=${user.id}` : '';
    api.post(`/notifications/read-all${query}`, {}).catch(() => {});
  };

  const clearNotifications = () => {
    const toDelete = allNotifications.filter(n => {
      const isForCurrentUser = user?.role === 'admin' ? n.userId === 'admin' : n.userId === user?.id;
      return isForCurrentUser;
    });
    setAllNotifications(prev => prev.filter(n => !toDelete.some(d => d.id === n.id)));
    toDelete.forEach(n => api.delete(`/notifications/${n.id}`).catch(() => {}));
  };

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount,
      addNotification, markAsRead, markAllAsRead, clearNotifications,
      toasts, showToast, dismissToast,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
