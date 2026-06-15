import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Guest } from '../types/guest';
import { useNotifications } from './NotificationsContext';

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

  const set = (list: Guest[]) => { setGuests(list); persist(list); };

  const addGuest = (data: Omit<Guest, 'id' | 'dataCriacao' | 'status'>) => {
    const guest: Guest = {
      ...data,
      id: `g-${Date.now()}`,
      dataCriacao: new Date().toISOString(),
      status: 'documentos_submetidos',
    };
    const next = [...guests, guest];
    set(next);
    addNotification(
      'admin',
      'Novo visitante em espera',
      `${data.nome} solicitou ${data.intent === 'aluguer' ? 'um aluguer' : 'uma compra'}${data.vehicleName ? ` (${data.vehicleName})` : ''} e aguarda validação de documentos.`,
      'warning',
      undefined,
      '/admin/visitantes/pendentes'
    );
  };

  const updateGuest = (id: string, updates: Partial<Guest>) =>
    set(guests.map(g => g.id === id ? { ...g, ...updates } : g));

  const deleteGuest = (id: string) => set(guests.filter(g => g.id !== id));

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
