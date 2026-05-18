import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { User } from '../types/user';
import { useAuth } from './AuthContext';

interface UsersContextType {
  users: User[];
  addUser: (user: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getUser: (id: string) => User | undefined;
}

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const { allUsers, addUser, updateUser, deleteUser, user: authUser } = useAuth();

  const canAccessUser = (id: string) => {
    if (!authUser) return false;
    if (authUser.role === 'admin') return true;
    return authUser.id === id;
  };

  const visibleUsers = useMemo(() => {
    if (!authUser) return [];
    if (authUser.role === 'admin') return allUsers;
    return allUsers.filter(u => u.id === authUser.id);
  }, [allUsers, authUser]);

  const getUser = (id: string) => {
    if (!canAccessUser(id)) return undefined;
    return allUsers.find(u => u.id === id);
  };

  return (
    <UsersContext.Provider value={{ users: visibleUsers, addUser, updateUser, deleteUser, getUser }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
}
