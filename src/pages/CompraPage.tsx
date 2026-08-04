import React, { useMemo, useState } from 'react';
import { VEHICLES } from '../data/constants';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useRoute } from '../hooks/useRoute';
import type { Prestacao, Reservation, ReservationStatus } from '../types/reservation';
import type { VehicleData } from '../context/VehiclesContext';
import { RegistarPagamentoModal } from '../components/reservations/RegistarPagamentoModal';


const STATUS_CFG: Record<ReservationStatus, { label: string; className: string }> = {
  pendente:            { label: 'Aguarda Pagamento',      className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           className: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  liquidada:           { label: 'Liquidada',              className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  cancelada:           { label: 'Cancelado',              className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  ativa:               { label: 'Aluguer Activo',         className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     className: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              className: 'bg-zinc-700 text-white border-zinc-600' },
};

const FLOW_STEPS = [
  { key: 'pendente',        label: 'Ag. Pagamento' },
  { key: 'compra_aprovada', label: 'Aprovada'  },
  { key: 'entrada_paga',    label: 'Entrada'   },
  { key: 'em_prestacao',    label: 'Prestação' },
  { key: 'liquidada',       label: 'Liquidada' },
] as const;

function stepIndex(status: ReservationStatus) {
  if (status === 'prestacao_atraso') return 3;
  return FLOW_STEPS.findIndex(s => s.key === status);
}

const fmt     = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const isFinal        = (s: ReservationStatus) => s === 'cancelada' || s === 'liquidada';

// ── Modal de gestão de prestações ────────────────────────────────────────────
function PrestacoeModal({
  r, today, onClose, onToggle, onOpenPagar, isBlocked, alterarDataVencimento
}: {
  r: Reservation;
  today: string;
  onClose: () => void;
  onToggle: (numero: number, paga: boolean, valorPago?: number) => void;
  onOpenPagar: (p: Prestacao) => void;
  isBlocked: boolean;
  alterarDataVencimento?: (reservationId: string, numero: number, novaData: string) => void;
}) {
  const { vehicles } = useVehicles();
  const vehicleName = (id: number) => vehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  
  const [editDataVencimento, setEditDataVencimento] = useState<{ numero: number; date: string } | null>(null);
  const prestacoes    = r.prestacoes ?? [];
  const pagas         = prestacoes.filter(p => p.paga).length;
  const total         = prestacoes.length;
  const pct           = total > 0 ? Math.round((pagas / total) * 100) : 0;
  const isAtraso      = r.status === 'prestacao_atraso';
  const allPaid       = pagas >= total && total > 0;
  const proximaNumero = prestacoes.find(p => !p.paga)?.numero ?? null;

  // Custom amount state for the next installment
  const proximaPrestacao = prestacoes.find(p => p.numero === proximaNumero);
  const [valorCustom, setValorCustom] = React.useState<string>(
    proximaPrestacao ? String(proximaPrestacao.valor) : ''
  );
  // Sync when modal opens with a different reservation or after recalc
  React.useEffect(() => {
    if (proximaPrestacao) setValorCustom(String(proximaPrestacao.valor));
  }, [proximaNumero, proximaPrestacao?.valor]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Cabeçalho do modal */}
        <div className={`px-6 py-4 border-b border-zinc-800 flex items-start justify-between gap-4 rounded-t-2xl ${isAtraso ? 'bg-red-500/5' : ''}`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-black text-base">{r.clientName}</p>
              <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${STATUS_CFG[r.status].className}`}>
                {STATUS_CFG[r.status].label}
              </span>
              {isAtraso && (
                <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                  ⚠ ATRASO
                </span>
              )}
            </div>
            <p className="text-white text-xs mt-0.5">{vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white transition-all shrink-0 text-lg font-black">
            ×
          </button>
        </div>

        {/* Barra de progresso global */}
        <div className={`px-6 py-3 border-b border-zinc-800 flex items-center gap-4 ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <span className={`text-2xl font-black tabular-nums ${isAtraso ? 'text-red-400' : allPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pagas}<span className="text-sm text-white font-bold">/{total}</span>
          </span>
          <div className="flex-1">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${isAtraso ? 'bg-red-500' : allPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white">
              <span>{pct}% concluído</span>
              {allPaid
                ? <span className="text-emerald-400 font-semibold">✓ Todas as prestações pagas</span>
                : <span>{total - pagas} prestação{total - pagas !== 1 ? 'ões' : ''} em falta</span>
              }
            </div>
          </div>
        </div>

        {/* Lista de prestações — scrollável */}
        <div className="overflow-y-auto flex-1">
          <div className="divide-y divide-zinc-800/60">
            {prestacoes.map(p => {
              const isOverdue = !p.paga && p.dataVencimento < today;
              const isProxima = p.numero === proximaNumero;
              const isFutura  = !p.paga && !isProxima;
              return (
                <div key={p.numero}
                  className={`px-6 py-3 flex items-center gap-3 transition-colors ${
                    p.paga                   ? 'bg-emerald-500/3'
                    : isProxima && isOverdue ? 'bg-red-500/5'
                    : isProxima              ? 'bg-amber-500/3'
                    : ''
                  }`}
                >
                  {/* Número */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                    p.paga                   ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/15 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-800/60 text-white border-zinc-700/50'
                  }`}>
                    {p.paga ? '✓' : p.numero}
                  </span>

                  {/* Data vencimento */}
                  <div className="flex items-center gap-2 w-32 shrink-0 group">
                    {editDataVencimento?.numero === p.numero ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editDataVencimento.date}
                          onChange={(e) => setEditDataVencimento({ numero: p.numero, date: e.target.value })}
                          className="w-24 text-xs bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-white outline-none"
                        />
                        <button
                          onClick={() => {
                            if (alterarDataVencimento && editDataVencimento.date) {
                              alterarDataVencimento(r.id, p.numero, editDataVencimento.date);
                            }
                            setEditDataVencimento(null);
                          }}
                          className="text-emerald-400 hover:text-emerald-300"
                          title="Guardar"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditDataVencimento(null)}
                          className="text-zinc-400 hover:text-zinc-200"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`text-xs tabular-nums ${
                          p.paga                   ? 'text-white line-through'
                          : isProxima && isOverdue ? 'text-red-400 font-semibold'
                          : isProxima              ? 'text-zinc-200 font-semibold'
                          : 'text-white'
                        }`}>
                          {fmtDate(p.dataVencimento)}
                        </span>
                        {!p.paga && (
                          <button
                            onClick={() => setEditDataVencimento({ numero: p.numero, date: p.dataVencimento })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500/70 hover:text-amber-500 text-xs"
                            title="Alterar data de vencimento"
                          >
                            ✎
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Valor */}
                  <span className={`text-sm font-bold tabular-nums flex-1 ${
                    p.paga ? 'text-white' : isProxima ? (isOverdue ? 'text-red-300' : 'text-white') : 'text-white'
                  }`}>
                    {fmt(p.valor)}
                  </span>

                  {/* Badge estado */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                    p.paga                   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isProxima && isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : isProxima              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-900 text-white border-zinc-800'
                  }`}>
                    {p.paga
                      ? (p.dataPagamento ? fmtDate(p.dataPagamento) : 'Paga')
                      : isProxima && isOverdue ? '⚠ Em Atraso'
                      : isProxima ? 'A receber'
                      : `Prestação ${p.numero}`}
                  </span>

                  {/* Botão / input acção */}
                  <div className="shrink-0 flex justify-end items-center gap-2">
                    {p.paga && !isFinal(r.status) && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {p.valorPago && p.valorPago !== p.valor
                          ? <span title={`Valor acordado: ${fmt(p.valor)}`}>{fmt(p.valorPago)}</span>
                          : 'Pago'}
                      </span>
                    )}
                    {isProxima && !isFinal(r.status) && (() => {
                      const custom = parseInt(valorCustom.replace(/\D/g, ''), 10) || 0;
                      const isAbove = custom > p.valor;
                      const unpaidAfter = prestacoes.filter(q => !q.paga && q.numero !== p.numero);
                      const novasPrestacoes = unpaidAfter.length > 0
                        ? Math.round(Math.max(0, unpaidAfter.reduce((s, q) => s + q.valor, 0) - Math.max(0, custom - p.valor)) / unpaidAfter.length)
                        : 0;
                      return (
                        <div className="flex flex-col gap-1 items-end">
                          {/* Input de valor personalizado */}
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={valorCustom.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              onChange={e => setValorCustom(e.target.value.replace(/\D/g, ''))}
                              className="w-28 text-xs text-right bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded-lg px-2 py-1 text-white outline-none tabular-nums font-bold"
                            />
                            <span className="text-[10px] text-white font-semibold">MT</span>
                          </div>
                          {/* Preview de recálculo */}
                          {isAbove && unpaidAfter.length > 0 && (
                            <p className="text-[9px] text-amber-400 font-semibold text-right leading-tight">
                              Próximas: {fmt(novasPrestacoes)}/mês
                            </p>
                          )}
                          {/* Botão Receber */}
                          <button
                            disabled={isBlocked || custom <= 0}
                            onClick={() => {
                              onOpenPagar({ ...p, valor: custom });
                              setValorCustom('');
                            }}
                            className={`text-xs px-3 py-1 rounded-lg font-black transition-all disabled:opacity-40 ${
                              isOverdue
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                            }`}>
                            {isOverdue ? '⚠ Receber' : '✓ Receber'}
                          </button>
                        </div>
                      );
                    })()}
                    {isFutura && (
                      <span className="text-xs text-zinc-700 px-3 py-1">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Registo de Pagamentos ── */}
        {(() => {
          const FORMA_MAP: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros' };
          const pagos = prestacoes.filter(p => p.paga && (p.formaPagamento || p.referenciaPagamento || p.notasPagamento || p.dataPagamento));
          if (pagos.length === 0) return null;
          return (
            <div className="px-6 py-4 border-t border-zinc-800 space-y-2">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Registo de Pagamentos</p>
              {pagos.map(p => (
                <div key={p.numero} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black text-white">{p.numero}ª Prestação</span>
                      <span className="text-sm font-black text-emerald-400 tabular-nums">{fmt(p.valorPago ?? p.valor)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white">
                      {p.dataPagamento && <span>{p.dataPagamento}{p.horaPagamento ? ` · ${p.horaPagamento}` : ''}</span>}
                      {p.formaPagamento && <span className="font-bold text-amber-400">{FORMA_MAP[p.formaPagamento] ?? p.formaPagamento}</span>}
                      {p.referenciaPagamento && <span className="font-mono text-white/70">Ref: {p.referenciaPagamento}</span>}
                    </div>
                    {p.notasPagamento && <p className="text-[11px] text-white/60 italic mt-1">{p.notasPagamento}</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Rodapé com resumo financeiro + fechar */}
        <div className={`px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-4 rounded-b-2xl ${isAtraso ? 'bg-red-500/5' : 'bg-zinc-950/40'}`}>
          <div className="flex gap-6 text-xs">
            <span className="text-white">
              Pago: <span className="text-emerald-400 font-black">
                {fmt(prestacoes.filter(p => p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
            <span className="text-white">
              Restante: <span className={`font-black ${isAtraso ? 'text-red-400' : 'text-amber-400'}`}>
                {fmt(prestacoes.filter(p => !p.paga).reduce((s, p) => s + p.valor, 0))}
              </span>
            </span>
          </div>
          <button onClick={onClose}
            className="text-sm px-5 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 font-semibold transition-all">
            Fechar
          </button>
        </div>


      </div>
    </div>
  );
}

type Tab = 'compras' | 'acoes' | 'presencial';

// ── Página principal ──────────────────────────────────────────────────────────
export function CompraPage({ onExit }: { onExit?: () => void }) {
  const { reservations, updateReservation, createReservation, deleteReservation, cancelReservation, gerarPrestacoes, alterarDataVencimento, marcarPrestacao } = useReservations();
  const { vehicles } = useVehicles();
  const { navigate } = useRoute();

  const compraVehicles = vehicles.filter(v => v.mode === 'compra');
  const compraIds      = new Set(compraVehicles.map(v => v.id));
  const vehicleName    = (id: number) => vehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const vehicleMatricula = (id: number) => vehicles.find(v => v.id === id)?.matricula ?? VEHICLES.find(v => v.id === id)?.matricula ?? '';

  const getUrlParams = () => new URLSearchParams(window.location.search);

  const [tab,            setTab]           = useState<Tab>(() =>
    getUrlParams().get('tab') === 'acoes' ? 'acoes' : 'compras'
  );
  const [highlightStatus, setHighlightStatus] = useState<string | null>(() =>
    getUrlParams().get('status')
  );
  const [selectedVehicle,  setSelectedVehicle]  = useState<number | null>(null);
  const [presencialVehicleId, setPresencialVehicleId] = useState<number | null>(null);
  const [presencialClientName, setPresencialClientName] = useState('');
  const [presencialClientPhone, setPresencialClientPhone] = useState('');
  const [presencialClientEmail, setPresencialClientEmail] = useState('');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [historicoSearch,  setHistoricoSearch]  = useState('');
  const [updating,         setUpdating]         = useState<string | null>(null);
  const [modalAberto,      setModalAberto]      = useState<string | null>(null);
  const [gerarConfig,      setGerarConfig]      = useState<{ id: string; semEntrada: boolean } | null>(null);
  const [gerarData,        setGerarData]        = useState('');
  const [gerarNum,         setGerarNum]         = useState(12);
  const [cancelConfirmId,  setCancelConfirmId]  = useState<string | null>(null);
  const [detalheVenda,     setDetalheVenda]     = useState<Reservation | null>(null);
  const [cancelMotivo,     setCancelMotivo]     = useState('');
  const [pagamentoModal,   setPagamentoModal]   = useState<{ reservationId: string; prestacao: Prestacao } | null>(null);
  const selectedPresencialVehicle = compraVehicles.find(v => v.id === presencialVehicleId) ?? compraVehicles[0] ?? null;

  const [presencialModal,      setPresencialModal]      = useState(false);
  const [presencialValorInput, setPresencialValorInput] = useState('');
  const [presencialForma,      setPresencialForma]      = useState('dinheiro');
  const [presencialData,       setPresencialData]       = useState(() => new Date().toISOString().split('T')[0]);
  const [presencialError,      setPresencialError]      = useState('');

  // Sync tab + status with URL on navigation
  React.useEffect(() => {
    const sync = () => {
      const p = getUrlParams();
      const t = p.get('tab');
      setTab(t === 'acoes' ? 'acoes' : 'compras');
      setHighlightStatus(p.get('status'));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Scroll to first card of the highlighted status
  React.useEffect(() => {
    if (tab !== 'acoes' || !highlightStatus) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`compra-status-${highlightStatus}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [tab, highlightStatus]);

  const today = new Date().toISOString().split('T')[0];

  const openPresencialModal = () => {
    if (!selectedPresencialVehicle || !presencialClientName.trim()) return;
    const priceNum = parseInt(String(selectedPresencialVehicle.price).replace(/\D/g, ''), 10) || 0;
    setPresencialValorInput(priceNum > 0 ? String(priceNum) : '');
    setPresencialForma('dinheiro');
    setPresencialData(today);
    setPresencialError('');
    setPresencialModal(true);
  };

  const registarCompraPresencial = () => {
    if (!selectedPresencialVehicle) return;
    setPresencialError('');
    const valor = parseInt(presencialValorInput, 10) || 0;
    const result = createReservation({
      vehicleId: selectedPresencialVehicle.id,
      clientName: presencialClientName.trim(),
      clientEmail: presencialClientEmail.trim() || undefined,
      clientPhone: presencialClientPhone.trim() || undefined,
      dataInicio: presencialData,
      dataFim: presencialData,
      horaLevantamento: '09:00',
      horaDevolucao: '09:00',
      status: 'compra_aprovada',
      valorTotal: valor,
      deposito: 0,
      totalPrestacoes: 1,
      formaPagamento: presencialForma,
      notas: 'Compra presencial',
    });
    if (!result.ok) {
      setPresencialError(result.error ?? 'Erro ao registar a compra.');
      return;
    }
    setPresencialModal(false);
    setPresencialClientName('');
    setPresencialClientPhone('');
    setPresencialClientEmail('');
    setPresencialVehicleId(null);
    setTab('compras');
  };

  const gerarComprativoCompra = (r: Reservation) => {
    const vName = vehicleName(r.vehicleId);
    const vMat  = vehicleMatricula(r.vehicleId);
    const isPresencial = r.notas?.toLowerCase().includes('presencial');
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="pt"><head>
<meta charset="utf-8"/>
<title>Comprovativo de Compra — ${r.clientName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:680px;margin:auto}
  .logo{font-size:22px;font-weight:900;letter-spacing:2px;color:#B8960C;margin-bottom:4px}
  .subtitle{font-size:11px;color:#666;margin-bottom:32px;letter-spacing:1px}
  .title{font-size:18px;font-weight:800;margin-bottom:4px}
  .badge{display:inline-block;background:#f5f0dc;color:#8a6a00;border:1px solid #d4af37;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:1px;vertical-align:middle;margin-left:8px}
  .badge-presencial{background:#e8f5e9;color:#1b5e20;border-color:#4caf50}
  .section{margin-bottom:20px}
  .section-title{font-size:10px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
  .row .label{color:#555}
  .row .value{font-weight:600;text-align:right}
  .total{font-size:15px;font-weight:900;color:#B8960C}
  .footer{margin-top:40px;border-top:1px solid #ddd;padding-top:16px;font-size:11px;color:#999;text-align:center}
  .ref{font-size:10px;color:#bbb;margin-top:24px;text-align:right}
  @media print{body{padding:20px}button{display:none}}
</style></head><body>
<div class="logo">SOS MOTORS</div>
<div class="subtitle">COMPROVATIVO DE VENDA DE VIATURA</div>
<div class="title">Comprovativo de Compra ${isPresencial ? '<span class="badge badge-presencial">PRESENCIAL</span>' : ''}</div>
<div style="font-size:12px;color:#999;margin-bottom:28px">Emitido em ${new Date().toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' })} · Ref: ${r.id.toUpperCase()}</div>

<div class="section">
  <div class="section-title">Dados do Cliente</div>
  <div class="row"><span class="label">Nome</span><span class="value">${r.clientName}</span></div>
  ${r.clientPhone ? `<div class="row"><span class="label">Telefone</span><span class="value">${r.clientPhone}</span></div>` : ''}
  ${r.clientEmail ? `<div class="row"><span class="label">Email</span><span class="value">${r.clientEmail}</span></div>` : ''}
</div>

<div class="section">
  <div class="section-title">Dados da Viatura</div>
  <div class="row"><span class="label">Viatura</span><span class="value">${vName}</span></div>
  ${vMat ? `<div class="row"><span class="label">Matrícula</span><span class="value">${vMat}</span></div>` : ''}
</div>

<div class="section">
  <div class="section-title">Dados da Venda</div>
  <div class="row"><span class="label">Data de Venda</span><span class="value">${fmtDate(r.dataInicio)}</span></div>
  <div class="row"><span class="label">Forma de Pagamento</span><span class="value">${r.formaPagamento ?? 'Dinheiro'}</span></div>
  <div class="row"><span class="label">Estado</span><span class="value">${STATUS_CFG[r.status].label}</span></div>
  <div class="row" style="margin-top:8px"><span class="label total">VALOR TOTAL</span><span class="value total">${fmt(r.valorTotal)}</span></div>
</div>

<div class="footer">
  SOS Motors — Compra e Aluguer de Viaturas · Maputo, Moçambique<br/>
  Este comprovativo é válido como documento de venda. Obrigado pela sua preferência.
</div>
<div class="ref">Documento gerado automaticamente pelo sistema SOS Motors</div>
<br/><button onclick="window.print()" style="margin-top:16px;padding:10px 24px;background:#B8960C;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer">Imprimir</button>
</body></html>`);
    w.document.close();
  };

  const advance = (id: string, toStatus: ReservationStatus) => {
    if (updating === id) return;
    setUpdating(id);
    updateReservation(id, { status: toStatus });
    setTimeout(() => setUpdating(null), 800);
  };

  const openGerarConfig = (id: string, semEntrada: boolean) => {
    const r = reservations.find(res => res.id === id);
    const n = r?.totalPrestacoes && r.totalPrestacoes > 0 ? r.totalPrestacoes : 12;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    setGerarData(nextMonth.toISOString().split('T')[0]);
    setGerarNum(n);
    setGerarConfig({ id, semEntrada });
  };

  const confirmarGerar = () => {
    if (!gerarConfig || updating === gerarConfig.id) return;
    const { id, semEntrada } = gerarConfig;
    setUpdating(id);
    gerarPrestacoes(id, semEntrada, gerarData || undefined, gerarNum);
    setGerarConfig(null);
    setTimeout(() => {
      setUpdating(null);
      setModalAberto(id);
    }, 600);
  };

  const togglePrestacao = (reservationId: string, numero: number, paga: boolean, valorPago?: number) => {
    if (updating === reservationId) return;
    setUpdating(reservationId);
    marcarPrestacao(reservationId, numero, paga, valorPago);
    setTimeout(() => setUpdating(null), 600);
  };

  const compraReservations = useMemo(() =>
    reservations
      .filter(r => compraIds.has(r.vehicleId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reservations]);

  const kpis = useMemo(() => {
    const volume = compraReservations.filter(r => r.status !== 'cancelada').reduce((s, r) => s + r.valorTotal, 0);
    return {
      pendentes:   compraReservations.filter(r => r.status === 'pendente').length,
      emPrestacao: compraReservations.filter(r => r.status === 'em_prestacao').length,
      emAtraso:    compraReservations.filter(r => r.status === 'prestacao_atraso').length,
      liquidadas:  compraReservations.filter(r => r.status === 'liquidada').length,
      canceladas:  compraReservations.filter(r => r.status === 'cancelada').length,
      volume,
    };
  }, [compraReservations]);

  // Histórico: apenas liquidadas e canceladas
  const historico = useMemo(() =>
    compraReservations
      .filter(r => r.status === 'liquidada' || r.status === 'cancelada')
      .filter(r => selectedVehicle === null || r.vehicleId === selectedVehicle)
      .filter(r => {
        if (!historicoSearch.trim()) return true;
        const q = historicoSearch.toLowerCase();
        return r.clientName.toLowerCase().includes(q)
          || vehicleName(r.vehicleId).toLowerCase().includes(q)
          || vehicleMatricula(r.vehicleId).toLowerCase().includes(q)
          || (r.clientPhone ?? '').toLowerCase().includes(q)
          || (r.clientEmail ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [compraReservations, selectedVehicle, historicoSearch]);

  const modalReservation = modalAberto ? reservations.find(r => r.id === modalAberto) : null;

  React.useEffect(() => {
    if (presencialVehicleId !== null) return;
    if (compraVehicles.length > 0) setPresencialVehicleId(compraVehicles[0].id);
  }, [compraVehicles, presencialVehicleId]);

  return (
    <div className="bg-zinc-950 text-white">
      {/* Modal de gestão de prestações */}
      {modalReservation && (
        <PrestacoeModal
          r={modalReservation}
          today={today}
          onClose={() => setModalAberto(null)}
          onToggle={(numero, paga, valorPago) => togglePrestacao(modalReservation.id, numero, paga, valorPago)}
          onOpenPagar={p => setPagamentoModal({ reservationId: modalReservation.id, prestacao: p })}
          alterarDataVencimento={alterarDataVencimento}
          isBlocked={updating === modalReservation.id}
        />
      )}
      {pagamentoModal && (
        <RegistarPagamentoModal
          reservationId={pagamentoModal.reservationId}
          prestacao={pagamentoModal.prestacao}
          onAfterSave={() => setPagamentoModal(null)}
          onClose={() => setPagamentoModal(null)}
        />
      )}

      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Pendentes',           value: kpis.pendentes,   color: 'text-amber-400',   dot: 'bg-amber-400',   hl: false },
            { label: 'Em Prestação',        value: kpis.emPrestacao, color: 'text-amber-400',   dot: 'bg-amber-400',   hl: false },
            { label: 'Prestação em Atraso', value: kpis.emAtraso,    color: 'text-red-400',     dot: 'bg-red-500',     hl: kpis.emAtraso > 0 },
            { label: 'Liquidadas',          value: kpis.liquidadas,  color: 'text-emerald-400', dot: 'bg-emerald-400', hl: false },
            { label: 'Canceladas',          value: kpis.canceladas,  color: 'text-white',       dot: 'bg-zinc-500',    hl: false },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl overflow-hidden ${k.hl ? 'border border-red-500/40 bg-red-500/5' : 'bg-zinc-900 border border-amber-500/20'}`}>
              {!k.hl && <div className="h-0.5 w-full bg-amber-500/40" />}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                  <span className="text-xs text-amber-400 uppercase font-bold tracking-wide leading-tight">{k.label}</span>
                </div>
                <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Volume */}
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-white font-bold uppercase tracking-wider">Volume Total de Vendas</span>
          <span className="text-2xl font-black text-amber-400">{fmt(kpis.volume)}</span>
        </div>


        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {(() => {
            const acoesCount = compraReservations.filter(r => r.status !== 'cancelada' && r.status !== 'liquidada').length;
            const acoesUrgente = kpis.pendentes > 0 || kpis.emAtraso > 0;
            return ([
              { key: 'compras', label: `Histórico (${historico.length})`,  urgent: false },
              { key: 'acoes',   label: `Ações (${acoesCount})`,            urgent: acoesUrgente },
              { key: 'presencial', label: 'Compra Presencial',             urgent: false },
            ] as { key: Tab; label: string; urgent: boolean }[]);
          })().map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : t.urgent
                  ? 'border-transparent text-red-400 animate-pulse hover:text-red-300'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
              {t.urgent && tab !== t.key && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: Compras */}
        {tab === 'compras' && <>

        {/* Filtro por viatura */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por nome, matrícula ou contacto..."
              value={historicoSearch}
              onChange={e => setHistoricoSearch(e.target.value)}
              className="w-full bg-zinc-900 border-2 border-amber-500/40 text-white rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium placeholder-white/40 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
            />
          </div>
          <select value={selectedVehicle ?? ''} onChange={e => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2.5 text-sm shrink-0">
            <option value="">Todas as viaturas</option>
            {compraVehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Histórico de contratos */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Histórico de Contratos</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/40">
                <th className="text-left px-5 py-4 text-xs text-white/40 font-black uppercase tracking-widest w-10">#</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Cliente</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden md:table-cell">Viatura</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest hidden sm:table-cell">Valor Total</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Data</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Estado</th>
                <th className="text-left px-5 py-4 text-xs text-amber-400 font-black uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {historico.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white text-sm">
                    Sem contratos concluídos ainda
                  </td>
                </tr>
              )}
              {historico.map((r, idx) => {
                const st = STATUS_CFG[r.status];
                const prestacoes = r.prestacoes ?? [];
                const pagas = prestacoes.filter(p => p.paga).length;
                const total = prestacoes.length || (r.totalPrestacoes ?? 0);
                return (
                  <tr key={r.id} className={`hover:bg-zinc-800/40 transition-colors ${idx % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                    <td className="px-5 py-4 text-xs font-black text-white/30 tabular-nums w-10">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-white">{r.clientName}</p>
                      <p className="text-xs text-white">{r.clientPhone ?? r.clientEmail ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-sm text-white">
                      {vehicleName(r.vehicleId)}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm font-bold text-amber-400">{fmt(r.valorTotal)}</p>
                      {total > 0 && (
                        <p className="text-xs text-white">{pagas}/{total} prestações</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white tabular-nums">{r.dataInicio}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => setDetalheVenda(r)}
                        className="text-xs font-bold text-white bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-800 transition-all">
                        Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {historico.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800 text-xs text-white">
              {historico.length} contrato(s) no histórico
            </div>
          )}
        </div>

        </> }

        {/* TAB: Ações */}
        {tab === 'acoes' && (() => {
          const accionaveis = compraReservations
            .filter(r => r.status !== 'cancelada' && r.status !== 'liquidada')
            .sort((a, b) => {
              const urgencia: Partial<Record<ReservationStatus, number>> = {
                prestacao_atraso: 0, em_prestacao: 1, entrada_paga: 2, compra_aprovada: 3, pendente: 4,
              };
              return (urgencia[a.status] ?? 9) - (urgencia[b.status] ?? 9);
            });

          const seenStatuses = new Set<string>();
          return (
            <div className="space-y-4">
              {accionaveis.length === 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl py-12 text-center text-white text-sm">
                  Sem compras com ações pendentes
                </div>
              )}
              {accionaveis.map(r => {
                const st              = STATUS_CFG[r.status];
                const si              = stepIndex(r.status);
                const prestacoes      = r.prestacoes ?? [];
                const pagas           = prestacoes.filter(p => p.paga).length;
                const total           = prestacoes.length;
                const allPaid         = total > 0 && pagas >= total;
                const hasOverdue      = prestacoes.some(p => !p.paga && p.dataVencimento < today);
                const isAtraso        = r.status === 'prestacao_atraso';
                const isBlocked       = updating === r.id;
                const isHighlighted   = highlightStatus === r.status;
                const isFirstOfStatus = !seenStatuses.has(r.status);
                if (isFirstOfStatus) seenStatuses.add(r.status);

                return (
                  <div
                    key={r.id}
                    id={isFirstOfStatus ? `compra-status-${r.status}` : undefined}
                    className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
                      isAtraso      ? 'border-red-500/30' :
                      isHighlighted ? 'border-amber-400/50 ring-1 ring-amber-400/20' :
                      gerarConfig?.id === r.id ? 'border-amber-500/40' :
                      'border-zinc-800'
                    }`}
                  >
                    {/* ── Cabeçalho ── */}
                    <div className={`px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-zinc-800/60 ${isAtraso ? 'bg-red-500/5' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{r.clientName}</p>
                          <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                          {isAtraso && (
                            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md animate-pulse">⚠ ATRASO</span>
                          )}
                        </div>
                        <p className="text-xs text-white mt-0.5">
                          {vehicleName(r.vehicleId)} · {fmt(r.valorTotal)}
                          {total > 0 && ` · ${pagas}/${total} prestações`}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/30 font-mono shrink-0">#{r.id.slice(0,8).toUpperCase()}</span>
                    </div>

                    {/* ── Progress tracker ── */}
                    <div className="px-5 py-4 border-b border-zinc-800/60">
                      <div className="flex items-start">
                        {FLOW_STEPS.map((step, i) => {
                          const done   = si > i;
                          const active = si === i;
                          return (
                            <React.Fragment key={step.key}>
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                  done   ? 'bg-amber-500 border-amber-500 text-zinc-950' :
                                  active ? 'border-amber-400 bg-zinc-800 text-amber-400' :
                                           'border-zinc-700 bg-zinc-800/60 text-white'
                                }`}>
                                  {done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    : <span className="text-[9px] font-black">{i + 1}</span>
                                  }
                                </div>
                                <span className={`text-[9px] mt-1 font-semibold text-center leading-tight max-w-[50px] ${
                                  done ? 'text-amber-400' : active ? 'text-amber-300' : 'text-white'
                                }`}>{step.label}</span>
                              </div>
                              {i < FLOW_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mt-3.5 transition-all ${done ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Botões de acção com ícones ── */}
                    <div className="px-5 py-3 flex flex-wrap items-center gap-2">

                      {/* 1. Aprovar */}
                      {r.status === 'pendente' && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'compra_aprovada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Aprovar
                        </button>
                      )}

                      {/* 2. Definir Plano (determina entrada automaticamente pelo valor do depósito do simulador) */}
                      {r.status === 'compra_aprovada' && (r.valorTotal > (r.deposito ?? 0)) && (
                        <button disabled={isBlocked} onClick={() => {
                          const temEntrada = (r.deposito ?? 0) > 0;
                          if (temEntrada) advance(r.id, 'entrada_paga');
                          openGerarConfig(r.id, !temEntrada);
                        }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Definir Plano
                        </button>
                      )}
                      {r.status === 'compra_aprovada' && (r.valorTotal <= (r.deposito ?? 0)) && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'liquidada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Liquidar Contrato
                        </button>
                      )}

                      {/* 4. Definir Plano */}
                      {r.status === 'entrada_paga' && gerarConfig?.id !== r.id && (r.valorTotal > (r.deposito ?? 0)) && (
                        <button disabled={isBlocked} onClick={() => openGerarConfig(r.id, false)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Definir Plano
                        </button>
                      )}
                      {r.status === 'entrada_paga' && (r.valorTotal <= (r.deposito ?? 0)) && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'liquidada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Liquidar Contrato
                        </button>
                      )}

                      {/* Liquidar (quando todas pagas) */}
                      {allPaid && (r.status === 'em_prestacao' || r.status === 'prestacao_atraso') && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'liquidada')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Liquidar Contrato
                        </button>
                      )}

                      {/* Gerir Prestações */}
                      {(r.status === 'em_prestacao' || r.status === 'prestacao_atraso') && (
                        <button onClick={() => setModalAberto(r.id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold transition-all ${
                            isAtraso
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                          Gerir Prestações
                        </button>
                      )}

                      {/* Regularizar (atraso) */}
                      {isAtraso && (
                        <button disabled={isBlocked} onClick={() => advance(r.id, 'em_prestacao')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                          Regularizar
                        </button>
                      )}

                      {/* Cancelar — sempre no fim, destacado */}
                      {cancelConfirmId !== r.id && (
                        <button disabled={isBlocked} onClick={() => { setCancelConfirmId(r.id); setCancelMotivo(''); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-zinc-800 text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 transition-all ml-auto">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Cancelar
                        </button>
                      )}
                      <button type="button" onClick={() => navigate(`/veiculo/${r.vehicleId}`)}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12h18"/><path d="M12 3l7 9-7 9-7-9 7-9z"/></svg>
                        Detalhes da Viatura
                      </button>
                    </div>

                    {/* ── Painel de confirmação de cancelamento ── */}
                    {cancelConfirmId === r.id && (
                      <div className="border-t border-red-500/20 px-5 py-4 space-y-3 bg-red-500/5">
                        <p className="text-xs font-semibold text-white">Cancelar esta compra — indique o motivo:</p>
                        <textarea
                          value={cancelMotivo}
                          onChange={e => setCancelMotivo(e.target.value)}
                          placeholder="Descreva o motivo do cancelamento..."
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setCancelConfirmId(null); setCancelMotivo(''); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all"
                          >
                            Voltar
                          </button>
                          <button
                            disabled={!cancelMotivo.trim() || isBlocked}
                            onClick={() => {
                              cancelReservation(r.id, cancelMotivo.trim());
                              setCancelConfirmId(null);
                              setCancelMotivo('');
                            }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-black bg-red-500 text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Confirmar Cancelamento
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Painel de configuração do plano ── */}
                    {gerarConfig?.id === r.id && (() => {
                      const startD = gerarData ? new Date(gerarData + 'T00:00:00') : null;
                      const preview = startD
                        ? Array.from({ length: Math.min(3, gerarNum) }, (_, i) => {
                            const d = new Date(startD.getFullYear(), startD.getMonth() + i, startD.getDate());
                            return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                          })
                        : [];
                      const entradaPaga = gerarConfig.semEntrada ? 0 : (r.deposito ?? 0);
                      const restante = Math.max(0, r.valorTotal - entradaPaga);
                      const valorPrest = gerarNum > 0 ? Math.round(restante / gerarNum) : 0;

                      return (
                        <div className="border-t border-amber-500/20 px-5 py-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Configurar Plano de Prestações</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-white font-bold block mb-1">Data da 1ª Prestação</label>
                              <input type="date" value={gerarData} min={today}
                                onChange={e => setGerarData(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 text-white rounded-lg px-3 py-2 text-xs outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-white font-bold block mb-1">Nº de Prestações</label>
                              <input type="number" min={1} max={60} value={gerarNum}
                                onChange={e => setGerarNum(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 text-white rounded-lg px-3 py-2 text-xs outline-none" />
                            </div>
                          </div>

                          <div className="bg-zinc-800/50 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs">
                            <span className="text-white">Prestação: <span className="text-amber-400 font-black">{fmt(valorPrest)}</span></span>
                            {gerarConfig.semEntrada && <span className="text-amber-400 font-bold">· Sem entrada</span>}
                            {!gerarConfig.semEntrada && r.deposito > 0 && <span className="text-white">Entrada: <span className="text-teal-400 font-black">{fmt(r.deposito)}</span></span>}
                            <span className="text-white">Total: <span className="text-white font-black">{fmt(r.valorTotal)}</span></span>
                          </div>

                          {preview.length > 0 && (
                            <div>
                              <p className="text-[10px] text-white font-bold uppercase tracking-wider mb-1.5">Primeiras datas</p>
                              <div className="flex flex-wrap gap-2">
                                {preview.map((d, i) => (
                                  <span key={i} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 text-xs">
                                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                    <span className="text-white font-bold">{d}</span>
                                    <span className="text-white tabular-nums">{fmt(valorPrest)}</span>
                                  </span>
                                ))}
                                {gerarNum > 3 && <span className="text-[10px] text-white flex items-center px-2">+{gerarNum - 3} mais</span>}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button disabled={!gerarData || gerarNum < 1 || isBlocked} onClick={confirmarGerar}
                              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-black bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Gerar Plano
                            </button>
                            <button onClick={() => setGerarConfig(null)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Fechar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })()}


        {/* TAB: Presencial */}
        {tab === 'presencial' && (
          <div className="w-full px-5 sm:px-8 py-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <p className="text-lg text-amber-400 uppercase font-black tracking-[0.15em]">COMPRA PRESENCIAL</p>
                  <p className="text-white/70 text-sm mt-1 max-w-xl">Painel de acompanhamento profissional para vendas físicas. Selecione uma viatura, valide os dados do cliente e avance para as ações de gestão.</p>
                </div>
              </div>

              {/* Form Content */}
              <div className="space-y-6 relative z-10">
                {/* Select Vehicle Button */}
                <button 
                  onClick={() => setShowVehicleModal(true)}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-zinc-950 font-black text-lg tracking-widest uppercase transition-all shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-3"
                >
                  [ SELECCIONAR VIATURA DO CATÁLOGO ]
                </button>

                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input value={presencialClientName} onChange={e => setPresencialClientName(e.target.value)}
                    placeholder="Nome do cliente" className="w-full bg-zinc-950/80 border border-zinc-800 rounded-full px-6 py-3.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-white/40" />
                  <input value={presencialClientPhone} onChange={e => setPresencialClientPhone(e.target.value)}
                    placeholder="Telefone" className="w-full bg-zinc-950/80 border border-zinc-800 rounded-full px-6 py-3.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-white/40" />
                  <input value={presencialClientEmail} onChange={e => setPresencialClientEmail(e.target.value)}
                    placeholder="Email" className="w-full bg-zinc-950/80 border border-zinc-800 rounded-full px-6 py-3.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-white/40" />
                </div>

                {/* Selected Vehicle Card */}
                {selectedPresencialVehicle && (
                  <div className="mt-8 bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-6">
                    <img src={selectedPresencialVehicle.img} alt={selectedPresencialVehicle.name} className="w-full sm:w-48 h-32 object-cover rounded-2xl shadow-lg" />
                    <div className="flex-1">
                      <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">Viatura Seleccionada</p>
                      <h4 className="text-xl font-black text-white">{selectedPresencialVehicle.name}</h4>
                      <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400 flex-wrap">
                        <span>{selectedPresencialVehicle.brand} · {selectedPresencialVehicle.year}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span className="text-amber-400 font-bold">{selectedPresencialVehicle.price}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span>Matrícula: {selectedPresencialVehicle.matricula}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <div className="pt-4">
                  {selectedPresencialVehicle && !presencialClientName.trim() && (
                    <p className="text-center text-xs text-red-400/70 mb-2">Preencha o nome do cliente para avançar</p>
                  )}
                  <button
                    onClick={openPresencialModal}
                    disabled={!selectedPresencialVehicle || !presencialClientName.trim()}
                    className="w-full p-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:hover:scale-100 disabled:cursor-not-allowed text-zinc-950 font-black text-lg tracking-widest uppercase transition-all flex items-center justify-center gap-3"
                  >
                    [ CONFIRMAR SELEÇÃO E REGISTAR ]
                  </button>
                </div>
              </div>
            </div>

            {/* Presencial Payment Modal */}
            {presencialModal && selectedPresencialVehicle && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPresencialModal(false)}>
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                    <div>
                      <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Compra Presencial</p>
                      <h3 className="text-lg font-black text-white">Registar Compra</h3>
                    </div>
                    <button onClick={() => setPresencialModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Vehicle summary */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                      <img src={selectedPresencialVehicle.img} alt={selectedPresencialVehicle.name} className="w-20 h-14 object-cover rounded-xl shrink-0" />
                      <div>
                        <p className="text-white font-black">{selectedPresencialVehicle.name}</p>
                        <p className="text-zinc-400 text-xs">{selectedPresencialVehicle.brand} · {selectedPresencialVehicle.year}</p>
                        <p className="text-amber-400 text-sm font-bold mt-0.5">{selectedPresencialVehicle.price}</p>
                      </div>
                    </div>
                    {/* Client summary */}
                    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                      <p className="text-white text-xs uppercase tracking-widest font-bold mb-2">Cliente</p>
                      <p className="text-white text-sm font-bold">{presencialClientName}</p>
                      {presencialClientPhone && <p className="text-zinc-400 text-xs mt-0.5">{presencialClientPhone}</p>}
                      {presencialClientEmail && <p className="text-zinc-400 text-xs">{presencialClientEmail}</p>}
                    </div>
                    {/* Fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-white font-bold mb-1.5 uppercase tracking-wider">Data da Compra</label>
                        <input type="date" value={presencialData} onChange={e => setPresencialData(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs text-white font-bold mb-1.5 uppercase tracking-wider">Valor Total (MZN)</label>
                        <input type="number" value={presencialValorInput} onChange={e => setPresencialValorInput(e.target.value)}
                          placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs text-white font-bold mb-1.5 uppercase tracking-wider">Forma de Pagamento</label>
                        <select value={presencialForma} onChange={e => setPresencialForma(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-all">
                          <option value="dinheiro">Dinheiro</option>
                          <option value="transferencia">Transferência</option>
                          <option value="cheque">Cheque</option>
                          <option value="cartao">Cartão</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    {presencialError && (
                      <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                        {presencialError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPresencialModal(false)}
                        className="py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black uppercase tracking-wider transition-colors">
                        Cancelar
                      </button>
                      <button onClick={registarCompraPresencial}
                        disabled={!presencialValorInput || !presencialData}
                        className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 text-sm font-black uppercase tracking-wider transition-colors">
                        Registar Compra
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal for Vehicle Selection */}
            {showVehicleModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => { setShowVehicleModal(false); setVehicleSearch(''); }}>
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest">Catálogo de Viaturas</h3>
                        <p className="text-xs text-zinc-400 mt-1">{compraVehicles.length} viaturas disponíveis para venda presencial.</p>
                      </div>
                      <button onClick={() => { setShowVehicleModal(false); setVehicleSearch(''); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        autoFocus
                        type="text"
                        value={vehicleSearch}
                        onChange={e => setVehicleSearch(e.target.value)}
                        placeholder="Pesquisar por nome, marca ou matrícula..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-white/40"
                      />
                      {vehicleSearch && (
                        <button onClick={() => setVehicleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Vehicle Grid */}
                  <div className="p-6 overflow-y-auto">
                    {(() => {
                      const q = vehicleSearch.toLowerCase().trim();
                      const filtered = compraVehicles.filter(v =>
                        !q ||
                        v.name.toLowerCase().includes(q) ||
                        v.brand.toLowerCase().includes(q) ||
                        (v.matricula ?? '').toLowerCase().includes(q)
                      );
                      if (filtered.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <p className="text-sm font-medium">Nenhuma viatura encontrada</p>
                          <p className="text-xs mt-1">Tente outra pesquisa</p>
                        </div>
                      );
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {filtered.map(vehicle => (
                            <button key={vehicle.id} onClick={() => { setPresencialVehicleId(vehicle.id); setShowVehicleModal(false); setVehicleSearch(''); }}
                              className="group flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-left">
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3">
                                <img src={vehicle.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              </div>
                              <p className="font-bold text-white text-sm truncate w-full">{vehicle.name}</p>
                              <p className="text-xs text-zinc-400 truncate">{vehicle.brand} · {vehicle.year}</p>
                              <p className="text-amber-400 font-bold text-xs mt-1">{vehicle.price}</p>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Presencial Registrations List */}
            {(() => {
              const lista = reservations
                .filter(r => compraIds.has(r.vehicleId) && r.notas === 'Compra presencial')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              if (lista.length === 0) return null;
              return (
                <div className="mt-6 max-w-4xl mx-auto px-5 sm:px-8 pb-4">
                  <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Registos Presenciais</p>
                  <div className="space-y-3">
                    {lista.map(r => (
                      <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4B42E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold">{r.clientName}</p>
                            <p className="text-zinc-400 text-xs">{vehicleName(r.vehicleId)} · {new Date(r.dataInicio).toLocaleDateString('pt-MZ')}</p>
                            {r.clientPhone && <p className="text-zinc-500 text-xs">{r.clientPhone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-amber-400 text-sm font-black">{r.valorTotal.toLocaleString('pt-MZ')} MZN</p>
                            <p className="text-zinc-500 text-xs">
                              {r.totalPrestacoes && r.totalPrestacoes > 1 ? `${r.totalPrestacoes} prestações` : 'Pagamento único'}
                              {r.deposito ? ` · Entrada: ${r.deposito.toLocaleString('pt-MZ')}` : ''}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shrink-0 ${
                            r.status === 'pendente'  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            r.status === 'aprovado'  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            r.status === 'cancelado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>

    {/* Modal de Detalhes da Venda */}
    {detalheVenda && (() => {
      const r = detalheVenda;
      const vName = vehicleName(r.vehicleId);
      const vMat  = vehicleMatricula(r.vehicleId);
      const vData = compraVehicles.find(v => v.id === r.vehicleId);
      const isPresencial = r.notas?.toLowerCase().includes('presencial');
      const prestacoes   = r.prestacoes ?? [];
      const pagas        = prestacoes.filter(p => p.paga).length;
      const total        = prestacoes.length || (r.totalPrestacoes ?? 0);
      const st           = STATUS_CFG[r.status];
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setDetalheVenda(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/60 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-white font-black text-lg">{r.clientName}</p>
                  {isPresencial && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">Presencial</span>
                  )}
                  <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                </div>
                <p className="text-zinc-400 text-xs">{r.clientPhone ?? ''}{r.clientPhone && r.clientEmail ? ' · ' : ''}{r.clientEmail ?? ''}</p>
              </div>
              <button onClick={() => setDetalheVenda(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {vData ? (
                <div className="flex items-center gap-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                  <img src={vData.img} alt={vData.name} className="w-24 h-16 object-cover rounded-xl shrink-0" />
                  <div>
                    <p className="text-white font-black">{vData.name}</p>
                    <p className="text-zinc-400 text-xs">{vData.brand} · {vData.year}</p>
                    {vMat && <p className="text-zinc-500 text-xs mt-0.5">Matrícula: {vMat}</p>}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-white font-bold">{vName}</p>
                  {vMat && <p className="text-zinc-400 text-xs mt-0.5">Matrícula: {vMat}</p>}
                </div>
              )}

              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl divide-y divide-zinc-800/60">
                {([
                  { label: 'Data de Venda',      value: fmtDate(r.dataInicio) },
                  { label: 'Forma de Pagamento', value: r.formaPagamento ?? 'Dinheiro' },
                  { label: 'Valor Total',        value: fmt(r.valorTotal), highlight: true },
                  ...(total > 1 ? [
                    { label: 'Prestações', value: `${pagas}/${total} pagas` },
                    ...(r.deposito ? [{ label: 'Entrada', value: fmt(r.deposito) }] : []),
                  ] : []),
                  ...(isPresencial ? [{ label: 'Tipo de Venda', value: 'Presencial (balcão)' }] : []),
                ] as { label: string; value: string; highlight?: boolean }[]).map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-zinc-400 text-sm">{label}</span>
                    <span className={`text-sm font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setDetalheVenda(null)}
                className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black uppercase tracking-wider transition-colors">
                Fechar
              </button>
              <button onClick={() => gerarComprativoCompra(r)}
                className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Comprovativo
              </button>
            </div>
          </div>
        </div>
      );
    })()}
  );
}
