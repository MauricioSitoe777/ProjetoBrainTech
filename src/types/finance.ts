export type TipoTransacao = 'entrada' | 'saida';

export type CategoriaTransacao =
  | 'aluguer'
  | 'compra_venda'
  | 'xitique'
  | 'manutencao'
  | 'salario'
  | 'combustivel'
  | 'seguro'
  | 'outro';

export type StatusTransacao = 'pago' | 'pendente' | 'cancelado';

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  descricao: string;
  valor: number;
  data: string;         // YYYY-MM-DD
  status: StatusTransacao;
  clienteNome?: string;
  referencia?: string;
}

export type StatusDivida = 'pendente' | 'parcial' | 'quitado';

export interface Divida {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  dataCriacao: string;
  dataVencimento?: string;
  status: StatusDivida;
}
