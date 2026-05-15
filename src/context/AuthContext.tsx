import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types/user';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_ACCOUNTS = [
  { id: '1', nome: 'António Silva', email: 'admin@rentcar.mz', password: 'admin123', role: 'admin' as const },
  { id: '3', nome: 'Carlos Machava', email: 'cliente@rentcar.mz', password: 'cliente123', role: 'cliente' as const },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (account) {
      setUser({ id: account.id, nome: account.nome, email: account.email, role: account.role });
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
