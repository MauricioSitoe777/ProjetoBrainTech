import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types/user';
import { mockUsers } from '../data/mockData';

interface UsersContextType {
  users: User[];
  addUser: (user: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getUser: (id: string) => User | undefined;
}

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(mockUsers);

  const addUser = (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString().split('T')[0],
      ultimoAcesso: new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <UsersContext.Provider value={{ users, addUser, updateUser, deleteUser, getUser }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
}
