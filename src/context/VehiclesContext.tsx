import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { VEHICLES } from '../data/constants';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

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
  motivoIndisponibilidade?: string;
  dataDisponibilidade?: string;
  matricula?: string;
}

interface ApiVehicle {
  id: number;
  name: string; brand: string; cat: string; mode: string; price: string;
  description?: string; img: string; images?: string[]; fuel: string;
  seats: number; year: number; discount?: number; available?: number | boolean;
  matricula?: string;
  motivo_indisponibilidade?: string;
  data_disponibilidade?: string;
}

function fromApi(v: ApiVehicle): VehicleData {
  return {
    id:                     v.id,
    name:                   v.name,
    brand:                  v.brand,
    cat:                    v.cat,
    mode:                   v.mode,
    price:                  v.price,
    description:            v.description,
    img:                    v.img ?? '',
    images:                 v.images ?? [],
    fuel:                   v.fuel ?? '',
    seats:                  v.seats ?? 5,
    year:                   v.year ?? 2020,
    discount:               v.discount,
    available:              Boolean(v.available),
    matricula:              v.matricula,
    motivoIndisponibilidade: v.motivo_indisponibilidade,
    dataDisponibilidade:     v.data_disponibilidade,
  };
}

function toApi(v: Partial<VehicleData>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  if ('motivoIndisponibilidade' in v) { out.motivo_indisponibilidade = v.motivoIndisponibilidade; delete out.motivoIndisponibilidade; }
  if ('dataDisponibilidade' in v)     { out.data_disponibilidade = v.dataDisponibilidade; delete out.dataDisponibilidade; }
  return out;
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

const STORAGE_KEY  = 'rentcar:vehicles:v1';

const STATIC_MAP = new Map(VEHICLES.map(v => [Number(v.id), v]));

function loadLocal(): VehicleData[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) return null;
    // Enriquece dados armazenados com campos novos dos estáticos (estático = default, stored = override)
    return data.map(stored => {
      const staticV = STATIC_MAP.get(Number(stored.id));
      return staticV ? { ...staticV, ...stored } : stored;
    });
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
    api.get<ApiVehicle[]>('/vehicles')
      .then((serverData) => {
        if (!Array.isArray(serverData)) return;
        const mapped = serverData.map(fromApi);
        setVehicles(prev => {
          const serverIds = new Set(mapped.map(v => String(v.id)));
          const localOnly = prev.filter(v => String(v.id).startsWith('local_') && !serverIds.has(String(v.id)));
          const merged = mapped.length > 0 ? [...mapped, ...localOnly] : [...prev, ...localOnly];
          saveLocal(merged);
          return merged;
        });
      })
      .catch(() => { /* API offline — usa dados de localStorage ou estáticos */ });
  }, []);

  const addVehicle = async (vehicle: Omit<VehicleData, 'id'>) => {
    if (!isAdmin) { console.warn('[Vehicles] addVehicle bloqueado — não é admin'); return; }

    const tempId = `local_${Date.now()}`;
    const tempVehicle = { ...vehicle, id: tempId as unknown as number };
    setVehicles(prev => { const next = [...prev, tempVehicle]; saveLocal(next); return next; });

    try {
      const serverVehicle = await api.post<ApiVehicle>('/vehicles', toApi(vehicle));
      const mapped = fromApi(serverVehicle);
      setVehicles(prev => {
        const next = prev.map(v => String(v.id) === tempId ? mapped : v);
        saveLocal(next);
        return next;
      });
    } catch {
      // API offline — veículo permanece com tempId local
    }
  };

  const updateVehicle = async (id: number, updates: Partial<VehicleData>) => {
    if (!isAdmin) { console.warn('[Vehicles] updateVehicle bloqueado — não é admin'); return; }
    // Optimistic local update
    setVehicles(prev => { const next = prev.map(v => String(v.id) === String(id) ? { ...v, ...updates } : v); saveLocal(next); return next; });
    try {
      const updated = await api.patch<ApiVehicle>(`/vehicles/${id}`, toApi(updates));
      const mapped = fromApi(updated);
      setVehicles(prev => { const next = prev.map(v => String(v.id) === String(id) ? mapped : v); saveLocal(next); return next; });
    } catch {
      // fallback já foi aplicado localmente
    }
  };

  const removeVehicle = async (id: number) => {
    if (!isAdmin) { console.warn('[Vehicles] removeVehicle bloqueado — não é admin'); return; }
    setVehicles(prev => { const next = prev.filter(v => String(v.id) !== String(id)); saveLocal(next); return next; });
    api.delete(`/vehicles/${id}`).catch(() => {});
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
