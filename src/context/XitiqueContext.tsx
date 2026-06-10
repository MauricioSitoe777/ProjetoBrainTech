import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MembroXitique, RegistoSorteio, EstadoGrupo, InscricaoXitique, EstadoMembroXitique } from '../types/xitique';

const STORAGE_KEY    = 'rentcar:xitique:v1';
const INSCRICOES_KEY = 'rentcar:xitique:inscricoes:v1';
const NUM_MEMBROS    = 10;
const QUOTA_MT       = 30_000;
const PREMIO_MT      = NUM_MEMBROS * QUOTA_MT; // 300 000 MT

interface XitiqueState {
  membros: MembroXitique[];
  sorteios: RegistoSorteio[];
  estadoGrupo: EstadoGrupo;
  mesAtual: number;
}

interface XitiqueContextType {
  membros: MembroXitique[];
  sorteios: RegistoSorteio[];
  estadoGrupo: EstadoGrupo;
  mesAtual: number;
  quotaMT: number;
  premioMT: number;
  numMembros: number;
  // grupo
  addMembro: (nome: string) => void;
  removeMembro: (id: string) => void;
  confirmarPagamento: (id: string) => void;
  realizarSorteio: () => string | null;
  reiniciarGrupo: () => void;
  // lista de espera
  inscricoes: InscricaoXitique[];
  adicionarInscricao: (dados: Pick<InscricaoXitique, 'nome' | 'telefone' | 'email'>) => void;
  aprovarInscricao: (id: string, userId?: string) => void;
  rejeitarInscricao: (id: string) => void;
}

const defaultState: XitiqueState = {
  membros: [],
  sorteios: [],
  estadoGrupo: 'Aberto',
  mesAtual: 1,
};

const XitiqueContext = createContext<XitiqueContextType | null>(null);

type StoredMembroXitique = MembroXitique & {
  jaSorteado?: boolean;
  pagamentoConfirmado?: boolean;
};

const estadosMembro: EstadoMembroXitique[] = ['Pendente', 'Aceite', 'Sorteado'];

const normalizeMembro = (membro: StoredMembroXitique): MembroXitique => {
  const estado: EstadoMembroXitique = estadosMembro.includes(membro.estado)
    ? membro.estado
    : membro.jaSorteado ? 'Sorteado' : membro.pagamentoConfirmado ? 'Aceite' : 'Pendente';
  return {
    id: membro.id,
    nome: membro.nome,
    estado,
    pagamentoMes: (membro as MembroXitique).pagamentoMes ?? false,
    mesesPagos: (membro as MembroXitique).mesesPagos ?? [],
    userId: (membro as MembroXitique).userId,
  };
};

const normalizeState = (saved: XitiqueState): XitiqueState => ({
  ...defaultState,
  ...saved,
  membros: (saved.membros || []).map(membro => normalizeMembro(membro as StoredMembroXitique)),
});

export function XitiqueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<XitiqueState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : defaultState;
  });

  const [inscricoes, setInscricoes] = useState<InscricaoXitique[]>(() => {
    const saved = localStorage.getItem(INSCRICOES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(INSCRICOES_KEY, JSON.stringify(inscricoes));
  }, [inscricoes]);

  // ── Grupo ──────────────────────────────────────────────────────────────────

  const addMembro = (nome: string, userId?: string) => {
    if (state.estadoGrupo !== 'Aberto') return;
    if (state.membros.length >= NUM_MEMBROS) return;

    const novo: MembroXitique = {
      id: `m${Date.now()}`,
      nome: nome.trim(),
      estado: 'Pendente',
      pagamentoMes: false,
      mesesPagos: [],
      userId,
    };

    setState(prev => {
      const novosMembros = [...prev.membros, novo];
      const novoEstado = novosMembros.length >= NUM_MEMBROS ? 'EmAndamento' : 'Aberto';
      return { ...prev, membros: novosMembros, estadoGrupo: novoEstado };
    });
  };

  const removeMembro = (id: string) => {
    if (state.estadoGrupo !== 'Aberto') return;
    setState(prev => ({ ...prev, membros: prev.membros.filter(m => m.id !== id) }));
  };

  const confirmarPagamento = (id: string) => {
    if (state.estadoGrupo !== 'EmAndamento') return;
    setState(prev => ({
      ...prev,
      membros: prev.membros.map(m => {
        if (m.id !== id) return m;
        const jaRegistado = m.mesesPagos.includes(prev.mesAtual);
        return {
          ...m,
          pagamentoMes: true,
          estado: m.estado === 'Sorteado' ? 'Sorteado' : 'Aceite',
          mesesPagos: jaRegistado ? m.mesesPagos : [...m.mesesPagos, prev.mesAtual],
        };
      }),
    }));
  };

  const realizarSorteio = (): string | null => {
    if (state.estadoGrupo !== 'EmAndamento') return null;
    // TODOS os membros (incluindo já sorteados) devem ter pagamentoMes = true
    if (!state.membros.every(m => m.pagamentoMes === true)) return null;

    // Passo 1 — Filtragem estrita: apenas elegíveis (ainda não sorteados)
    const elegiveis = state.membros.filter(m => m.estado !== 'Sorteado');
    if (elegiveis.length === 0) return null;

    // Passo 2 — Cálculo aleatório dentro do universo elegível
    const indice = Math.floor(Math.random() * elegiveis.length);
    const vencedor = elegiveis[indice];

    const novoRegisto: RegistoSorteio = {
      mes: state.mesAtual,
      vencedor: vencedor.nome,
      valorPremio: PREMIO_MT,
    };

    // Gatilho de finalização: o sorteio do mês 10 foi computado
    const grupoConcluido = state.mesAtual === NUM_MEMBROS;
    const proximoMes = grupoConcluido ? NUM_MEMBROS : state.mesAtual + 1;

    // Passo 3 — Imutabilidade: marca o vencedor como Sorteado;
    // reset pagamentoMes = false para TODOS (incluindo já sorteados — continuam a pagar)
    setState(prev => ({
      ...prev,
      membros: prev.membros.map(m => ({
        ...m,
        estado: m.id === vencedor.id ? 'Sorteado' : m.estado,
        pagamentoMes: false,
      })),
      sorteios: [...prev.sorteios, novoRegisto],
      mesAtual: proximoMes,
      estadoGrupo: grupoConcluido ? 'Concluido' : 'EmAndamento',
    }));

    return vencedor.nome;
  };

  const reiniciarGrupo = () => setState(defaultState);

  // ── Lista de espera ────────────────────────────────────────────────────────

  const adicionarInscricao = (dados: Pick<InscricaoXitique, 'nome' | 'telefone' | 'email'>) => {
    const nova: InscricaoXitique = {
      id: `insc${Date.now()}`,
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      email: dados.email.trim(),
      status: 'aguarda_validacao',
      dataCriacao: new Date().toISOString().split('T')[0],
    };
    setInscricoes(prev => [...prev, nova]);
  };

  const aprovarInscricao = (id: string, userId?: string) => {
    const insc = inscricoes.find(i => i.id === id);
    if (!insc) return;
    // Promove para membro do grupo se ainda houver vaga
    if (state.estadoGrupo === 'Aberto' && state.membros.length < NUM_MEMBROS) {
      addMembro(insc.nome, userId);
    }
    setInscricoes(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'aprovado' } : i)
    );
  };

  const rejeitarInscricao = (id: string) => {
    setInscricoes(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'rejeitado' } : i)
    );
  };

  return (
    <XitiqueContext.Provider value={{
      membros: state.membros,
      sorteios: state.sorteios,
      estadoGrupo: state.estadoGrupo,
      mesAtual: state.mesAtual,
      quotaMT: QUOTA_MT,
      premioMT: PREMIO_MT,
      numMembros: NUM_MEMBROS,
      addMembro,
      removeMembro,
      confirmarPagamento,
      realizarSorteio,
      reiniciarGrupo,
      inscricoes,
      adicionarInscricao,
      aprovarInscricao,
      rejeitarInscricao,
    }}>
      {children}
    </XitiqueContext.Provider>
  );
}

export function useXitique() {
  const ctx = useContext(XitiqueContext);
  if (!ctx) throw new Error('useXitique must be used within XitiqueProvider');
  return ctx;
}
