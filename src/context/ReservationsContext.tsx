import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
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
import { useNotifications } from './NotificationsContext';

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
  const { addNotification } = useNotifications();
  
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('rentcar:reservations:v2');
    return saved ? JSON.parse(saved) : mockReservations;
  });
  const [blocks, setBlocks] = useState<BlockedPeriod[]>(mockBlockedPeriods);
  const [rules, setRules] = useState<BusinessRules>(DEFAULT_BUSINESS_RULES);

  useEffect(() => {
    localStorage.setItem('rentcar:reservations:v2', JSON.stringify(reservations));
  }, [reservations]);

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
    const vehicle = VEHICLES.find(v => v.id === data.vehicleId);
    const isPurchase = vehicle?.mode === 'compra';

    if (!isPurchase) {
      const dateCheck = validateDates(data.dataInicio, data.dataFim);
      if (!dateCheck.valid) return { ok: false, error: dateCheck.errors[0] };

      const avail = checkAvailability(data.vehicleId, data.dataInicio, data.dataFim);
      if (!avail.available) return { ok: false, error: avail.conflicts[0] ?? 'Viatura indisponível.' };
    }

    const newRes: Reservation = {
      ...data,
      id: `r${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReservations(prev => [...prev, newRes]);

    // Notificar o Administrador sobre a nova operação pendente
    const operacaoLabel = isPurchase ? 'compra' : 'aluguer';
    const vehicleName = vehicle?.name || `Viatura #${data.vehicleId}`;
    addNotification(
      'admin',
      'Nova Operação Pendente',
      `O cliente "${data.clientName}" realizou um pedido de ${operacaoLabel} (${vehicleName}) e está pendente à espera de resposta do admin.`,
      'warning',
      newRes.id
    );

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

        // Notificar o cliente caso o admin altere o estado
        if (data.status && data.status !== r.status) {
          const vehicle = VEHICLES.find(v => v.id === r.vehicleId);
          const isPurchase = vehicle?.mode === 'compra';
          const operacaoLabel = isPurchase ? 'Compra' : 'Aluguer';
          const vehicleName = vehicle?.name || `Viatura #${r.vehicleId}`;
          const statusText = data.status === 'concluida' ? 'CONCLUÍDA' : data.status === 'cancelada' ? 'CANCELADA' : data.status;
          const statusType = data.status === 'concluida' ? 'success' : 'alert';

          if (r.userId) {
            addNotification(
              r.userId,
              'Estado do Pedido Atualizado',
              `O seu pedido de ${operacaoLabel.toLowerCase()} ("${vehicleName}") foi alterado para o estado ${statusText} pelo administrador António Silva.`,
              statusType,
              r.id
            );
          }
        }

        return next;
      }),
    );
  };

  const cancelReservation = (id: string) => {
    setReservations(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next = { ...r, status: 'cancelada' as ReservationStatus };

        // Notificar o cliente sobre o cancelamento
        const vehicle = VEHICLES.find(v => v.id === r.vehicleId);
        const isPurchase = vehicle?.mode === 'compra';
        const operacaoLabel = isPurchase ? 'Compra' : 'Aluguer';
        const vehicleName = vehicle?.name || `Viatura #${r.vehicleId}`;

        if (r.userId) {
          addNotification(
            r.userId,
            'Estado do Pedido Atualizado',
            `O seu pedido de ${operacaoLabel.toLowerCase()} ("${vehicleName}") foi CANCELADO pelo administrador António Silva.`,
            'alert',
            r.id
          );
        }

        return next;
      }),
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
