import type { BusinessRules } from '../types/reservation';

export function parseDailyRateFromPrice(price: string): number {
  return Number(String(price).replace(/[^\d]/g, '')) || 0;
}

export function calculateRentalTotal(
  dailyRate: number,
  days: number,
  rules: BusinessRules,
): { subtotal: number; desconto: number; deposito: number; total: number } {
  const subtotal = dailyRate * days;
  let descontoPct = 0;
  if (days >= 30) descontoPct = rules.descontoMensalPercentual;
  else if (days >= 7) descontoPct = rules.descontoSemanalPercentual;

  const desconto = subtotal * (descontoPct / 100);
  const afterDiscount = subtotal - desconto;
  const deposito = Math.round(afterDiscount * (rules.depositoPercentual / 100));
  const total = Math.round(afterDiscount + rules.taxaLimpeza + rules.taxaLogistica + deposito);

  return { subtotal, desconto, deposito, total };
}
