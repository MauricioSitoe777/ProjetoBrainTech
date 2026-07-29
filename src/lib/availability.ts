import type {
  BlockedPeriod,
  BusinessRules,
  DateValidationResult,
  Reservation,
  ReservationStatus,
} from '../types/reservation';

const BLOCKING_STATUSES: ReservationStatus[] = ['pendente', 'confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente'];
const SOLD_STATUSES: ReservationStatus[] = ['compra_aprovada', 'entrada_paga', 'em_prestacao', 'prestacao_atraso', 'liquidada'];

function fmtPT(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function daysBetweenInclusive(start: string, end: string): number {
  const s = parseDate(start);
  const e = parseDate(end);
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return Math.max(1, diff);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return parseDate(aStart) <= parseDate(bEnd) && parseDate(bStart) <= parseDate(aEnd);
}

function hasWeekendInRange(start: string, end: string): boolean {
  const cur = parseDate(start);
  const endD = parseDate(end);
  while (cur <= endD) {
    const day = cur.getDay();
    if (day === 0 || day === 6) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export function validateDateRange(
  start: string,
  end: string,
  rules: BusinessRules,
  now = new Date(),
  horaLevantamento?: string,
): DateValidationResult {
  const errors: string[] = [];
  if (!start || !end) {
    return { valid: false, errors: ['Selecione as datas de início e fim.'], days: 0 };
  }
  if (parseDate(end) < parseDate(start)) {
    return { valid: false, errors: ['A data de fim deve ser igual ou posterior à de início.'], days: 0 };
  }

  const days = daysBetweenInclusive(start, end);

  if (days < rules.minDiasAluguer) {
    errors.push(`Mínimo de ${rules.minDiasAluguer} dia(s) de aluguer.`);
  }
  if (days > rules.maxDiasAluguer) {
    errors.push(`Máximo de ${rules.maxDiasAluguer} dias por reserva.`);
  }
  if (!rules.permitirFimSemana && hasWeekendInRange(start, end)) {
    errors.push('Reservas ao fim de semana não estão permitidas pelas regras actuais.');
  }

  const horaRef = horaLevantamento ?? rules.horaLevantamento;
  const startAt = parseDate(start);
  startAt.setHours(
    Number(horaRef.split(':')[0]) || 8,
    Number(horaRef.split(':')[1]) || 0,
    0,
    0,
  );
  const minStart = new Date(now.getTime() + rules.antecedenciaMinimaHoras * 3_600_000);
  if (startAt < minStart) {
    errors.push(`Reserva com pelo menos ${rules.antecedenciaMinimaHoras}h de antecedência.`);
  }

  const maxStart = new Date(now);
  maxStart.setDate(maxStart.getDate() + rules.antecedenciaMaximaDias);
  if (startAt > maxStart) {
    errors.push(`Só é possível reservar até ${rules.antecedenciaMaximaDias} dias à frente.`);
  }

  return { valid: errors.length === 0, errors, days };
}

export function isVehicleAvailable(
  vehicleId: number,
  start: string,
  end: string,
  reservations: Reservation[],
  blocks: BlockedPeriod[],
  excludeReservationId?: string,
): { available: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  for (const r of reservations) {
    if (r.id === excludeReservationId) continue;
    if (r.vehicleId !== vehicleId) continue;
    if (!BLOCKING_STATUSES.includes(r.status)) continue;
    if (rangesOverlap(start, end, r.dataInicio, r.dataFim)) {
      conflicts.push(`Viatura indisponível de ${fmtPT(r.dataInicio)} a ${fmtPT(r.dataFim)} — já reservada para esse período.`);
    }
  }

  for (const b of blocks) {
    if (b.vehicleId !== null && b.vehicleId !== vehicleId) continue;
    if (rangesOverlap(start, end, b.dataInicio, b.dataFim)) {
      conflicts.push(
        b.vehicleId === null
          ? `Bloqueio global: ${b.motivo}${b.descricao ? ` — ${b.descricao}` : ''}`
          : `Bloqueio: ${b.motivo}${b.descricao ? ` — ${b.descricao}` : ''}`,
      );
    }
  }

  return { available: conflicts.length === 0, conflicts };
}

export function getSoldVehicleIds(reservations: Reservation[]): Set<number> {
  const ids = new Set<number>();
  for (const r of reservations) {
    if (SOLD_STATUSES.includes(r.status)) ids.add(r.vehicleId);
  }
  return ids;
}

export function isSoldVehicle(vehicleId: number, reservations: Reservation[]): boolean {
  return getSoldVehicleIds(reservations).has(vehicleId);
}

export function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' });
}

export function dateStatusForVehicle(
  vehicleId: number,
  date: string,
  reservations: Reservation[],
  blocks: BlockedPeriod[],
): 'livre' | 'reservado' | 'bloqueado' {
  for (const b of blocks) {
    if (b.vehicleId !== null && b.vehicleId !== vehicleId) continue;
    if (rangesOverlap(date, date, b.dataInicio, b.dataFim)) return 'bloqueado';
  }
  for (const r of reservations) {
    if (r.vehicleId !== vehicleId) continue;
    if (!BLOCKING_STATUSES.includes(r.status)) continue;
    if (rangesOverlap(date, date, r.dataInicio, r.dataFim)) return 'reservado';
  }
  return 'livre';
}
