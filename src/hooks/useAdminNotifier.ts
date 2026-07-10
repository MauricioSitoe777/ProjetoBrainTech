import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useNotifications } from '../context/NotificationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { VEHICLES } from '../data/constants';

const DEDUP_KEY = 'rentcar:admin-notified:v1';

function loadDedup(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DEDUP_KEY) || '[]') as string[]); }
  catch { return new Set(); }
}

function saveDedup(s: Set<string>) {
  try { localStorage.setItem(DEDUP_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

export function useAdminNotifier() {
  const { user } = useAuth();
  const { reservations } = useReservations();
  const { addNotification, notifications } = useNotifications();
  const { vehicles } = useVehicles();

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const dedup = loadDedup();
    // IDs de reservas que já têm notificação admin nesta sessão
    const existingResIds = new Set(
      notifications.filter(n => n.reservationId).map(n => n.reservationId!)
    );

    let changed = false;
    reservations
      .filter(r => r.status === 'pendente' && !dedup.has(r.id) && !existingResIds.has(r.id))
      .forEach(r => {
        const vehicle = vehicles.find(v => v.id === r.vehicleId) ?? VEHICLES.find(v => v.id === r.vehicleId);
        const isPurchase = vehicle?.mode === 'compra';
        const label = isPurchase ? 'compra' : 'aluguer';
        const vehicleName = vehicle?.name ?? `Viatura #${r.vehicleId}`;
        addNotification(
          'admin',
          `Novo pedido de ${label} — ${vehicleName}`,
          `"${r.clientName}" submeteu um pedido de ${label}. Documentos já verificados — aguarda apenas confirmação de pagamento.`,
          'warning',
          r.id,
          isPurchase ? '/admin/compra?tab=acoes' : '/admin/aluguer?tab=acoes'
        );
        dedup.add(r.id);
        changed = true;
      });

    if (changed) saveDedup(dedup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, reservations]);
}
