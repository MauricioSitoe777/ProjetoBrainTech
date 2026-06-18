import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import emailjs from '@emailjs/browser';
import type { AuthUser, User } from '../types/user';
import { mockUsers as initialMockUsers } from '../data/mockData';
import { EMAILJS_CONFIG, RESET_EXPIRES_MS } from '../config/emailjs';

const RESET_KEY = 'rentcar:reset:v1';

interface ResetEntry { userId: string; expires: number; }

function getResetStore(): Record<string, ResetEntry> {
  try { return JSON.parse(localStorage.getItem(RESET_KEY) ?? '{}'); } catch { return {}; }
}
function saveResetStore(store: Record<string, ResetEntry>) {
  localStorage.setItem(RESET_KEY, JSON.stringify(store));
}

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
  solicitarResetSenha: (email: string) => Promise<{ status: 'sent' | 'not_found' | 'error'; link?: string }>;
  validarTokenReset: (token: string) => string | null;
  redefinirSenha: (token: string, novaSenha: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Password default para o demo
const DEFAULT_PASSWORD = '123';

const SESSION_KEY = 'rentcar:session:v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rentcar:users:v2');
    return saved ? JSON.parse(saved) : initialMockUsers;
  });

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      console.log('[Auth] sessão guardada:', user.nome, '|', user.role);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      console.log('[Auth] sessão encerrada');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('rentcar:users:v2', JSON.stringify(allUsers));
  }, [allUsers]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const id = identifier.trim();
    // Normaliza dígitos para comparação de telemóvel (ignora +258, espaços, traços)
    const idDigits = id.replace(/\D/g, '').replace(/^258/, '');

    const foundUser = allUsers.find(u => {
      if (u.email === id) return true;
      const phoneDigits = (u.telefone ?? '').replace(/\D/g, '').replace(/^258/, '');
      return idDigits.length >= 8 && phoneDigits.length >= 8 && phoneDigits.endsWith(idDigits);
    });

    const validPassword = foundUser?.password
      ? password === foundUser.password
      : password === DEFAULT_PASSWORD;

    if (foundUser && validPassword) {
      const authUser = { id: foundUser.id, nome: foundUser.nome, email: foundUser.email, role: foundUser.role, xitique: foundUser.xitique ?? false };
      setUser(authUser);
      console.log('[Auth] login OK:', authUser.nome, '|', authUser.role);
      setIsLoading(false);
      return true;
    }

    console.warn('[Auth] login falhou — utilizador:', identifier);
    setIsLoading(false);
    return false;
  };

  const register = async (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    
    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`,
      status: userData.status || 'ativo',
      regularity: 'regular',
      restriction: 'nenhuma',
      dataCriacao: new Date().toISOString().split('T')[0],
      ultimoAcesso: new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    
    setAllUsers(prev => [...prev, newUser]);
    setUser({ id: newUser.id, nome: newUser.nome, email: newUser.email, role: newUser.role });
    setIsLoading(false);
    return true;
  };

  const logout = () => { console.log('[Auth] logout'); setUser(null); };

  const addUser = (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): User => {
    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`,
      status: userData.status || 'ativo',
      regularity: userData.regularity || 'regular',
      restriction: userData.restriction || 'nenhuma',
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

  const solicitarResetSenha = async (email: string): Promise<{ status: 'sent' | 'not_found' | 'error'; link?: string }> => {
    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) return { status: 'not_found' };

    // Gera token seguro de 48 chars hex
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Guarda token em localStorage com validade de 1 hora
    const store = getResetStore();
    for (const [k, v] of Object.entries(store)) {
      if (v.userId === found.id) delete store[k];
    }
    store[token] = { userId: found.id, expires: Date.now() + RESET_EXPIRES_MS };
    saveResetStore(store);

    const resetLink = `${window.location.origin}/recuperar-senha/${token}`;

    // Verifica se as credenciais EmailJS estão configuradas
    const emailjsConfigurado = !EMAILJS_CONFIG.serviceId.includes('xxx') && !EMAILJS_CONFIG.publicKey.includes('XX');

    if (emailjsConfigurado) {
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateId,
          { to_name: found.nome, to_email: found.email, reset_link: resetLink, expires_in: '1 hora' },
          EMAILJS_CONFIG.publicKey,
        );
        return { status: 'sent' };
      } catch (err) {
        console.error('[Auth] EmailJS error:', err);
      }
    }

    // Fallback: devolve o link para ser exibido/copiado no ecrã
    console.info('[Auth] Reset link:', resetLink);
    return { status: 'error', link: resetLink };
  };

  const validarTokenReset = (token: string): string | null => {
    const store = getResetStore();
    const entry = store[token];
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      // Token expirado — limpa
      delete store[token];
      saveResetStore(store);
      return null;
    }
    return entry.userId;
  };

  const redefinirSenha = (token: string, novaSenha: string): boolean => {
    const userId = validarTokenReset(token);
    if (!userId) return false;
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, password: novaSenha, mustChangePassword: false } : u));
    // Invalida o token após uso
    const store = getResetStore();
    delete store[token];
    saveResetStore(store);
    return true;
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
      solicitarResetSenha,
      validarTokenReset,
      redefinirSenha,
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
