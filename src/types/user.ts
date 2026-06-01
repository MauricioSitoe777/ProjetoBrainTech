export type UserRole = 'admin' | 'cliente';

export type UserStatus = 'ativo' | 'inativo' | 'suspenso' | 'pendente';

export type UserCategory = 'func_publico' | 'func_privado' | 'empreendedor';

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  status: UserStatus;
  category?: UserCategory;
  avatar?: string;
  dataCriacao: string;
  ultimoAcesso: string;
  totalAlugueres: number;
  bi?: string;
  nuit?: string;
  documentos?: {
    bi?: boolean;
    nuit?: boolean;
    declaracao_rendimento?: boolean;
    contrato_trabalho?: boolean;
    carta_conducao?: boolean;
    declaracao_bairro?: boolean;
  };
  endereco?: string;
  password?: string;
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
}