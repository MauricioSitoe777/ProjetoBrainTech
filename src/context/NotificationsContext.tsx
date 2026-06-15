import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (userId: string, title: string, message: string, type?: AppNotification['type'], reservationId?: string, link?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('rentcar:notifications:v1');
    return saved ? JSON.parse(saved) : [];
  });

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

  const addNotification = (
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
    setAllNotifications(prev => [newNotif, ...prev]);
  };

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
