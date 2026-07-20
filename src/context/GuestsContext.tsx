import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Guest } from '../types/guest';
import { useNotifications } from './NotificationsContext';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const STORAGE_KEY = 'rentcar:guests:v1';

interface GuestsContextType {
  guests: Guest[];
  addGuest: (data: Omit<Guest, 'id' | 'dataCriacao' | 'status'>) => void;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
}

const GuestsContext = createContext<GuestsContextType | null>(null);

function load(): Guest[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function persist(list: Guest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function GuestsProvider({ children }: { children: ReactNode }) {
  const [guests, setGuests] = useState<Guest[]>(load);
  const { addNotification } = useNotifications();
  const { user: authUser } = useAuth();

  const set = (list: Guest[]) => { setGuests(list); persist(list); };

  // Carrega visitantes da API sempre que o admin autenticado muda (login/logout)
  useEffect(() => {
    if (!authUser || authUser.role !== 'admin') return;
    api.get<Guest[]>('/guests')
      .then(data => { if (Array.isArray(data)) set(data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const addGuest = (data: Omit<Guest, 'id' | 'dataCriacao' | 'status'>) => {
    const guest: Guest = {
      ...data,
      id: `g-${Date.now()}`,
      dataCriacao: new Date().toISOString(),
      status: 'aguarda_documentos',
    };
    const next = [...guests, guest];
    set(next);
    api.post('/guests', {
      nome: data.nome, email: data.email, telefone: data.telefone,
      intent: data.intent, category: data.category ?? null,
      vehicle_name: data.vehicleName ?? null,
      status: 'aguarda_documentos',
    }).catch(() => {});
    addNotification(
      'admin',
      'Novo visitante em espera',
      `${data.nome} solicitou ${data.intent === 'aluguer' ? 'um aluguer' : 'uma compra'}${data.vehicleName ? ` (${data.vehicleName})` : ''} e aguarda validação de documentos.`,
      'warning',
      undefined,
      '/admin/visitantes/pendentes'
    );
  };

  const updateGuest = (id: string, updates: Partial<Guest>) => {
    set(guests.map(g => g.id === id ? { ...g, ...updates } : g));
    const patch: Record<string, unknown> = {};
    if (updates.status     !== undefined) patch.status      = updates.status;
    if (updates.documentos !== undefined) patch.documentos  = updates.documentos;
    if (updates.notaAdmin  !== undefined) patch.nota_admin  = updates.notaAdmin;
    if (updates.senhaGerada !== undefined) patch.senha_gerada = updates.senhaGerada;
    if (updates.category   !== undefined) patch.category    = updates.category;
    if (updates.vehicleName !== undefined) patch.vehicle_name = updates.vehicleName;
    if (Object.keys(patch).length > 0) api.put(`/guests/${id}`, patch).catch(() => {});
  };

  const deleteGuest = (id: string) => {
    set(guests.filter(g => g.id !== id));
    api.delete(`/guests/${id}`).catch(() => {});
  };

  return (
    <GuestsContext.Provider value={{ guests, addGuest, updateGuest, deleteGuest }}>
      {children}
    </GuestsContext.Provider>
  );
}

export function useGuests() {
  const ctx = useContext(GuestsContext);
  if (!ctx) throw new Error('useGuests must be used within GuestsProvider');
  return ctx;
}
