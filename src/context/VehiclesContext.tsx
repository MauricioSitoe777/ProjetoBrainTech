import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { VEHICLES } from '../data/constants';
import { useAuth } from './AuthContext';

export interface VehicleData {
  id: number;
  name: string;
  brand: string;
  cat: string;
  mode: string;
  price: string;
  description?: string;
  img: string;
  images: string[];
  fuel: string;
  seats: number;
  year: number;
  discount?: number;
  available?: boolean;
  matricula?: string;
}

interface VehiclesContextType {
  vehicles: VehicleData[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addVehicle: (vehicle: Omit<VehicleData, 'id'>) => void;
  updateVehicle: (id: number, vehicle: Partial<VehicleData>) => void;
  removeVehicle: (id: number) => void;
}

const VehiclesContext = createContext<VehiclesContextType | null>(null);

const API_URL = 'http://localhost:4001/vehicles';

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState<VehicleData[]>(VEHICLES as unknown as VehicleData[]);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setVehicles(data); })
      .catch(() => { /* API offline — mantém dados estáticos */ });
  }, []);

  const addVehicle = async (vehicle: Omit<VehicleData, 'id'>) => {
    if (!isAdmin) { console.warn('[Vehicles] addVehicle bloqueado — não é admin'); return; }
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      if (res.ok) {
        const newVehicle = await res.json();
        setVehicles(prev => [...prev, newVehicle]);
      }
    } catch (err) {
      console.error('[Vehicles] addVehicle erro:', (err as Error).message);
    }
  };

  const updateVehicle = async (id: number, updates: Partial<VehicleData>) => {
    if (!isAdmin) { console.warn('[Vehicles] updateVehicle bloqueado — não é admin'); return; }
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setVehicles(prev => prev.map(v => v.id === id ? updated : v));
      }
    } catch (err) {
      console.error('[Vehicles] updateVehicle erro:', (err as Error).message);
    }
  };

  const removeVehicle = async (id: number) => {
    if (!isAdmin) { console.warn('[Vehicles] removeVehicle bloqueado — não é admin'); return; }
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('[Vehicles] removeVehicle erro:', (err as Error).message);
    }
  };

  return (
    <VehiclesContext.Provider value={{ vehicles, searchTerm, setSearchTerm, addVehicle, updateVehicle, removeVehicle }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used within VehiclesProvider');
  return ctx;
}
