import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { VEHICLES } from '../data/constants';

export interface VehicleData {
  id: number;
  name: string;
  cat: string;
  mode: string;
  price: string;
  img: string;
  images: string[];
  fuel: string;
  seats: number;
  year: number;
}

interface VehiclesContextType {
  vehicles: VehicleData[];
  addVehicle: (vehicle: Omit<VehicleData, 'id'>) => void;
  updateVehicle: (id: number, vehicle: Partial<VehicleData>) => void;
  removeVehicle: (id: number) => void;
}

const VehiclesContext = createContext<VehiclesContextType | null>(null);

const STORAGE_KEY = 'rentcar:vehicles:v1';

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<VehicleData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return VEHICLES.map(v => ({ ...v }));
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch { /* ignore */ }
  }, [vehicles]);

  const addVehicle = (vehicle: Omit<VehicleData, 'id'>) => {
    const maxId = vehicles.reduce((max, v) => Math.max(max, v.id), 0);
    setVehicles(prev => [...prev, { ...vehicle, id: maxId + 1 }]);
  };

  const updateVehicle = (id: number, updates: Partial<VehicleData>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeVehicle = (id: number) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  return (
    <VehiclesContext.Provider value={{ vehicles, addVehicle, updateVehicle, removeVehicle }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used within VehiclesProvider');
  return ctx;
}
