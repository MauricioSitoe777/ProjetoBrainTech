import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { GrupoXitique, MembroXitique, EstadoGrupo, InscricaoXitique, EstadoMembroXitique } from '../types/xitique';
import { useNotifications } from './NotificationsContext';
import { api } from '../lib/api';

const GRUPOS_KEY     = 'rentcar:xitique:v2';
const INSCRICOES_KEY = 'rentcar:xitique:inscricoes:v2';

const DEFAULT_MAX   = 10;
const DEFAULT_QUOTA = 30_000;

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

  const [grupos, setGrupos] = useState<GrupoXitique[]>(() => {
    const saved = localStorage.getItem(GRUPOS_KEY);
    return saved ? (JSON.parse(saved) as GrupoXitique[]).map(normalizeGrupo) : [];
  });

  const [inscricoes, setInscricoes] = useState<InscricaoXitique[]>(() => {
    const saved = localStorage.getItem(INSCRICOES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Load from API on mount
  useEffect(() => {
    api.get<GrupoXitique[]>('/xitique/grupos').then(data => {
      setGrupos(data.map(normalizeGrupo));
    }).catch(() => {});

    api.get<InscricaoXitique[]>('/xitique/inscricoes').then(data => {
      setInscricoes(data);
    }).catch(() => {});
  }, []);

  // Keep localStorage in sync as cache
  useEffect(() => { localStorage.setItem(GRUPOS_KEY,     JSON.stringify(grupos));     }, [grupos]);
  useEffect(() => { localStorage.setItem(INSCRICOES_KEY, JSON.stringify(inscricoes)); }, [inscricoes]);

  const patchGrupo = (grupoId: string, fn: (g: GrupoXitique) => GrupoXitique) =>
    setGrupos(prev => prev.map(g => g.id === grupoId ? fn(g) : g));

  // ── Grupos ────────────────────────────────────────────────────────────────

  const criarGrupo = (nome: string, maxMembros: number, quotaMT: number, dataInicio?: string) => {
    const nomeFinal = nome.trim() || `Grupo ${String.fromCharCode(65 + grupos.length)}`;
    const tempId = `g${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: GrupoXitique = {
      id: tempId,
      nome: nomeFinal,
      maxMembros,
      quotaMT,
      premioMT: maxMembros * quotaMT,
      membros: [],
      sorteios: [],
      estadoGrupo: 'Aberto',
      mesAtual: 1,
      dataInicio,
    };
    setGrupos(prev => [...prev, optimistic]);
    api.post<GrupoXitique>('/xitique/grupos', {
      nome:         nomeFinal,
      max_membros:  maxMembros,
      quota_mt:     quotaMT,
      premio_mt:    maxMembros * quotaMT,
      estado_grupo: 'Aberto',
      data_inicio:  dataInicio,
    }).then(created => {
      setGrupos(prev => prev.map(g => g.id === tempId ? normalizeGrupo(created) : g));
    }).catch(() => {});
  };

  const definirDataInicio = (grupoId: string, dataInicio: string) => {
    patchGrupo(grupoId, g => ({ ...g, dataInicio }));
    api.put(`/xitique/grupos/${grupoId}`, { data_inicio: dataInicio }).catch(() => {});
  };

  const eliminarGrupo = (grupoId: string) => {
    const g = grupos.find(g => g.id === grupoId);
    if (!g || g.estadoGrupo !== 'Concluido') return;
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
    setInscricoes(prev => prev.filter(i => i.grupoId !== grupoId));
    api.delete(`/xitique/grupos/${grupoId}`).catch(() => {});
  };

  // ── Membros ───────────────────────────────────────────────────────────────

  const addMembro = (grupoId: string, nome: string, userId?: string) => {
    patchGrupo(grupoId, g => {
      if (g.estadoGrupo !== 'Aberto' || g.membros.length >= g.maxMembros) return g;
      const novo: MembroXitique = {
        id: `m${Date.now()}`,
        nome: nome.trim(),
        estado: 'Pendente',
        pagamentoMes: false,
        mesesPagos: [],
        userId,
      };
      const novosMembros = [...g.membros, novo];
      const novoEstado: EstadoGrupo = novosMembros.length >= g.maxMembros ? 'EmAndamento' : 'Aberto';

      api.post<MembroXitique>(`/xitique/grupos/${grupoId}/membros`, {
        nome,
        estado: 'Pendente',
        user_id: userId ? (parseInt(userId, 10) || undefined) : undefined,
      }).then(created => {
        // Replace temp member with real one (real ID from DB)
        setGrupos(prev => prev.map(gr => {
          if (gr.id !== grupoId) return gr;
          return { ...gr, membros: gr.membros.map(m => m.id === novo.id ? normalizeMembro(created) : m) };
        }));
      }).catch(() => {});

      if (novoEstado !== g.estadoGrupo) {
        api.put(`/xitique/grupos/${grupoId}`, { estado_grupo: novoEstado }).catch(() => {});
      }

      return { ...g, membros: novosMembros, estadoGrupo: novoEstado };
    });
  };

  const removeMembro = (grupoId: string, id: string) => {
    patchGrupo(grupoId, g => {
      if (g.estadoGrupo !== 'Aberto') return g;
      api.delete(`/xitique/grupos/${grupoId}/membros/${id}`).catch(() => {});
      return { ...g, membros: g.membros.filter(m => m.id !== id) };
    });
  };

  const confirmarPagamento = (grupoId: string, id: string, metodo: string, referencia?: string) => {
    patchGrupo(grupoId, g => {
      if (g.estadoGrupo !== 'EmAndamento') return g;
      const registo = { metodo, referencia, data: new Date().toISOString().split('T')[0] };
      const novosMembros = g.membros.map(m => {
        if (m.id !== id) return m;
        const jaRegistado = m.mesesPagos.includes(g.mesAtual);
        const updated: MembroXitique = {
          ...m,
          pagamentoMes: true,
          estado: m.estado === 'Sorteado' ? 'Sorteado' : 'Aceite',
          mesesPagos: jaRegistado ? m.mesesPagos : [...m.mesesPagos, g.mesAtual],
          pagamentos: { ...(m.pagamentos ?? {}), [g.mesAtual]: registo },
        };
        api.put(`/xitique/grupos/${grupoId}/membros/${id}`, {
          estado:       updated.estado,
          pagamento_mes: true,
          meses_pagos:  updated.mesesPagos,
          pagamentos:   updated.pagamentos,
        }).catch(() => {});
        return updated;
      });
      return { ...g, membros: novosMembros };
    });
  };

  const gerarSequencia = (grupoId: string) => {
    patchGrupo(grupoId, g => {
      let sequencia: string[];
      let novoEstado = g.estadoGrupo;

      if (g.estadoGrupo === 'EmAndamento' && !g.sequencia) {
        const feitos = [...g.sorteios].sort((a, b) => a.mes - b.mes)
          .map(s => g.membros.find(m => m.nome === s.vencedor)?.id ?? '');
        const restantes = g.membros.filter(m => m.estado !== 'Sorteado').map(m => m.id);
        for (let i = restantes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [restantes[i], restantes[j]] = [restantes[j], restantes[i]];
        }
        sequencia = [...feitos, ...restantes];
      } else if (g.estadoGrupo === 'Aberto' && g.membros.length >= g.maxMembros) {
        const ids = g.membros.map(m => m.id);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        sequencia = ids;
        novoEstado = 'EmAndamento';
      } else {
        return g;
      }

      api.put(`/xitique/grupos/${grupoId}`, { sequencia, estado_grupo: novoEstado }).catch(() => {});
      return { ...g, sequencia, estadoGrupo: novoEstado };
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
    const novoMesAtual   = grupoConcluido ? g.maxMembros : g.mesAtual + 1;
    const novoEstado: EstadoGrupo = grupoConcluido ? 'Concluido' : 'EmAndamento';
    const novosSorteios  = [...g.sorteios, { mes: g.mesAtual, vencedor: vencedor.nome, valorPremio: g.premioMT }];

    patchGrupo(grupoId, gr => ({
      ...gr,
      membros: gr.membros.map(m => ({ ...m, estado: m.id === vencedorId ? 'Sorteado' : m.estado, pagamentoMes: false })),
      sorteios: novosSorteios,
      mesAtual: novoMesAtual,
      estadoGrupo: novoEstado,
    }));

    // Sync grupo state
    api.put(`/xitique/grupos/${grupoId}`, {
      sorteios:     novosSorteios,
      mes_atual:    novoMesAtual,
      estado_grupo: novoEstado,
    }).catch(() => {});

    // Sync winner member
    api.put(`/xitique/grupos/${grupoId}/membros/${vencedorId}`, {
      estado:        'Sorteado',
      pagamento_mes: false,
    }).catch(() => {});

    // Sync all other members (reset pagamentoMes)
    g.membros.forEach(m => {
      if (m.id !== vencedorId) {
        api.put(`/xitique/grupos/${grupoId}/membros/${m.id}`, { pagamento_mes: false }).catch(() => {});
      }
    });

    return vencedor.nome;
  };

  const reiniciarGrupo = (grupoId: string) => {
    const g = grupos.find(g => g.id === grupoId);
    if (!g) return;
    const memberIds = g.membros.map(m => m.id);

    patchGrupo(grupoId, gr => ({
      ...gr,
      membros: [],
      sorteios: [],
      estadoGrupo: 'Aberto',
      mesAtual: 1,
      sequencia: undefined,
    }));

    api.put(`/xitique/grupos/${grupoId}`, {
      estado_grupo: 'Aberto',
      mes_atual:    1,
      sorteios:     [],
      sequencia:    null,
    }).catch(() => {});

    memberIds.forEach(mid => {
      api.delete(`/xitique/grupos/${grupoId}/membros/${mid}`).catch(() => {});
    });
  };

  // ── Inscrições ────────────────────────────────────────────────────────────

  const adicionarInscricao = (dados: Pick<InscricaoXitique, 'nome' | 'telefone' | 'email' | 'grupoId'> & { userId?: string }): 'aprovado' | 'rejeitado' => {
    const grupo = grupos.find(g => g.id === dados.grupoId);
    const podeEntrar = !!(grupo && grupo.estadoGrupo === 'Aberto' && grupo.membros.length < grupo.maxMembros);
    const motivo = !grupo
      ? 'Grupo não encontrado.'
      : grupo.estadoGrupo !== 'Aberto'
        ? 'O grupo já está em andamento ou foi concluído.'
        : 'O grupo atingiu o número máximo de membros.';

    const status: InscricaoXitique['status'] = podeEntrar ? 'aprovado' : 'rejeitado';
    const tempId = `insc${Date.now()}`;
    const nova: InscricaoXitique = {
      id: tempId,
      grupoId: dados.grupoId,
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      email: dados.email.trim(),
      status,
      dataCriacao: new Date().toISOString().split('T')[0],
      motivoRejeicao: podeEntrar ? undefined : motivo,
    };
    setInscricoes(prev => [...prev, nova]);

    api.post<InscricaoXitique>('/xitique/inscricoes', {
      grupo_id: dados.grupoId,
      nome:     nova.nome,
      telefone: nova.telefone,
      email:    nova.email,
    }).then(created => {
      setInscricoes(prev => prev.map(i => i.id === tempId ? { ...created, status } : i));
      // Set final status on the created inscricao
      if (status !== 'aguarda_validacao') {
        api.put(`/xitique/inscricoes/${created.id}`, {
          status,
          motivo_rejeicao: podeEntrar ? undefined : motivo,
        }).catch(() => {});
      }
    }).catch(() => {});

    if (podeEntrar && grupo) {
      addMembro(dados.grupoId, dados.nome.trim(), dados.userId);
      addNotification(
        dados.userId ?? 'client',
        'Inscrição Confirmada no Xitique',
        `Bem-vindo ao grupo "${grupo.nome}"! Aguarde as instruções de pagamento do administrador.`,
        'success',
        undefined,
        '/cliente/xitique',
      );
    } else {
      addNotification(
        dados.userId ?? 'client',
        'Inscrição Recusada',
        `Não foi possível inscrevê-lo no grupo "${grupo?.nome ?? ''}": ${motivo}`,
        'alert',
        undefined,
        '/cliente/xitique',
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
    api.put(`/xitique/inscricoes/${id}`, { status: 'aprovado' }).catch(() => {});
  };

  const rejeitarInscricao = (id: string, motivo?: string) => {
    setInscricoes(prev => prev.map(i => i.id === id ? { ...i, status: 'rejeitado', motivoRejeicao: motivo ?? '' } : i));
    api.put(`/xitique/inscricoes/${id}`, { status: 'rejeitado', motivo_rejeicao: motivo ?? '' }).catch(() => {});
  };

  return (
    <XitiqueContext.Provider value={{
      grupos, inscricoes,
      criarGrupo, definirDataInicio, addMembro, removeMembro,
      confirmarPagamento, realizarSorteio, reiniciarGrupo,
      adicionarInscricao, aprovarInscricao, rejeitarInscricao,
      gerarSequencia, eliminarGrupo,
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
