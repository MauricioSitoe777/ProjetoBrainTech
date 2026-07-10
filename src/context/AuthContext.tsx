import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import emailjs from '@emailjs/browser';
import type { AuthUser, User } from '../types/user';
import { mockUsers as initialMockUsers } from '../data/mockData';
import { EMAILJS_CONFIG, RESET_EXPIRES_MS } from '../config/emailjs';
import { api } from '../lib/api';

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

  // Restaura token API na sessão activa
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const token = sessionStorage.getItem('rentcar:api_token');
      if (token) api.setToken(token);
    }
  }, []);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      api.clearToken();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('rentcar:users:v2', JSON.stringify(allUsers));
  }, [allUsers]);

  // Quando o admin faz login, sincroniza lista de utilizadores com a API
  const syncUsersFromApi = async () => {
    try {
      const apiUsers = await api.get<Record<string, unknown>[]>('/users');
      if (Array.isArray(apiUsers) && apiUsers.length > 0) {
        const mapped: User[] = apiUsers.map((u) => ({
          id:               String(u.id),
          nome:             String(u.nome ?? ''),
          email:            String(u.email ?? ''),
          telefone:         String(u.telefone ?? ''),
          role:             (u.role as User['role']) ?? 'cliente',
          status:           (u.status as User['status']) ?? 'ativo',
          regularity:       (u.regularity as User['regularity']) ?? 'regular',
          restriction:      (u.restriction as User['restriction']) ?? 'nenhuma',
          category:         u.category as User['category'],
          avatar:           u.avatar as string | undefined,
          bi:               u.bi as string | undefined,
          nuit:             u.nuit as string | undefined,
          documentos:       u.documentos as User['documentos'],
          endereco:         u.endereco as string | undefined,
          xitique:          Boolean(u.xitique),
          motivoSuspensao:  u.motivoSuspensao as string | undefined,
          mustChangePassword: Boolean(u.mustChangePassword),
          totalAlugueres:   Number(u.totalAlugueres ?? 0),
          dataCriacao:      String(u.dataCriacao ?? ''),
          ultimoAcesso:     String(u.ultimoAcesso ?? ''),
        }));
        setAllUsers(mapped);
      }
    } catch {
      // API indisponível — mantém dados locais
    }
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // ── Tenta login via API ───────────────────────────────────────────────────
    try {
      const res = await api.post<{ token: string; user: { id: string; nome: string; email: string; role: string; xitique?: boolean; must_change_password?: boolean } }>(
        '/auth/login',
        { email: identifier, password }
      );
      if (res?.token && res?.user) {
        api.setToken(res.token);
        const authUser: AuthUser = {
          id:      res.user.id,
          nome:    res.user.nome,
          email:   res.user.email,
          role:    res.user.role as AuthUser['role'],
          xitique: res.user.xitique ?? false,
        };
        setUser(authUser);
        if (authUser.role === 'admin') await syncUsersFromApi();
        setIsLoading(false);
        return true;
      }
    } catch {
      // API indisponível ou credenciais inválidas — tenta mock local abaixo
    }

    // ── Fallback: dados locais (demo / API offline) ───────────────────────────
    await new Promise(r => setTimeout(r, 400));

    const id = identifier.trim();
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
      const authUser: AuthUser = { id: foundUser.id, nome: foundUser.nome, email: foundUser.email, role: foundUser.role, xitique: foundUser.xitique ?? false };
      setUser(authUser);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const register = async (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): Promise<boolean> => {
    setIsLoading(true);

    // Tenta criar via API
    try {
      const res = await api.post<{ id: string }>('/users', {
        name:     userData.nome,
        email:    userData.email,
        password: userData.password ?? DEFAULT_PASSWORD,
        telefone: userData.telefone,
        role:     userData.role,
        status:   userData.status ?? 'ativo',
      });
      if (res?.id) {
        const newUser: User = {
          ...userData,
          id:            res.id,
          dataCriacao:   new Date().toISOString().split('T')[0],
          ultimoAcesso:  new Date().toISOString().split('T')[0],
          totalAlugueres: 0,
        };
        setAllUsers(prev => [...prev, newUser]);
        setUser({ id: newUser.id, nome: newUser.nome, email: newUser.email, role: newUser.role });
        setIsLoading(false);
        return true;
      }
    } catch { /* fallback local */ }

    // Fallback local
    await new Promise(r => setTimeout(r, 400));
    const newUser: User = {
      ...userData,
      id:            `u${Date.now()}`,
      status:        userData.status || 'ativo',
      regularity:    'regular',
      restriction:   'nenhuma',
      dataCriacao:   new Date().toISOString().split('T')[0],
      ultimoAcesso:  new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    setAllUsers(prev => [...prev, newUser]);
    setUser({ id: newUser.id, nome: newUser.nome, email: newUser.email, role: newUser.role });
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    api.post('/auth/logout', {}).catch(() => {});
    setUser(null);
  };

  const addUser = (userData: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>): User => {
    const newUser: User = {
      ...userData,
      id:            `u${Date.now()}`,
      status:        userData.status || 'ativo',
      regularity:    userData.regularity || 'regular',
      restriction:   userData.restriction || 'nenhuma',
      dataCriacao:   new Date().toISOString().split('T')[0],
      ultimoAcesso:  new Date().toISOString().split('T')[0],
      totalAlugueres: 0,
    };
    setAllUsers(prev => [...prev, newUser]);
    // Persiste na API em background
    api.post('/users', { name: newUser.nome, email: newUser.email, password: newUser.password ?? DEFAULT_PASSWORD, telefone: newUser.telefone, role: newUser.role, status: newUser.status, category: newUser.category, bi: newUser.bi, nuit: newUser.nuit, endereco: newUser.endereco }).catch(() => {});
    return newUser;
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    const patch: Record<string, unknown> = {};
    if (data.nome)    patch.name     = data.nome;
    if (data.email)   patch.email    = data.email;
    if (data.telefone) patch.telefone = data.telefone;
    if (data.status)  patch.status   = data.status;
    if (data.role)    patch.role     = data.role;
    if (data.regularity)  patch.regularity  = data.regularity;
    if (data.restriction) patch.restriction = data.restriction;
    if (data.category)    patch.category    = data.category;
    if (data.avatar)      patch.avatar      = data.avatar;
    if (data.bi)          patch.bi          = data.bi;
    if (data.nuit)        patch.nuit        = data.nuit;
    if (data.documentos)  patch.documentos  = data.documentos;
    if (data.endereco)    patch.endereco    = data.endereco;
    if (data.xitique !== undefined) patch.xitique = data.xitique;
    if (data.motivoSuspensao !== undefined) patch.motivo_suspensao = data.motivoSuspensao;
    if (Object.keys(patch).length > 0) {
      api.put(`/users/${id}`, patch).catch(() => {});
    }
  };

  const deleteUser = (id: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== id));
    api.delete(`/users/${id}`).catch(() => {});
  };

  const loginById = (id: string) => {
    const found = allUsers.find(u => u.id === id);
    if (found) setUser({ id: found.id, nome: found.nome, email: found.email, role: found.role });
  };

  const solicitarResetSenha = async (email: string): Promise<{ status: 'sent' | 'not_found' | 'error'; link?: string }> => {
    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) return { status: 'not_found' };
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
    const store = getResetStore();
    for (const [k, v] of Object.entries(store)) { if (v.userId === found.id) delete store[k]; }
    store[token] = { userId: found.id, expires: Date.now() + RESET_EXPIRES_MS };
    saveResetStore(store);
    const resetLink = `${window.location.origin}/recuperar-senha/${token}`;
    const emailjsConfigurado = !EMAILJS_CONFIG.serviceId.includes('xxx') && !EMAILJS_CONFIG.publicKey.includes('XX');
    if (emailjsConfigurado) {
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, { to_name: found.nome, to_email: found.email, reset_link: resetLink, expires_in: '1 hora' }, EMAILJS_CONFIG.publicKey);
        return { status: 'sent' };
      } catch { /* fallthrough */ }
    }
    return { status: 'error', link: resetLink };
  };

  const validarTokenReset = (token: string): string | null => {
    const store = getResetStore();
    const entry = store[token];
    if (!entry) return null;
    if (Date.now() > entry.expires) { delete store[token]; saveResetStore(store); return null; }
    return entry.userId;
  };

  const redefinirSenha = (token: string, novaSenha: string): boolean => {
    const userId = validarTokenReset(token);
    if (!userId) return false;
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, password: novaSenha, mustChangePassword: false, passwordChangedByUser: true } : u));
    api.put(`/users/${userId}`, { password: novaSenha, must_change_password: false, password_changed_by_user: true }).catch(() => {});
    const store = getResetStore();
    delete store[token];
    saveResetStore(store);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, login, register, logout, isLoading, addUser, updateUser, deleteUser, loginById, solicitarResetSenha, validarTokenReset, redefinirSenha }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
