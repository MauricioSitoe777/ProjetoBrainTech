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

const API_URL      = 'http://localhost:4001/vehicles';
const STORAGE_KEY  = 'rentcar:vehicles:v1';

function loadLocal(): VehicleData[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch { return null; }
}

function saveLocal(list: VehicleData[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  // Inicializa com localStorage se disponível (tem veículos adicionados), senão usa estáticos
  const [vehicles, setVehicles] = useState<VehicleData[]>(
    () => loadLocal() ?? (VEHICLES as unknown as VehicleData[])
  );

  const applyVehicles = (data: VehicleData[]) => {
    setVehicles(data);
    saveLocal(data);
  };

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then((serverData: VehicleData[]) => {
        if (!Array.isArray(serverData)) return;
        // Mantém veículos locais (local_*) que o servidor ainda não tem
        setVehicles(prev => {
          const serverIds = new Set(serverData.map(v => String(v.id)));
          const localOnly = prev.filter(v => String(v.id).startsWith('local_') && !serverIds.has(String(v.id)));
          const merged = serverData.length > 0 ? [...serverData, ...localOnly] : [...prev, ...localOnly];
          saveLocal(merged);
          return merged;
        });
      })
      .catch(() => { /* API offline — usa dados de localStorage ou estáticos */ });
  }, []);

  const addVehicle = async (vehicle: Omit<VehicleData, 'id'>) => {
    if (!isAdmin) { console.warn('[Vehicles] addVehicle bloqueado — não é admin'); return; }

    // Optimistic update: adiciona imediatamente com ID temporário
    const tempId = `local_${Date.now()}`;
    const tempVehicle = { ...vehicle, id: tempId as unknown as number };
    setVehicles(prev => {
      const next = [...prev, tempVehicle];
      saveLocal(next);
      return next;
    });

    // Tenta sincronizar com json-server em background
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      if (res.ok) {
        const serverVehicle = await res.json();
        // Substitui o temp ID pelo ID do servidor
        setVehicles(prev => {
          const next = prev.map(v => String(v.id) === tempId ? serverVehicle : v);
          saveLocal(next);
          return next;
        });
      }
      // Se não ok (ex: 413 payload too large), o veículo já está no estado com tempId — não remove
    } catch {
      // json-server offline — veículo já foi adicionado localmente acima
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
        setVehicles(prev => {
          const next = prev.map(v => String(v.id) === String(id) ? updated : v);
          saveLocal(next);
          return next;
        });
      } else {
        // API respondeu mas erro — aplica localmente
        setVehicles(prev => {
          const next = prev.map(v => String(v.id) === String(id) ? { ...v, ...updates } : v);
          saveLocal(next);
          return next;
        });
      }
    } catch (err) {
      console.error('[Vehicles] updateVehicle erro:', (err as Error).message);
      setVehicles(prev => {
        const next = prev.map(v => String(v.id) === String(id) ? { ...v, ...updates } : v);
        saveLocal(next);
        return next;
      });
    }
  };

  const removeVehicle = async (id: number) => {
    if (!isAdmin) { console.warn('[Vehicles] removeVehicle bloqueado — não é admin'); return; }
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch { /* remove localmente mesmo assim */ }
    setVehicles(prev => {
      const next = prev.filter(v => String(v.id) !== String(id));
      saveLocal(next);
      return next;
    });
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
