export type UserRole = 'admin' | 'cliente';

export type UserStatus = 'ativo' | 'inativo' | 'suspenso' | 'pendente';

export type UserRegularity = 'regular' | 'pendente' | 'inadimplente';

export type UserRestriction = 'nenhuma' | 'blacklisted';

export type UserCategory = 'func_publico' | 'func_privado' | 'empreendedor';

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  status: UserStatus;
  regularity: UserRegularity;
  restriction: UserRestriction;
  category?: UserCategory;
  salario?: number;
  avatar?: string;
  dataCriacao: string;
  ultimoAcesso: string;
  totalAlugueres: number;
  bi?: string;
  nuit?: string;
  documentos?: {
    bi?: string | boolean;
    nuit?: string | boolean;
    declaracao_rendimento?: string | boolean;
    contrato_trabalho?: string | boolean;
    carta_conducao?: string | boolean;
    declaracao_bairro?: string | boolean;
  };
  endereco?: string;
  password?: string;
  xitique?: boolean;
  motivoSuspensao?: string;
  mustChangePassword?: boolean;
  passwordChangedByUser?: boolean;
}

export interface Aluguer {
  id: string;
  userId: string;
  viatura: string;
  matricula: string;
  dataInicio: string;
  dataFim: string;
  valor: number;
  status: 'ativo' | 'concluido' | 'cancelado';
}

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  xitique?: boolean;
}