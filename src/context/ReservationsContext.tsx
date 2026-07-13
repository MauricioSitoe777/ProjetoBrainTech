import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import type {
  AvailabilityResult,
  BlockedPeriod,
  BlockReason,
  BusinessRules,
  DateValidationResult,
  Prestacao,
  Reservation,
  ReservationStatus,
} from '../types/reservation';
import {
  DEFAULT_BUSINESS_RULES,
  mockBlockedPeriods,
  mockReservations,
} from '../data/reservationsMock';
import {
  isVehicleAvailable,
  validateDateRange,
} from '../lib/availability';
import { calculateRentalTotal, parseDailyRateFromPrice } from '../lib/rentalPricing';
import { useAuth } from './AuthContext';
import { VEHICLES } from '../data/constants';
import { useVehicles } from './VehiclesContext';
import { useNotifications } from './NotificationsContext';
import { api } from '../lib/api';

interface ReservationsContextType {
  reservations: Reservation[];
  blocks: BlockedPeriod[];
  rules: BusinessRules;
  updateRules: (data: Partial<BusinessRules>) => void;
  checkAvailability: (vehicleId: number, start: string, end: string, excludeId?: string) => AvailabilityResult;
  validateDates: (start: string, end: string, horaLevantamento?: string) => DateValidationResult;
  createReservation: (data: Omit<Reservation, 'id' | 'createdAt'>) => { ok: boolean; error?: string };
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  cancelReservation: (id: string, motivo?: string) => void;
  deleteReservation: (id: string) => void;
  addBlock: (data: Omit<BlockedPeriod, 'id'>) => void;
  removeBlock: (id: string) => void;
  getVehicleReservations: (vehicleId: number) => Reservation[];
  getClientReservations: (userId: string) => Reservation[];
  quoteRental: (vehicleId: number, start: string, end: string) => ReturnType<typeof calculateRentalTotal> & { days: number; dailyRate: number } | null;
  gerarPrestacoes: (id: string, semEntrada?: boolean, dataInicioCustom?: string, numPrestacoesCustom?: number) => void;
  marcarPrestacao: (reservationId: string, numero: number, paga: boolean, valorPago?: number, detalhes?: {
    formaPagamento?: string;
    horaPagamento?: string;
    dataPagamento?: string;
    referenciaPagamento?: string;
    notasPagamento?: string;
  }) => void;
}

const ReservationsContext = createContext<ReservationsContextType | null>(null);

function reservationToApi(r: Partial<Reservation>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (r.vehicleId       !== undefined) out.vehicle_id             = r.vehicleId;
  if (r.userId          !== undefined) out.user_id                = r.userId;
  if (r.clientName      !== undefined) out.client_name            = r.clientName;
  if (r.clientEmail     !== undefined) out.client_email           = r.clientEmail;
  if (r.clientPhone     !== undefined) out.client_phone           = r.clientPhone;
  if (r.clientPhone2    !== undefined) out.client_phone2          = r.clientPhone2;
  if (r.dataInicio      !== undefined) out.data_inicio            = r.dataInicio;
  if (r.dataFim         !== undefined) out.data_fim               = r.dataFim;
  if (r.horaLevantamento !== undefined) out.hora_levantamento     = r.horaLevantamento;
  if (r.horaDevolucao   !== undefined) out.hora_devolucao         = r.horaDevolucao;
  if (r.motivoViagem    !== undefined) out.motivo_viagem          = r.motivoViagem;
  if (r.status          !== undefined) out.status                 = r.status;
  if (r.valorTotal      !== undefined) out.valor_total            = r.valorTotal;
  if (r.deposito        !== undefined) out.deposito               = r.deposito;
  if (r.notas           !== undefined) out.notas                  = r.notas;
  if (r.localLevantamento !== undefined) out.local_levantamento   = r.localLevantamento;
  if (r.localDevolucao  !== undefined) out.local_devolucao        = r.localDevolucao;
  if (r.motoristaId     !== undefined) out.motorista_id           = r.motoristaId;
  if (r.totalPrestacoes !== undefined) out.total_prestacoes       = r.totalPrestacoes;
  if (r.prestacoesPagas !== undefined) out.prestacoes_pagas       = r.prestacoesPagas;
  if (r.prestacoes      !== undefined) out.prestacoes             = r.prestacoes;
  if (r.horaPagamento   !== undefined) out.hora_pagamento         = r.horaPagamento;
  if (r.formaPagamento  !== undefined) out.forma_pagamento        = r.formaPagamento;
  if (r.referenciaPagamento !== undefined) out.referencia_pagamento = r.referenciaPagamento;
  if (r.motivoCancelamento  !== undefined) out.motivo_cancelamento  = r.motivoCancelamento;
  if (r.pedidoExtensao      !== undefined) out.pedido_extensao      = r.pedidoExtensao;
  return out;
}

function rulesToApi(data: Partial<BusinessRules>): Record<string, unknown> {
  const map: Record<string, string> = {
    minDiasAluguer: 'min_dias_aluguer', maxDiasAluguer: 'max_dias_aluguer',
    antecedenciaMinimaHoras: 'antecedencia_minima_horas', antecedenciaMaximaDias: 'antecedencia_maxima_dias',
    bufferHorasEntreReservas: 'buffer_horas_entre_reservas', depositoPercentual: 'deposito_percentual',
    caucaoValor: 'caucao_valor', taxaLimpeza: 'taxa_limpeza', taxaLogistica: 'taxa_logistica',
    seguroDiario: 'seguro_diario', taxaCombustivel: 'taxa_combustivel',
    taxaCondutorAdicional: 'taxa_condutor_adicional', kmIncluidosPorDia: 'km_incluidos_por_dia',
    precoKmExtra: 'preco_km_extra', penalizacaoAtrasoPorHora: 'penalizacao_atraso_por_hora',
    taxaCancelamento: 'taxa_cancelamento', descontoSemanalPercentual: 'desconto_semanal_percentual',
    descontoQuinzenalPercentual: 'desconto_quinzenal_percentual', descontoMensalPercentual: 'desconto_mensal_percentual',
    permitirFimSemana: 'permitir_fim_semana', horaLevantamento: 'hora_levantamento', horaDevolucao: 'hora_devolucao',
  };
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => k in map).map(([k, v]) => [map[k], v])
  );
}

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { addNotification } = useNotifications();
  const { vehicles: allVehicles } = useVehicles();
  
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('rentcar:reservations:v2');
    return saved ? JSON.parse(saved) : mockReservations;
  });
  const [blocks, setBlocks] = useState<BlockedPeriod[]>(() => {
    const saved = localStorage.getItem('rentcar:blocks:v1');
    return saved ? JSON.parse(saved) : mockBlockedPeriods;
  });
  const [rules, setRules] = useState<BusinessRules>(() => {
    const saved = localStorage.getItem('rentcar:businessRules:v2');
    return saved ? JSON.parse(saved) : DEFAULT_BUSINESS_RULES;
  });

  useEffect(() => {
    localStorage.setItem('rentcar:reservations:v2', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('rentcar:blocks:v1', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('rentcar:businessRules:v2', JSON.stringify(rules));
  }, [rules]);

  // Sincroniza com a API quando o utilizador faz login
  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      api.get<Reservation[]>('/reservations').catch(() => null),
      api.get<BlockedPeriod[]>('/blocked-periods').catch(() => null),
      api.get<BusinessRules>('/business-rules').catch(() => null),
    ]).then(([apiRes, apiBlocks, apiRules]) => {
      if (apiRes && Array.isArray(apiRes) && apiRes.length > 0) {
        setReservations(prev => {
          const localMap = new Map(prev.map(r => [r.id, r]));
          return (apiRes as Reservation[]).map(apiR => {
            if (!apiR.userId) {
              const local = localMap.get(apiR.id);
              if (local?.userId) return { ...apiR, userId: local.userId };
            }
            return apiR;
          });
        });
      }
      if (apiBlocks && Array.isArray(apiBlocks)) {
        setBlocks(apiBlocks);
      }
      if (apiRules && typeof apiRules === 'object') {
        setRules(prev => ({ ...prev, ...apiRules }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const visibleReservations = useMemo(() => {
    if (!authUser) return [];
    if (authUser.role === 'admin') return reservations;
    return reservations.filter(r => r.userId === authUser.id);
  }, [reservations, authUser]);

  const checkAvailability = (vehicleId: number, start: string, end: string, excludeId?: string) =>
    isVehicleAvailable(vehicleId, start, end, reservations, blocks, excludeId);

  const validateDates = (start: string, end: string, horaLevantamento?: string) =>
    validateDateRange(start, end, rules, new Date(), horaLevantamento);

  const createReservation = (data: Omit<Reservation, 'id' | 'createdAt'>) => {
    const vehicle = allVehicles.find(v => v.id === data.vehicleId) ?? VEHICLES.find(v => v.id === data.vehicleId);
    const isPurchase = vehicle?.mode === 'compra';

    if (!isPurchase) {
      const dateCheck = validateDates(data.dataInicio, data.dataFim, data.horaLevantamento);
      if (!dateCheck.valid) return { ok: false, error: dateCheck.errors[0] };

      const avail = checkAvailability(data.vehicleId, data.dataInicio, data.dataFim);
      if (!avail.available) return { ok: false, error: avail.conflicts[0] ?? 'Viatura indisponível.' };
    }

    const newRes: Reservation = {
      ...data,
      id: `r${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReservations(prev => [...prev, newRes]);
    api.post('/reservations', reservationToApi(newRes)).catch(() => {});

    // Notificar o Administrador sobre a nova operação pendente
    const operacaoLabel = isPurchase ? 'compra' : 'aluguer';
    const vehicleName = vehicle?.name || `Viatura #${data.vehicleId}`;
    addNotification(
      'admin',
      `Novo pedido de ${operacaoLabel} — ${vehicleName}`,
      `"${data.clientName}" submeteu um pedido de ${operacaoLabel}. Documentos já verificados — aguarda apenas confirmação de pagamento.`,
      'warning',
      newRes.id,
      isPurchase ? '/admin/compra?tab=acoes' : '/admin/aluguer?tab=acoes'
    );

    return { ok: true };
  };

  const updateReservation = (id: string, data: Partial<Reservation>) => {
    if (authUser?.role !== 'admin') return;

    // Captura a reserva actual ANTES do update para poder enviar a notificação fora do updater
    const existing = reservations.find(r => r.id === id);

    setReservations(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next = { ...r, ...data };
        if (data.dataInicio || data.dataFim) {
          const start = data.dataInicio ?? r.dataInicio;
          const end = data.dataFim ?? r.dataFim;
          const avail = isVehicleAvailable(next.vehicleId, start, end, prev, blocks, id);
          if (!avail.available) return r;
        }
        return next;
      }),
    );

    // API fire-and-forget
    if (Object.keys(data).length > 0) {
      api.put(`/reservations/${id}`, reservationToApi(data)).catch(() => {});
    }

    // Side effect fora do updater — nunca é duplicado pelo Strict Mode
    if (existing && data.status && data.status !== existing.status && existing.userId) {
      const vehicle = allVehicles.find(v => v.id === existing.vehicleId) ?? VEHICLES.find(v => v.id === existing.vehicleId);
      const isPurchase = vehicle?.mode === 'compra';
      const operacaoLabel = isPurchase ? 'Compra' : 'Aluguer';
      const vehicleName = vehicle?.name || `Viatura #${existing.vehicleId}`;
      const statusText = data.status === 'concluida' ? 'CONCLUÍDA' : data.status === 'cancelada' ? 'CANCELADA' : data.status;
      const statusType = data.status === 'concluida' ? 'success' : 'alert';
      addNotification(
        existing.userId,
        'Estado do Pedido Atualizado',
        `O seu pedido de ${operacaoLabel.toLowerCase()} ("${vehicleName}") foi alterado para o estado ${statusText} pelo administrador António Silva.`,
        statusType,
        id,
        '/admin'
      );
    }
  };

  const deleteReservation = (id: string) => {
    if (authUser?.role !== 'admin') return;
    setReservations(prev => prev.filter(r => r.id !== id));
    api.delete(`/reservations/${id}`).catch(() => {});
  };

  const cancelReservation = (id: string, motivo?: string) => {
    const existing = reservations.find(r => r.id === id);

    setReservations(prev =>
      prev.map(r => r.id === id
        ? { ...r, status: 'cancelada' as ReservationStatus, ...(motivo ? { motivoCancelamento: motivo } : {}) }
        : r
      )
    );
    api.put(`/reservations/${id}`, { status: 'cancelada', ...(motivo ? { motivo_cancelamento: motivo } : {}) }).catch(() => {});

    if (existing?.userId) {
      const vehicle = allVehicles.find(v => v.id === existing.vehicleId) ?? VEHICLES.find(v => v.id === existing.vehicleId);
      const isPurchase = vehicle?.mode === 'compra';
      const operacaoLabel = isPurchase ? 'Compra' : 'Aluguer';
      const vehicleName = vehicle?.name || `Viatura #${existing.vehicleId}`;
      const motivoTxt = motivo ? ` Motivo indicado: "${motivo}".` : '';
      addNotification(
        existing.userId,
        'Pedido Cancelado',
        `O seu pedido de ${operacaoLabel.toLowerCase()} ("${vehicleName}") foi cancelado.${motivoTxt}`,
        'alert',
        id,
        '/profile'
      );
      // Notificar admin com o motivo do cliente
      if (motivo) {
        addNotification(
          'admin',
          `Cancelamento de ${operacaoLabel} — ${vehicleName}`,
          `O cliente cancelou o pedido de ${operacaoLabel.toLowerCase()} para "${vehicleName}". Motivo: "${motivo}".`,
          'warning',
          id,
          isPurchase ? '/admin/compra?tab=acoes' : '/admin/aluguer?tab=acoes'
        );
      }
    }
  };

  const addBlock = (data: Omit<BlockedPeriod, 'id'>) => {
    if (authUser?.role !== 'admin') return;
    const newBlock = { ...data, id: `b${Date.now()}` };
    setBlocks(prev => [...prev, newBlock]);
    api.post('/blocked-periods', {
      vehicle_id:  data.vehicleId ?? null,
      data_inicio: data.dataInicio,
      data_fim:    data.dataFim,
      motivo:      data.motivo,
      descricao:   data.descricao ?? null,
    }).catch(() => {});
  };

  const removeBlock = (id: string) => {
    if (authUser?.role !== 'admin') return;
    setBlocks(prev => prev.filter(b => b.id !== id));
    api.delete(`/blocked-periods/${id}`).catch(() => {});
  };

  const updateRules = (data: Partial<BusinessRules>) => {
    if (authUser?.role !== 'admin') return;
    setRules(prev => ({ ...prev, ...data }));
    api.put('/business-rules', rulesToApi(data)).catch(() => {});
  };

  const gerarPrestacoes = (id: string, semEntrada = false, dataInicioCustom?: string, numPrestacoesCustom?: number) => {
    if (authUser?.role !== 'admin') return;

    const existing = reservations.find(r => r.id === id);
    const n = (numPrestacoesCustom && numPrestacoesCustom > 0)
      ? numPrestacoesCustom
      : (existing?.totalPrestacoes && existing.totalPrestacoes > 0 ? existing.totalPrestacoes : 12);

    const startDate = dataInicioCustom
      ? new Date(dataInicioCustom + 'T00:00:00')
      : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d; })();

    let plano: Prestacao[] = [];
    setReservations(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const entradaPaga = semEntrada ? 0 : (r.deposito ?? 0);
        const restante = Math.max(0, r.valorTotal - entradaPaga);
        const valorPrestacao = Math.round(restante / n);
        plano = Array.from({ length: n }, (_, i) => {
          const due = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
          return {
            numero: i + 1,
            dataVencimento: due.toISOString().split('T')[0],
            valor: valorPrestacao,
            paga: false,
          };
        });
        return {
          ...r,
          status: 'em_prestacao' as ReservationStatus,
          totalPrestacoes: n,
          prestacoesPagas: 0,
          prestacoes: plano,
        };
      })
    );
    api.put(`/reservations/${id}`, {
      status: 'em_prestacao',
      total_prestacoes: n,
      prestacoes_pagas: 0,
      prestacoes: plano,
    }).catch(() => {});

    // Notificar o cliente com o calendário de pagamentos
    if (existing?.userId) {
      const vehicle = allVehicles.find(v => v.id === existing.vehicleId) ?? VEHICLES.find(v => v.id === existing.vehicleId);
      const vehicleName = vehicle?.name || `Viatura #${existing.vehicleId}`;
      const primeiraData = startDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
      addNotification(
        existing.userId,
        'Plano de Pagamentos Definido',
        `O seu plano de prestações para "${vehicleName}" foi criado: ${n} prestação${n !== 1 ? 'ões' : ''}, com a primeira a vencer a ${primeiraData}. Consulte "Pagamentos" para ver o calendário completo.`,
        'info',
        id,
        '/profile'
      );
    }
  };

  const marcarPrestacao = (reservationId: string, numero: number, paga: boolean, valorPago?: number, detalhes?: {
    formaPagamento?: string;
    horaPagamento?: string;
    dataPagamento?: string;
    referenciaPagamento?: string;
    notasPagamento?: string;
  }) => {
    if (authUser?.role !== 'admin') return;
    const today = new Date().toISOString().split('T')[0];
    setReservations(prev =>
      prev.map(r => {
        if (r.id !== reservationId) return r;

        // Mark the target installment with payment details
        let prestacoes = (r.prestacoes ?? []).map(p =>
          p.numero === numero
            ? {
                ...p,
                paga,
                valorPago:            paga ? (valorPago ?? p.valor) : undefined,
                dataPagamento:        paga ? (detalhes?.dataPagamento ?? today) : undefined,
                horaPagamento:        paga ? detalhes?.horaPagamento : undefined,
                formaPagamento:       paga ? detalhes?.formaPagamento : undefined,
                referenciaPagamento:  paga ? detalhes?.referenciaPagamento : undefined,
                notasPagamento:       paga ? detalhes?.notasPagamento : undefined,
              }
            : p
        );

        // If paid with an amount higher than the agreed value, redistribute the surplus
        if (paga) {
          const efectivo = valorPago ?? prestacoes.find(p => p.numero === numero)?.valor ?? 0;
          const acordado = r.prestacoes?.find(p => p.numero === numero)?.valor ?? 0;
          const surplus  = Math.max(0, efectivo - acordado);

          if (surplus > 0) {
            const unpaid = prestacoes.filter(p => !p.paga);
            if (unpaid.length > 0) {
              const totalUnpaid = unpaid.reduce((s, p) => s + p.valor, 0);
              const newTotal    = Math.max(0, totalUnpaid - surplus);
              if (newTotal === 0) {
                // Excedente cobre todas as restantes — fechá-las automaticamente
                prestacoes = prestacoes.map(p =>
                  p.paga ? p : {
                    ...p,
                    valor: 0,
                    paga: true,
                    valorPago: 0,
                    dataPagamento: today,
                    notasPagamento: 'Liquidado antecipadamente',
                  }
                );
              } else {
                const novoValor = Math.round(newTotal / unpaid.length);
                prestacoes = prestacoes.map(p => !p.paga ? { ...p, valor: novoValor } : p);
              }
            }
          }
        }

        const prestacoesPagas = prestacoes.filter(p => p.paga).length;
        const todasPagas = prestacoes.every(p => p.paga);
        const newStatus  = todasPagas ? ('liquidada' as ReservationStatus) : r.status;

        const updated = { ...r, prestacoes, prestacoesPagas, status: newStatus };
        // fire-and-forget sync (computed outside setState for correctness)
        api.put(`/reservations/${reservationId}`, {
          prestacoes,
          prestacoes_pagas: prestacoesPagas,
          status: newStatus,
        }).catch(() => {});

        return updated;
      })
    );
  };

  const quoteRental = (vehicleId: number, start: string, end: string) => {
    const vehicle = allVehicles.find(v => v.id === vehicleId) ?? VEHICLES.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.mode !== 'aluguer') return null;
    const dateCheck = validateDates(start, end);
    if (!dateCheck.valid) return null;
    const dailyRate = parseDailyRateFromPrice(vehicle.price);
    const pricing = calculateRentalTotal(dailyRate, dateCheck.days, rules);
    return { ...pricing, days: dateCheck.days, dailyRate };
  };

  return (
    <ReservationsContext.Provider
      value={{
        reservations: visibleReservations,
        blocks: authUser?.role === 'admin' ? blocks : [],
        rules,
        updateRules,
        checkAvailability,
        validateDates,
        createReservation,
        updateReservation,
        cancelReservation,
        deleteReservation,
        addBlock,
        removeBlock,
        getVehicleReservations: vehicleId => reservations.filter(r => r.vehicleId === vehicleId),
        getClientReservations: userId => reservations.filter(r => r.userId === userId),
        quoteRental,
        gerarPrestacoes: (id, semEntrada, dataInicioCustom, numPrestacoesCustom) =>
          gerarPrestacoes(id, semEntrada, dataInicioCustom, numPrestacoesCustom),
        marcarPrestacao,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error('useReservations must be used within ReservationsProvider');
  return ctx;
}

export type { BlockReason };
