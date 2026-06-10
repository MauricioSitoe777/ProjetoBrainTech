export type EstadoMembroXitique = 'Pendente' | 'Aceite' | 'Sorteado';

export interface MembroXitique {
  id: string;
  nome: string;
  estado: EstadoMembroXitique;
  pagamentoMes: boolean; // pagamento do mês corrente — reset após cada sorteio
  mesesPagos: number[];  // histórico: meses em que o pagamento foi confirmado
  userId?: string;       // ligação ao User autenticado (definido quando aprovado via inscrição)
}

export interface RegistoSorteio {
  mes: number;
  vencedor: string;
  valorPremio: number;
}

export type EstadoGrupo = 'Aberto' | 'EmAndamento' | 'Concluido';

export interface InscricaoXitique {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: 'aguarda_validacao' | 'aprovado' | 'rejeitado';
  dataCriacao: string;
}
