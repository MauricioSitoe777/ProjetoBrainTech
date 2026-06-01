import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser, User } from '../types/user';
import { mockUsers as initialMockUsers } from '../data/mockData';

interface AuthContextType {
  user: AuthUser | null;
  allUsers: User[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (user: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  addUser: (user: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  loginById: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Password default para o demo
const DEFAULT_PASSWORD = '123';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rentcar:users:v2');
    return saved ? JSON.parse(saved) : initialMockUsers;
  });

  useEffect(() => {
    localStorage.setItem('rentcar:users:v2', JSON.stringify(allUsers));
  }, [allUsers]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    
    // Procura em todos os utilizadores (existentes e novos)
    const foundUser = allUsers.find(u => u.email === email);
    
    // Usar senha própria se definida, caso contrário aceitar a senha demo
    const validPassword = foundUser?.password
      ? password === foundUser.password
      : password === DEFAULT_PASSWORD;
    if (foundUser && validPassword) {
      setUser({ id: foundUser.id, nome: foundUser.nome, email: foundUser.email, role: foundUser.role });
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const register = async (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    
    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`,
      dataCriacao: new Date().toISOString().split('T')[0],
      ultimoAcesso: new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    
    setAllUsers(prev => [...prev, newUser]);
    setUser({ id: newUser.id, nome: newUser.nome, email: newUser.email, role: newUser.role });
    setIsLoading(false);
    return true;
  };

  const logout = () => setUser(null);

  const addUser = (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): User => {
    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`,
      dataCriacao: new Date().toISOString().split('T')[0],
      ultimoAcesso: new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    setAllUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  };

  const deleteUser = (id: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== id));
  };

  const loginById = (id: string) => {
    const found = allUsers.find(u => u.id === id);
    if (found) {
      setUser({ id: found.id, nome: found.nome, email: found.email, role: found.role });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      allUsers,
      login,
      register,
      logout,
      isLoading,
      addUser,
      updateUser,
      deleteUser,
      loginById,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
