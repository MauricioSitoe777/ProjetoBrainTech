import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Vehicle } from '../types/vehicle';
import { VEHICLES as initialVehicles } from '../data/constants';

interface VehiclesContextType {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: number, data: Partial<Vehicle>) => void;
  deleteVehicle: (id: number) => void;
  getVehicle: (id: number) => Vehicle | undefined;
}

const VehiclesContext = createContext<VehiclesContextType | null>(null);

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('rentcar:vehicles:v1');
    if (saved) return JSON.parse(saved);

    // In case the static constant was already changed to an empty array or something else,
    // we should make sure we have the initial data.
    return initialVehicles;
  });

  useEffect(() => {
    localStorage.setItem('rentcar:vehicles:v1', JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = (vehicleData: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: Date.now(),
    };
    setVehicles(prev => [...prev, newVehicle]);
  };

  const updateVehicle = (id: number, data: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  };

  const deleteVehicle = (id: number) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const getVehicle = (id: number) => {
    return vehicles.find(v => v.id === id);
  };

  return (
    <VehiclesContext.Provider value={{ vehicles, addVehicle, updateVehicle, deleteVehicle, getVehicle }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used within VehiclesProvider');
  return ctx;
}
