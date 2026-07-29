export type EstadoMembroXitique = 'Pendente' | 'Aceite' | 'Sorteado';

export interface RegistoPagamento {
  metodo: string;
  referencia?: string;
  data: string;
}

export interface MembroXitique {
  id: string;
  nome: string;
  estado: EstadoMembroXitique;
  pagamentoMes: boolean;
  mesesPagos: number[];
  pagamentos?: Record<number, RegistoPagamento>;
  userId?: string;
}

export interface RegistoSorteio {
  mes: number;
  vencedor: string;
  valorPremio: number;
}

export type EstadoGrupo = 'Aberto' | 'EmAndamento' | 'Concluido';

export interface GrupoXitique {
  id: string;
  nome: string;
  maxMembros: number;
  quotaMT: number;
  premioMT: number;
  membros: MembroXitique[];
  sorteios: RegistoSorteio[];
  estadoGrupo: EstadoGrupo;
  mesAtual: number;
  dataInicio?: string;
  sequencia?: string[]; // IDs dos membros na ordem em que recebem o prémio
}

export interface InscricaoXitique {
  id: string;
  grupoId: string;
  nome: string;
  telefone: string;
  email: string;
  status: 'aguarda_validacao' | 'aprovado' | 'rejeitado';
  dataCriacao: string;
  motivoRejeicao?: string;
}
