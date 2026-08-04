import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Transacao, Divida, TipoTransacao, CategoriaTransacao, StatusTransacao, StatusDivida } from '../types/finance';
import { api } from '../lib/api';

const TX_KEY  = 'rentcar:finance:transacoes:v1';
const DIV_KEY = 'rentcar:finance:dividas:v1';

interface FinanceContextType {
  transacoes: Transacao[];
  dividas: Divida[];
  totalEntradas: number;
  totalSaidas: number;
  lucroLiquido: number;
  totalDividasPendentes: number;
  addTransacao: (t: Omit<Transacao, 'id'>) => void;
  updateTransacao: (id: string, data: Partial<Transacao>) => void;
  deleteTransacao: (id: string) => void;
  addDivida: (d: Omit<Divida, 'id'>) => void;
  updateDivida: (id: string, data: Partial<Divida>) => void;
  registarPagamentoDivida: (id: string, valor: number) => void;
  deleteDivida: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    const s = localStorage.getItem(TX_KEY);
    return s ? JSON.parse(s) : [];
  });

  const [dividas, setDividas] = useState<Divida[]>(() => {
    const s = localStorage.getItem(DIV_KEY);
    return s ? JSON.parse(s) : [];
  });

  // Load from API on mount; localStorage stays as fallback
  useEffect(() => {
    api.get<Transacao[]>('/finance/transacoes').then(data => {
      setTransacoes(data);
    }).catch(() => {});

    api.get<Divida[]>('/finance/dividas').then(data => {
      setDividas(data);
    }).catch(() => {});
  }, []);

  // Keep localStorage in sync as cache
  useEffect(() => { localStorage.setItem(TX_KEY,  JSON.stringify(transacoes)); }, [transacoes]);
  useEffect(() => { localStorage.setItem(DIV_KEY, JSON.stringify(dividas));    }, [dividas]);

  const totalEntradas = useMemo(() =>
    transacoes.filter(t => t.tipo === 'entrada' && t.status === 'pago').reduce((s, t) => s + t.valor, 0),
  [transacoes]);

  const totalSaidas = useMemo(() =>
    transacoes.filter(t => t.tipo === 'saida' && t.status === 'pago').reduce((s, t) => s + t.valor, 0),
  [transacoes]);

  const lucroLiquido = totalEntradas - totalSaidas;

  const totalDividasPendentes = useMemo(() =>
    dividas.filter(d => d.status !== 'quitado').reduce((s, d) => s + (d.valorTotal - d.valorPago), 0),
  [dividas]);

  // ── Transações ────────────────────────────────────────────────────────────

  const addTransacao = (t: Omit<Transacao, 'id'>) => {
    const tempId = `tx${Date.now()}`;
    setTransacoes(prev => [{ ...t, id: tempId }, ...prev]);
    api.post<Transacao>('/finance/transacoes', {
      tipo: t.tipo,
      categoria: t.categoria,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data,
      status: t.status,
      cliente_nome: t.clienteNome,
      referencia: t.referencia,
    }).then(created => {
      setTransacoes(prev => prev.map(tx => tx.id === tempId ? created : tx));
    }).catch(() => {});
  };

  const updateTransacao = (id: string, data: Partial<Transacao>) => {
    setTransacoes(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    api.put<Transacao>(`/finance/transacoes/${id}`, {
      status:      data.status,
      valor:       data.valor,
      descricao:   data.descricao,
      cliente_nome: data.clienteNome,
      referencia:  data.referencia,
    }).catch(() => {});
  };

  const deleteTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id));
    api.delete(`/finance/transacoes/${id}`).catch(() => {});
  };

  // ── Dívidas ───────────────────────────────────────────────────────────────

  const addDivida = (d: Omit<Divida, 'id'>) => {
    const tempId = `div${Date.now()}`;
    setDividas(prev => [{ ...d, id: tempId }, ...prev]);
    api.post<Divida>('/finance/dividas', {
      cliente_nome:     d.clienteNome,
      cliente_telefone: d.clienteTelefone,
      descricao:        d.descricao,
      valor_total:      d.valorTotal,
      valor_pago:       d.valorPago,
      data_vencimento:  d.dataVencimento,
      status:           d.status,
    }).then(created => {
      setDividas(prev => prev.map(dv => dv.id === tempId ? created : dv));
    }).catch(() => {});
  };

  const updateDivida = (id: string, data: Partial<Divida>) => {
    setDividas(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    api.put<Divida>(`/finance/dividas/${id}`, {
      valor_pago: data.valorPago,
      status:     data.status,
      descricao:  data.descricao,
    }).catch(() => {});
  };

  const registarPagamentoDivida = (id: string, valor: number) => {
    setDividas(prev => prev.map(d => {
      if (d.id !== id) return d;
      const novoPago   = Math.min(d.valorPago + valor, d.valorTotal);
      const novoStatus: StatusDivida = novoPago >= d.valorTotal ? 'quitado'
        : novoPago > 0 ? 'parcial' : 'pendente';
      api.put<Divida>(`/finance/dividas/${id}`, { valor_pago: novoPago, status: novoStatus }).catch(() => {});
      return { ...d, valorPago: novoPago, status: novoStatus };
    }));
  };

  const deleteDivida = (id: string) => {
    setDividas(prev => prev.filter(d => d.id !== id));
    api.delete(`/finance/dividas/${id}`).catch(() => {});
  };

  return (
    <FinanceContext.Provider value={{
      transacoes, dividas,
      totalEntradas, totalSaidas, lucroLiquido, totalDividasPendentes,
      addTransacao, updateTransacao, deleteTransacao,
      addDivida, updateDivida, registarPagamentoDivida, deleteDivida,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}

export const CATEGORIA_LABEL: Record<CategoriaTransacao, string> = {
  aluguer:      'Aluguer',
  compra_venda: 'Compra / Venda',
  xitique:      'Xitique',
  manutencao:   'Manutenção',
  salario:      'Salário',
  combustivel:  'Combustível',
  seguro:       'Seguro',
  outro:        'Outro',
};

export const STATUS_TX_LABEL: Record<StatusTransacao, { label: string; className: string }> = {
  pago:      { label: 'Pago',      className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pendente:  { label: 'Pendente',  className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  cancelado: { label: 'Cancelado', className: 'bg-zinc-700 text-white border-zinc-600' },
};

export const STATUS_DIV_LABEL: Record<StatusDivida, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  parcial:  { label: 'Parcial',  className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  quitado:  { label: 'Quitado',  className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};
