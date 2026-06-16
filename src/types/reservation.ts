export type ReservationStatus =
  // ── Aluguer ──
  | 'pendente'
  | 'confirmada'
  | 'pronta_levantamento'
  | 'ativa'
  | 'devolucao_pendente'
  | 'concluida'
  | 'cancelada'
  // ── Compra ──
  | 'compra_aprovada'
  | 'entrada_paga'
  | 'em_prestacao'
  | 'prestacao_atraso'
  | 'liquidada';

export type BlockReason = 'manutencao' | 'reserva_interna' | 'indisponivel' | 'outro';

export interface Prestacao {
  numero: number;          // 1-based index
  dataVencimento: string;  // ISO date
  valor: number;           // valor acordado/previsto
  valorPago?: number;      // valor efectivamente recebido (pode ser > valor)
  paga: boolean;
  dataPagamento?: string;  // ISO date when marked paid
}

export interface Reservation {
  id: string;
  vehicleId: number;
  userId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  dataInicio: string;
  dataFim: string;
  horaLevantamento: string;
  horaDevolucao: string;
  motivoViagem?: string;
  status: ReservationStatus;
  valorTotal: number;
  deposito: number;
  createdAt: string;
  notas?: string;
  localLevantamento?: string;
  localDevolucao?: string;
  motoristaId?: string;
  totalPrestacoes?: number;
  prestacoesPagas?: number;
  prestacoes?: Prestacao[];  // plano detalhado de prestações
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
  // Limites temporais
  minDiasAluguer: number;
  maxDiasAluguer: number;
  antecedenciaMinimaHoras: number;
  antecedenciaMaximaDias: number;
  bufferHorasEntreReservas: number;
  // Depósito & caução
  depositoPercentual: number;
  caucaoValor: number;
  // Taxas fixas
  taxaLimpeza: number;
  taxaLogistica: number;
  seguroDiario: number;
  taxaCombustivel: number;
  taxaCondutorAdicional: number;
  // Quilómetros
  kmIncluidosPorDia: number;
  precoKmExtra: number;
  // Penalizações
  penalizacaoAtrasoPorHora: number;
  taxaCancelamento: number;
  // Descontos
  descontoSemanalPercentual: number;
  descontoQuinzenalPercentual: number;
  descontoMensalPercentual: number;
  // Configurações gerais
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
