import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { GrupoXitique, MembroXitique, EstadoGrupo, InscricaoXitique, EstadoMembroXitique } from '../types/xitique';
import { useNotifications } from './NotificationsContext';

const GRUPOS_KEY     = 'rentcar:xitique:v2';
const INSCRICOES_KEY = 'rentcar:xitique:inscricoes:v2';
// Legacy keys for migration
const LEGACY_KEY     = 'rentcar:xitique:v1';
const LEGACY_INSC    = 'rentcar:xitique:inscricoes:v1';

const DEFAULT_MAX    = 10;
const DEFAULT_QUOTA  = 30_000;

function novoGrupo(nome: string, maxMembros = DEFAULT_MAX, quotaMT = DEFAULT_QUOTA, dataInicio?: string): GrupoXitique {
  return {
    id: `g${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nome,
    maxMembros,
    quotaMT,
    premioMT: maxMembros * quotaMT,
    membros: [],
    sorteios: [],
    estadoGrupo: 'Aberto',
    mesAtual: 1,
    dataInicio,
  };
}

// ── Normalização de membros vindos do storage ─────────────────────────────────
const estadosMembro: EstadoMembroXitique[] = ['Pendente', 'Aceite', 'Sorteado'];

function normalizeMembro(raw: MembroXitique & { jaSorteado?: boolean; pagamentoConfirmado?: boolean }): MembroXitique {
  const estado: EstadoMembroXitique = estadosMembro.includes(raw.estado)
    ? raw.estado
    : raw.jaSorteado ? 'Sorteado' : raw.pagamentoConfirmado ? 'Aceite' : 'Pendente';
  return { id: raw.id, nome: raw.nome, estado, pagamentoMes: raw.pagamentoMes ?? false, mesesPagos: raw.mesesPagos ?? [], pagamentos: raw.pagamentos ?? {}, userId: raw.userId };
}

function normalizeGrupo(g: GrupoXitique): GrupoXitique {
  return { ...g, membros: (g.membros ?? []).map(m => normalizeMembro(m as MembroXitique & { jaSorteado?: boolean; pagamentoConfirmado?: boolean })) };
}

// ── Migration from v1 (single group) → v2 (array of groups) ─────────────────
function loadGrupos(): GrupoXitique[] {
  const saved = localStorage.getItem(GRUPOS_KEY);
  if (saved) return (JSON.parse(saved) as GrupoXitique[]).map(normalizeGrupo);

  // Migrate from v1
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    const old = JSON.parse(legacy) as { membros?: MembroXitique[]; sorteios?: GrupoXitique['sorteios']; estadoGrupo?: EstadoGrupo; mesAtual?: number };
    const g: GrupoXitique = {
      id: 'g_legado',
      nome: 'Grupo A',
      maxMembros: DEFAULT_MAX,
      quotaMT: DEFAULT_QUOTA,
      premioMT: DEFAULT_MAX * DEFAULT_QUOTA,
      membros: (old.membros ?? []).map(m => normalizeMembro(m as MembroXitique & { jaSorteado?: boolean; pagamentoConfirmado?: boolean })),
      sorteios: old.sorteios ?? [],
      estadoGrupo: old.estadoGrupo ?? 'Aberto',
      mesAtual: old.mesAtual ?? 1,
    };
    return [g];
  }

  return [];
}

function loadInscricoes(): InscricaoXitique[] {
  const saved = localStorage.getItem(INSCRICOES_KEY);
  if (saved) return JSON.parse(saved);

  // Migrate from v1: assign to the legacy group
  const legacy = localStorage.getItem(LEGACY_INSC);
  if (legacy) {
    const old = JSON.parse(legacy) as Omit<InscricaoXitique, 'grupoId'>[];
    return old.map(i => ({ ...i, grupoId: 'g_legado' }));
  }

  return [];
}

// ── Context type ─────────────────────────────────────────────────────────────
interface XitiqueContextType {
  grupos: GrupoXitique[];
  inscricoes: InscricaoXitique[];
  criarGrupo: (nome: string, maxMembros: number, quotaMT: number, dataInicio?: string) => void;
  definirDataInicio: (grupoId: string, dataInicio: string) => void;
  addMembro: (grupoId: string, nome: string, userId?: string) => void;
  removeMembro: (grupoId: string, id: string) => void;
  confirmarPagamento: (grupoId: string, id: string, metodo: string, referencia?: string) => void;
  realizarSorteio: (grupoId: string) => string | null;
  reiniciarGrupo: (grupoId: string) => void;
  adicionarInscricao: (dados: Pick<InscricaoXitique, 'nome' | 'telefone' | 'email' | 'grupoId'> & { userId?: string }) => 'aprovado' | 'rejeitado';
  aprovarInscricao: (id: string, userId?: string) => void;
  rejeitarInscricao: (id: string, motivo?: string) => void;
  gerarSequencia: (grupoId: string) => void;
  eliminarGrupo: (grupoId: string) => void;
}

const XitiqueContext = createContext<XitiqueContextType | null>(null);

export function XitiqueProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useNotifications();
  const [grupos,     setGrupos]     = useState<GrupoXitique[]>(loadGrupos);
  const [inscricoes, setInscricoes] = useState<InscricaoXitique[]>(loadInscricoes);

  useEffect(() => { localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos)); }, [grupos]);
  useEffect(() => { localStorage.setItem(INSCRICOES_KEY, JSON.stringify(inscricoes)); }, [inscricoes]);

  const updateGrupo = (grupoId: string, fn: (g: GrupoXitique) => GrupoXitique) =>
    setGrupos(prev => prev.map(g => g.id === grupoId ? fn(g) : g));

  const criarGrupo = (nome: string, maxMembros: number, quotaMT: number, dataInicio?: string) =>
    setGrupos(prev => [...prev, novoGrupo(nome.trim() || `Grupo ${String.fromCharCode(65 + prev.length)}`, maxMembros, quotaMT, dataInicio)]);

  const definirDataInicio = (grupoId: string, dataInicio: string) =>
    updateGrupo(grupoId, g => ({ ...g, dataInicio }));

  const addMembro = (grupoId: string, nome: string, userId?: string) => {
    updateGrupo(grupoId, g => {
      if (g.estadoGrupo !== 'Aberto' || g.membros.length >= g.maxMembros) return g;
      const novo: MembroXitique = { id: `m${Date.now()}`, nome: nome.trim(), estado: 'Pendente', pagamentoMes: false, mesesPagos: [], userId };
      const novosMembros = [...g.membros, novo];
      return { ...g, membros: novosMembros, estadoGrupo: novosMembros.length >= g.maxMembros ? 'EmAndamento' : 'Aberto' };
    });
  };

  const removeMembro = (grupoId: string, id: string) =>
    updateGrupo(grupoId, g => g.estadoGrupo !== 'Aberto' ? g : { ...g, membros: g.membros.filter(m => m.id !== id) });

  const confirmarPagamento = (grupoId: string, id: string, metodo: string, referencia?: string) => {
    updateGrupo(grupoId, g => {
      if (g.estadoGrupo !== 'EmAndamento') return g;
      const registo = { metodo, referencia, data: new Date().toISOString().split('T')[0] };
      return {
        ...g, membros: g.membros.map(m => {
          if (m.id !== id) return m;
          const jaRegistado = m.mesesPagos.includes(g.mesAtual);
          return {
            ...m,
            pagamentoMes: true,
            estado: m.estado === 'Sorteado' ? 'Sorteado' : 'Aceite',
            mesesPagos: jaRegistado ? m.mesesPagos : [...m.mesesPagos, g.mesAtual],
            pagamentos: { ...(m.pagamentos ?? {}), [g.mesAtual]: registo },
          };
        }),
      };
    });
  };

  const gerarSequencia = (grupoId: string) => {
    updateGrupo(grupoId, g => {
      // Grupo já em andamento sem sequência (dados legados): gera a partir dos restantes
      if (g.estadoGrupo === 'EmAndamento' && !g.sequencia) {
        const feitos = [...g.sorteios].sort((a, b) => a.mes - b.mes)
          .map(s => g.membros.find(m => m.nome === s.vencedor)?.id ?? '');
        const restantes = g.membros.filter(m => m.estado !== 'Sorteado').map(m => m.id);
        for (let i = restantes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [restantes[i], restantes[j]] = [restantes[j], restantes[i]];
        }
        return { ...g, sequencia: [...feitos, ...restantes] };
      }
      if (g.estadoGrupo !== 'Aberto' || g.membros.length < g.maxMembros) return g;
      const ids = g.membros.map(m => m.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      return { ...g, sequencia: ids, estadoGrupo: 'EmAndamento' };
    });
  };

  const realizarSorteio = (grupoId: string): string | null => {
    const g = grupos.find(g => g.id === grupoId);
    if (!g || g.estadoGrupo !== 'EmAndamento') return null;
    if (!g.membros.every(m => m.pagamentoMes)) return null;
    if (!g.sequencia || g.sequencia.length === 0) return null;

    const vencedorId = g.sequencia[g.mesAtual - 1];
    const vencedor = g.membros.find(m => m.id === vencedorId);
    if (!vencedor) return null;

    const grupoConcluido = g.mesAtual === g.maxMembros;

    updateGrupo(grupoId, g => ({
      ...g,
      membros: g.membros.map(m => ({ ...m, estado: m.id === vencedorId ? 'Sorteado' : m.estado, pagamentoMes: false })),
      sorteios: [...g.sorteios, { mes: g.mesAtual, vencedor: vencedor.nome, valorPremio: g.premioMT }],
      mesAtual: grupoConcluido ? g.maxMembros : g.mesAtual + 1,
      estadoGrupo: grupoConcluido ? 'Concluido' : 'EmAndamento',
    }));

    return vencedor.nome;
  };

  const reiniciarGrupo = (grupoId: string) =>
    updateGrupo(grupoId, g => ({ ...g, membros: [], sorteios: [], estadoGrupo: 'Aberto', mesAtual: 1, sequencia: undefined }));

  const adicionarInscricao = (dados: Pick<InscricaoXitique, 'nome' | 'telefone' | 'email' | 'grupoId'> & { userId?: string }): 'aprovado' | 'rejeitado' => {
    const grupo = grupos.find(g => g.id === dados.grupoId);
    const podeEntrar = !!(grupo && grupo.estadoGrupo === 'Aberto' && grupo.membros.length < grupo.maxMembros);
    const motivo = !grupo
      ? 'Grupo não encontrado.'
      : grupo.estadoGrupo !== 'Aberto'
        ? 'O grupo já está em andamento ou foi concluído.'
        : 'O grupo atingiu o número máximo de membros.';

    const nova: InscricaoXitique = {
      id: `insc${Date.now()}`,
      grupoId: dados.grupoId,
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      email: dados.email.trim(),
      status: podeEntrar ? 'aprovado' : 'rejeitado',
      dataCriacao: new Date().toISOString().split('T')[0],
      motivoRejeicao: podeEntrar ? undefined : motivo,
    };
    setInscricoes(prev => [...prev, nova]);

    if (podeEntrar && grupo) {
      addMembro(dados.grupoId, dados.nome.trim(), dados.userId);
      addNotification(
        dados.userId ?? 'client',
        'Inscrição Confirmada no Xitique',
        `Bem-vindo ao grupo "${grupo.nome}"! Aguarde as instruções de pagamento do administrador.`,
        'success',
        undefined,
        '/cliente/xitique'
      );
    } else {
      addNotification(
        dados.userId ?? 'client',
        'Inscrição Recusada',
        `Não foi possível inscrevê-lo no grupo "${grupo?.nome ?? ''}": ${motivo}`,
        'error',
        undefined,
        '/cliente/xitique'
      );
    }

    return podeEntrar ? 'aprovado' : 'rejeitado';
  };

  const aprovarInscricao = (id: string, userId?: string) => {
    const insc = inscricoes.find(i => i.id === id);
    if (!insc) return;
    const g = grupos.find(g => g.id === insc.grupoId);
    if (g && g.estadoGrupo === 'Aberto' && g.membros.length < g.maxMembros) {
      addMembro(insc.grupoId, insc.nome, userId);
    }
    setInscricoes(prev => prev.map(i => i.id === id ? { ...i, status: 'aprovado' } : i));
  };

  const rejeitarInscricao = (id: string, motivo?: string) =>
    setInscricoes(prev => prev.map(i => i.id === id ? { ...i, status: 'rejeitado', motivoRejeicao: motivo ?? '' } : i));

  const eliminarGrupo = (grupoId: string) => {
    const g = grupos.find(g => g.id === grupoId);
    if (!g || g.estadoGrupo !== 'Concluido') return;
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
    setInscricoes(prev => prev.filter(i => i.grupoId !== grupoId));
  };

  return (
    <XitiqueContext.Provider value={{ grupos, inscricoes, criarGrupo, definirDataInicio, addMembro, removeMembro, confirmarPagamento, realizarSorteio, reiniciarGrupo, adicionarInscricao, aprovarInscricao, rejeitarInscricao, gerarSequencia, eliminarGrupo }}>
      {children}
    </XitiqueContext.Provider>
  );
}

export function useXitique() {
  const ctx = useContext(XitiqueContext);
  if (!ctx) throw new Error('useXitique must be used within XitiqueProvider');
  return ctx;
}
