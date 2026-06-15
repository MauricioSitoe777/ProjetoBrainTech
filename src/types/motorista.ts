export type MotoristaSatus = 'disponivel' | 'em_servico' | 'inativo';

export interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  bi?: string;
  carta?: string;
  status: MotoristaSatus;
  observacoes?: string;
  dataCriacao: string;
}
