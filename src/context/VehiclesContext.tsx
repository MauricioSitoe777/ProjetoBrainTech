import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { VEHICLES } from '../data/constants';


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
  discount?: number; // percentage
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
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState<VehicleData[]>(VEHICLES as unknown as VehicleData[]);

  useEffect(() => {
    console.log('[Vehicles] a carregar de', API_URL);
    fetch(API_URL)
      .then(res => { console.log('[Vehicles] fetch status:', res.status); return res.json(); })
      .then(data => {
        console.log('[Vehicles] recebidos:', Array.isArray(data) ? data.length : '(não é array)', 'veículos');
        if (Array.isArray(data) && data.length > 0) setVehicles(data);
      })
      .catch(err => { console.warn('[Vehicles] API indisponível, a usar dados estáticos:', err.message); });
  }, []);

  const addVehicle = async (vehicle: Omit<VehicleData, 'id'>) => {
    console.log('[Vehicles] addVehicle →', vehicle.name);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
      console.log('[Vehicles] POST status:', res.status);
      if (res.ok) {
        const newVehicle = await res.json();
        console.log('[Vehicles] veículo criado com id:', newVehicle.id);
        setVehicles(prev => [...prev, newVehicle]);
      } else {
        const body = await res.text();
        console.error('[Vehicles] POST falhou:', res.status, body);
      }
    } catch (err) {
      console.error('[Vehicles] addVehicle ERRO (API offline?):', (err as Error).message);
    }
  };

  const updateVehicle = async (id: number, updates: Partial<VehicleData>) => {
    console.log('[Vehicles] updateVehicle id:', id);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      console.log('[Vehicles] PATCH status:', res.status);
      if (res.ok) {
        const updatedVehicle = await res.json();
        setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      } else {
        console.error('[Vehicles] PATCH falhou:', res.status);
      }
    } catch (err) {
      console.error('[Vehicles] updateVehicle ERRO:', (err as Error).message);
    }
  };

  const removeVehicle = async (id: number) => {
    console.log('[Vehicles] removeVehicle id:', id);
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      console.log('[Vehicles] DELETE status:', res.status);
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v.id !== id));
      } else {
        console.error('[Vehicles] DELETE falhou:', res.status);
      }
    } catch (err) {
      console.error('[Vehicles] removeVehicle ERRO:', (err as Error).message);
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
