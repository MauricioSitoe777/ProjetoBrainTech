import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  AvailabilityResult,
  BlockedPeriod,
  BlockReason,
  BusinessRules,
  DateValidationResult,
  Reservation,
  ReservationStatus,
} from '../types/reservation';
import {
  DEFAULT_BUSINESS_RULES,
  mockBlockedPeriods,
  mockReservations,
} from '../data/reservationsMock';
import {
  isVehicleAvailable,
  validateDateRange,
} from '../lib/availability';
import { calculateRentalTotal, parseDailyRateFromPrice } from '../lib/rentalPricing';
import { useAuth } from './AuthContext';
import { VEHICLES } from '../data/constants';

interface ReservationsContextType {
  reservations: Reservation[];
  blocks: BlockedPeriod[];
  rules: BusinessRules;
  updateRules: (data: Partial<BusinessRules>) => void;
  checkAvailability: (vehicleId: number, start: string, end: string, excludeId?: string) => AvailabilityResult;
  validateDates: (start: string, end: string) => DateValidationResult;
  createReservation: (data: Omit<Reservation, 'id' | 'createdAt'>) => { ok: boolean; error?: string };
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  cancelReservation: (id: string) => void;
  addBlock: (data: Omit<BlockedPeriod, 'id'>) => void;
  removeBlock: (id: string) => void;
  getVehicleReservations: (vehicleId: number) => Reservation[];
  getClientReservations: (userId: string) => Reservation[];
  quoteRental: (vehicleId: number, start: string, end: string) => ReturnType<typeof calculateRentalTotal> & { days: number; dailyRate: number } | null;
}

const ReservationsContext = createContext<ReservationsContextType | null>(null);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>(mockBlockedPeriods);
  const [rules, setRules] = useState<BusinessRules>(DEFAULT_BUSINESS_RULES);

  const visibleReservations = useMemo(() => {
    if (!authUser) return [];
    if (authUser.role === 'admin') return reservations;
    return reservations.filter(r => r.userId === authUser.id);
  }, [reservations, authUser]);

  const checkAvailability = (vehicleId: number, start: string, end: string, excludeId?: string) =>
    isVehicleAvailable(vehicleId, start, end, reservations, blocks, excludeId);

  const validateDates = (start: string, end: string) =>
    validateDateRange(start, end, rules);

  const createReservation = (data: Omit<Reservation, 'id' | 'createdAt'>) => {
    const dateCheck = validateDates(data.dataInicio, data.dataFim);
    if (!dateCheck.valid) return { ok: false, error: dateCheck.errors[0] };

    const avail = checkAvailability(data.vehicleId, data.dataInicio, data.dataFim);
    if (!avail.available) return { ok: false, error: avail.conflicts[0] ?? 'Viatura indisponível.' };

    const newRes: Reservation = {
      ...data,
      id: `r${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReservations(prev => [...prev, newRes]);
    return { ok: true };
  };

  const updateReservation = (id: string, data: Partial<Reservation>) => {
    if (authUser?.role !== 'admin') return;
    setReservations(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next = { ...r, ...data };
        if (data.dataInicio || data.dataFim) {
          const start = data.dataInicio ?? r.dataInicio;
          const end = data.dataFim ?? r.dataFim;
          const avail = isVehicleAvailable(next.vehicleId, start, end, reservations, blocks, id);
          if (!avail.available) return r;
        }
        return next;
      }),
    );
  };

  const cancelReservation = (id: string) => {
    setReservations(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'cancelada' as ReservationStatus } : r)),
    );
  };

  const addBlock = (data: Omit<BlockedPeriod, 'id'>) => {
    if (authUser?.role !== 'admin') return;
    setBlocks(prev => [...prev, { ...data, id: `b${Date.now()}` }]);
  };

  const removeBlock = (id: string) => {
    if (authUser?.role !== 'admin') return;
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateRules = (data: Partial<BusinessRules>) => {
    if (authUser?.role !== 'admin') return;
    setRules(prev => ({ ...prev, ...data }));
  };

  const quoteRental = (vehicleId: number, start: string, end: string) => {
    const vehicle = VEHICLES.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.mode !== 'aluguer') return null;
    const dateCheck = validateDates(start, end);
    if (!dateCheck.valid) return null;
    const dailyRate = parseDailyRateFromPrice(vehicle.price);
    const pricing = calculateRentalTotal(dailyRate, dateCheck.days, rules);
    return { ...pricing, days: dateCheck.days, dailyRate };
  };

  return (
    <ReservationsContext.Provider
      value={{
        reservations: visibleReservations,
        blocks: authUser?.role === 'admin' ? blocks : [],
        rules,
        updateRules,
        checkAvailability,
        validateDates,
        createReservation,
        updateReservation,
        cancelReservation,
        addBlock,
        removeBlock,
        getVehicleReservations: vehicleId => reservations.filter(r => r.vehicleId === vehicleId),
        getClientReservations: userId => reservations.filter(r => r.userId === userId),
        quoteRental,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error('useReservations must be used within ReservationsProvider');
  return ctx;
}

export type { BlockReason };
