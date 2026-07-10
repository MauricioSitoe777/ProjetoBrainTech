import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useNotifications } from '../context/NotificationsContext';

const REMINDER_KEY = 'rentcar:reminders:v1';
const ALERT_DAYS   = 3; // avisar quando faltam ≤ 3 dias

type ReminderStore = Record<string, true>;

function loadStore(): ReminderStore {
  try { return JSON.parse(localStorage.getItem(REMINDER_KEY) ?? '{}'); } catch { return {}; }
}
function saveStore(s: ReminderStore) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(s));
}

function diffDays(isoDate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(isoDate + 'T00:00:00');
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtMT(valor: number): string {
  return valor.toLocaleString('pt-MZ') + ' MT';
}

/**
 * Verifica, uma vez por sessão, as reservas activas do cliente e cria
 * notificações in-app para devoluções ou prestações com vencimento próximo.
 * A deduplicação é feita via localStorage (chave por reserva+tipo+dia).
 */
export function useClientReminders() {
  const { user }           = useAuth();
  const { reservations }   = useReservations();
  const { addNotification } = useNotifications();

  // Referência estável para evitar dependência circular no useEffect
  const addRef = useRef(addNotification);
  useEffect(() => { addRef.current = addNotification; }, [addNotification]);

  // Reinicia a guarda sempre que o utilizador muda (login/logout)
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'cliente') return;
    if (reservations.length === 0) return; // aguarda o carregamento

    // Evita correr mais de uma vez por sessão para o mesmo utilizador
    if (lastUserId.current === user.id) return;
    lastUserId.current = user.id;

    const store  = loadStore();
    const hoje   = todayStr();
    let changed  = false;

    const minhas = reservations.filter(r =>
      r.userId === user.id &&
      ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente'].includes(r.status)
    );

    for (const r of minhas) {
      // ── 1. Data de devolução da viatura ──────────────────────────────────
      const devKey = `${r.id}_dev_${hoje}`;
      if (!store[devKey]) {
        const diff = diffDays(r.dataFim);
        if (diff >= 0 && diff <= ALERT_DAYS) {
          const msg =
            diff === 0 ? 'A devolução da viatura é hoje. Por favor, dirija-se ao balcão.' :
            diff === 1 ? 'A devolução da viatura é amanhã.' :
                         `Faltam ${diff} dias para a devolução da viatura.`;
          addRef.current(
            user.id,
            diff === 0 ? 'Devolução Hoje' : 'Lembrete de Devolução',
            msg,
            diff === 0 ? 'alert' : 'warning',
            r.id,
            '/perfil',
          );
          store[devKey] = true;
          changed = true;
        }
      }

      // ── 2. Prestações por pagar ───────────────────────────────────────────
      for (const p of r.prestacoes ?? []) {
        if (p.paga) continue;
        const pagKey = `${r.id}_prest${p.numero}_${hoje}`;
        if (!store[pagKey]) {
          const diff = diffDays(p.dataVencimento);
          if (diff >= 0 && diff <= ALERT_DAYS) {
            const valorFmt = fmtMT(p.valor);
            const msg =
              diff === 0
                ? `A prestação nº ${p.numero} (${valorFmt}) vence hoje.`
                : diff === 1
                  ? `A prestação nº ${p.numero} (${valorFmt}) vence amanhã.`
                  : `Faltam ${diff} dias para a prestação nº ${p.numero} (${valorFmt}).`;
            addRef.current(
              user.id,
              diff === 0 ? 'Pagamento Vence Hoje' : 'Lembrete de Pagamento',
              msg,
              diff === 0 ? 'alert' : 'warning',
              r.id,
              '/perfil',
            );
            store[pagKey] = true;
            changed = true;
          }
        }
      }
    }

    if (changed) saveStore(store);
  }, [user?.id, reservations]);
}
