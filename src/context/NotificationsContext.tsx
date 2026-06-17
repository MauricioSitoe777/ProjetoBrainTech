import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  userId: string; // 'admin' ou ID do cliente
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
  reservationId?: string;
  link?: string; // path para navegar ao clicar
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
  // Toast layer
  toasts: Toast[];
  showToast: (title: string, message: string, type?: AppNotification['type'], link?: string) => void;
  dismissToast: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const TOAST_DURATION = 4500;
const TOAST_LEAVE    = 300;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('rentcar:notifications:v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  // IDs já mostrados como toast nesta sessão (evita duplicados)
  const shownToastIds = useRef(new Set<string>());

  useEffect(() => {
    localStorage.setItem('rentcar:notifications:v1', JSON.stringify(allNotifications));
  }, [allNotifications]);

  // Filtrar as notificações pertencentes ao utilizador atual
  const notifications = allNotifications.filter(n => {
    if (!user) return false;
    if (user.role === 'admin') {
      return n.userId === 'admin';
    } else {
      return n.userId === user.id;
    }
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

  // Ref estável para usar dentro de timeouts sem criar dependências circulares
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // Ao fazer login: mostrar toasts das notificações não lidas pendentes (máx. 3)
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
        shownToastIds.current.add(n.id);
      }, i * 700);
    });
  // Só re-executa quando o utilizador muda (login/logout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addNotification = useCallback((
    userId: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    reservationId?: string,
    link?: string
  ) => {
    const newNotif: AppNotification = {
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      reservationId,
      link,
    };
    setAllNotifications(prev => {
      const recent = prev[0];
      if (recent && recent.title === title && recent.message === message &&
          Date.now() - new Date(recent.createdAt).getTime() < 2000) {
        return prev;
      }
      return [newNotif, ...prev];
    });
    // Só mostra toast se a notificação for para o utilizador actualmente logado
    const isForCurrentUser = user?.role === 'admin'
      ? userId === 'admin'
      : userId === user?.id;
    if (isForCurrentUser) {
      showToast(title, message, type, link);
      shownToastIds.current.add(newNotif.id);
    }
  }, [user, showToast]);

  const markAsRead = (id: string) => {
    setAllNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setAllNotifications(prev =>
      prev.map(n => {
        const isForCurrentUser = user?.role === 'admin' ? n.userId === 'admin' : n.userId === user?.id;
        if (isForCurrentUser) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const clearNotifications = () => {
    setAllNotifications(prev =>
      prev.filter(n => {
        const isForCurrentUser = user?.role === 'admin' ? n.userId === 'admin' : n.userId === user?.id;
        return !isForCurrentUser;
      })
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
