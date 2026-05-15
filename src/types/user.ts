export type UserRole = 'admin' | 'cliente';

export type UserStatus = 'ativo' | 'inativo' | 'suspenso';

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  dataCriacao: string;
  ultimoAcesso: string;
  totalAlugueres: number;
  bi?: string;
  endereco?: string;
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