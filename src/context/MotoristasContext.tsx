import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Motorista } from '../types/motorista';

const MOCK: Motorista[] = [
  { id: 'm1', nome: 'António Cossa',   telefone: '+258 84 123 0001', status: 'disponivel', dataCriacao: '2024-01-10' },
  { id: 'm2', nome: 'Salomão Nhaca',   telefone: '+258 84 456 0002', status: 'disponivel', dataCriacao: '2024-03-05' },
  { id: 'm3', nome: 'Feliciano Matos', telefone: '+258 84 789 0003', status: 'em_servico', dataCriacao: '2024-05-20' },
];

interface MotoristasContextType {
  motoristas: Motorista[];
  addMotorista: (data: Omit<Motorista, 'id' | 'dataCriacao'>) => Motorista;
  updateMotorista: (id: string, data: Partial<Motorista>) => void;
  deleteMotorista: (id: string) => void;
}

const MotoristasContext = createContext<MotoristasContextType | null>(null);

export function MotoristasProvider({ children }: { children: ReactNode }) {
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => {
    const saved = localStorage.getItem('rentcar:motoristas');
    return saved ? JSON.parse(saved) : MOCK;
  });

  const persist = (list: Motorista[]) => {
    setMotoristas(list);
    localStorage.setItem('rentcar:motoristas', JSON.stringify(list));
  };

  const addMotorista = (data: Omit<Motorista, 'id' | 'dataCriacao'>): Motorista => {
    const novo: Motorista = { ...data, id: `m${Date.now()}`, dataCriacao: new Date().toISOString().split('T')[0] };
    persist([...motoristas, novo]);
    return novo;
  };

  const updateMotorista = (id: string, data: Partial<Motorista>) => {
    persist(motoristas.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const deleteMotorista = (id: string) => {
    persist(motoristas.filter(m => m.id !== id));
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
