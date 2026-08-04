import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Motorista } from '../types/motorista';
import { api } from '../lib/api';

const LS_KEY = 'rentcar:motoristas';

interface MotoristasContextType {
  motoristas: Motorista[];
  addMotorista: (data: Omit<Motorista, 'id' | 'dataCriacao'>) => Motorista;
  updateMotorista: (id: string, data: Partial<Motorista>) => void;
  deleteMotorista: (id: string) => void;
}

const MotoristasContext = createContext<MotoristasContextType | null>(null);

export function MotoristasProvider({ children }: { children: ReactNode }) {
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Load from API on mount; localStorage stays as fallback
  useEffect(() => {
    api.get<Motorista[]>('/motoristas').then(data => {
      setMotoristas(data);
    }).catch(() => {});
  }, []);

  // Keep localStorage in sync as cache
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(motoristas));
  }, [motoristas]);

  const addMotorista = (data: Omit<Motorista, 'id' | 'dataCriacao'>): Motorista => {
    const tempId = `m${Date.now()}`;
    const optimistic: Motorista = {
      ...data,
      id: tempId,
      dataCriacao: new Date().toISOString().split('T')[0],
    };
    setMotoristas(prev => [...prev, optimistic]);
    api.post<Motorista>('/motoristas', {
      nome:        data.nome,
      telefone:    data.telefone,
      bi:          data.bi,
      carta:       data.carta,
      status:      data.status,
      observacoes: data.observacoes,
    }).then(created => {
      setMotoristas(prev => prev.map(m => m.id === tempId ? created : m));
    }).catch(() => {});
    return optimistic;
  };

  const updateMotorista = (id: string, data: Partial<Motorista>) => {
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    api.put<Motorista>(`/motoristas/${id}`, {
      nome:        data.nome,
      telefone:    data.telefone,
      bi:          data.bi,
      carta:       data.carta,
      status:      data.status,
      observacoes: data.observacoes,
    }).catch(() => {});
  };

  const deleteMotorista = (id: string) => {
    setMotoristas(prev => prev.filter(m => m.id !== id));
    api.delete(`/motoristas/${id}`).catch(() => {});
  };

  return (
    <MotoristasContext.Provider value={{ motoristas, addMotorista, updateMotorista, deleteMotorista }}>
      {children}
    </MotoristasContext.Provider>
  );
}

export function useMotoristas() {
  const ctx = useContext(MotoristasContext);
  if (!ctx) throw new Error('useMotoristas must be used inside MotoristasProvider');
  return ctx;
}
