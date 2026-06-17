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

const API_URL = 'http://localhost:3001/vehicles';

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setVehicles(data))
      .catch(err => console.error("Erro ao carregar veículos:", err));
  }, []);

  const addVehicle = async (vehicle: Omit<VehicleData, 'id'>) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
      if (res.ok) {
        const newVehicle = await res.json();
        setVehicles(prev => [...prev, newVehicle]);
      }
    } catch (err) {
      console.error("Erro ao adicionar veículo:", err);
    }
  };

  const updateVehicle = async (id: number, updates: Partial<VehicleData>) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedVehicle = await res.json();
        setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      }
    } catch (err) {
      console.error("Erro ao actualizar veículo:", err);
    }
  };

  const removeVehicle = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error("Erro ao remover veículo:", err);
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
