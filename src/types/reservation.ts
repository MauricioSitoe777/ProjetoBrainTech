export type ReservationStatus =
  | 'pendente'
  | 'confirmada'
  | 'ativa'
  | 'concluida'
  | 'cancelada';

export type BlockReason = 'manutencao' | 'reserva_interna' | 'indisponivel' | 'outro';

export interface Reservation {
  id: string;
  vehicleId: number;
  userId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  dataInicio: string;
  dataFim: string;
  status: ReservationStatus;
  valorTotal: number;
  deposito: number;
  createdAt: string;
  notas?: string;
}

export interface BlockedPeriod {
  id: string;
  vehicleId: number | null;
  dataInicio: string;
  dataFim: string;
  motivo: BlockReason;
  descricao?: string;
}

export interface BusinessRules {
  minDiasAluguer: number;
  maxDiasAluguer: number;
  antecedenciaMinimaHoras: number;
  antecedenciaMaximaDias: number;
  bufferHorasEntreReservas: number;
  depositoPercentual: number;
  taxaLimpeza: number;
  taxaLogistica: number;
  descontoSemanalPercentual: number;
  descontoMensalPercentual: number;
  permitirFimSemana: boolean;
  horaLevantamento: string;
  horaDevolucao: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: string[];
}

export interface DateValidationResult {
  valid: boolean;
  errors: string[];
  days: number;
}
