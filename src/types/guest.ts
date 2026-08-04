export type GuestStatus =
  | 'aguarda_documentos'
  | 'documentos_submetidos'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado';

export type GuestIntent = 'aluguer' | 'compra';
export type GuestCategory = 'func_publico' | 'func_privado' | 'empreendedor';

export interface Guest {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  intent: GuestIntent;
  category?: GuestCategory;
  withDriver?: boolean;
  status: GuestStatus;
  documentos: Record<string, string>;
  dataCriacao: string;
  vehicleName?: string;
  notaAdmin?: string;
  senhaGerada?: string;
}
