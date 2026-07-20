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
  numero: number;               // 1-based index
  dataVencimento: string;       // ISO date
  valor: number;                // valor acordado/previsto
  valorPago?: number;           // valor efectivamente recebido (pode ser > valor)
  paga: boolean;
  dataPagamento?: string;       // ISO date when marked paid
  horaPagamento?: string;       // HH:mm
  formaPagamento?: string;      // 'dinheiro' | 'mpesa' | 'emola' | 'transferencia' | 'cheque' | 'outros'
  referenciaPagamento?: string; // n.º transacção / comprovativo
  notasPagamento?: string;
}

export interface PedidoExtensao {
  dias: number;
  novaDataFim: string;
  motivo: string;
  dataSubmissao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  respostaAdmin?: string;
  dataResposta?: string;
}

export interface Reservation {
  id: string;
  vehicleId: number;
  userId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientPhone2?: string;
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
  motivoCancelamento?: string;
  localLevantamento?: string;
  localDevolucao?: string;
  motoristaId?: string;
  totalPrestacoes?: number;
  prestacoesPagas?: number;
  prestacoes?: Prestacao[];  // plano detalhado de prestações
  horaPagamento?: string;
  formaPagamento?: string;
  referenciaPagamento?: string;
  pedidoExtensao?: PedidoExtensao;
  multaAtraso?: number; // multa por atraso na devolução (MT)
  estadoViaturaDevolucao?: string; // observação sobre o estado da viatura registada na devolução
  dataRegistoDevolucao?: string;   // data (ISO) em que a observação foi registada
  reembolsoValor?: number;         // valor reembolsado ao cliente (caução/taxas) por a viatura ter voltado em bom estado
  reembolsoDescricao?: string;     // itens reembolsados, ex: "Caução + Taxa de limpeza"
  dataReembolso?: string;          // data (ISO) em que o reembolso foi registado
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
