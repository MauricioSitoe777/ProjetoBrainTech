export type EstadoMembroXitique = 'Pendente' | 'Aceite' | 'Sorteado';

export interface MembroXitique {
  id: string;
  nome: string;
  estado: EstadoMembroXitique;
  pagamentoMes: boolean;
  mesesPagos: number[];
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
}

export interface InscricaoXitique {
  id: string;
  grupoId: string;
  nome: string;
  telefone: string;
  email: string;
  status: 'aguarda_validacao' | 'aprovado' | 'rejeitado';
  dataCriacao: string;
}
