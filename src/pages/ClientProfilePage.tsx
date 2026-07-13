import { useState, type ReactNode } from 'react';
import {
  Mail, Phone, MapPin, Briefcase, Calendar,
  Home, KeyRound, ShoppingCart, CreditCard,
  Trophy, History, User, BarChart3, Bell,
  AlertTriangle, Clock, FileText, Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useXitique } from '../context/XitiqueContext';
import { useFinance } from '../context/FinanceContext';
import { useNotifications } from '../context/NotificationsContext';
import { VEHICLES } from '../data/constants';
import { useVehicles } from '../context/VehiclesContext';
import { ReservationTracker } from '../components/ReservationTracker';
import XitiqueModal from '../components/XitiqueModal';
import { NotificacoesPanel } from '../components/NotificacoesPanel';
import type { Prestacao, Reservation, ReservationStatus } from '../types/reservation';

const ACTIVE_STATUSES: ReservationStatus[] = [
  'pendente', 'confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente',
];

type Section =
  | 'resumo'
  | 'dados_pessoais'
  | 'dados_estatisticos'
  | 'reservas'
  | 'compras'
  | 'pagamentos'
  | 'xitique'
  | 'historico'
  | 'notificacoes';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';

const RES_STATUS: Record<ReservationStatus, { label: string; cls: string }> = {
  pendente:            { label: 'Aguarda Pagamento',      cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  ativa:               { label: 'Aluguer Activo',         cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  concluida:           { label: 'Concluído',              cls: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  em_prestacao:        { label: 'Em Prestação',           cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  prestacao_atraso:    { label: 'Prestação em Atraso',    cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  liquidada:           { label: 'Liquidada',              cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtData(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}
function diffDias(inicio: string, fim: string) {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

// ── Geração de PDF (impressão de HTML estilizado) ───────────────────────────
const DOC_SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #18181b; }
  .doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #f59e0b; padding-bottom: 14px; margin-bottom: 22px; }
  .doc-logo img { height: 36px; width: auto; display: block; }
  .doc-meta { text-align: right; font-size: 11px; color: #71717a; }
  .doc-title { font-size: 18px; font-weight: 900; color: #18181b; margin-bottom: 2px; }
  .doc-sub { font-size: 12px; color: #71717a; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.3px; color: #b45309; margin: 20px 0 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 6px; }
  .info-box { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 12px; }
  .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #a1a1aa; margin-bottom: 3px; letter-spacing: 0.5px; }
  .info-value { font-size: 13px; font-weight: 700; color: #18181b; }
  .info-sub { font-size: 11px; color: #71717a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #fafafa; }
  th { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #71717a; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e4e4e7; }
  td { font-size: 12px; padding: 9px 10px; border-bottom: 1px solid #f4f4f5; color: #18181b; vertical-align: top; }
  .val-green { font-weight: 800; color: #059669; }
  .val-red   { font-weight: 800; color: #dc2626; }
  .val-amber { font-weight: 800; color: #b45309; }
  .badge { display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 9px; border-radius: 10px; white-space: nowrap; }
  .badge-aluguer { background: #fef3c7; color: #92400e; }
  .badge-compra  { background: #d1fae5; color: #065f46; }
  .badge-xitique { background: #fef3c7; color: #78350f; }
  .badge-divida  { background: #fee2e2; color: #991b1b; }
  .summary-box { border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; margin-bottom: 6px; }
  .summary-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f4f4f5; font-size: 12px; }
  .summary-row:last-child { border-bottom: none; }
  .summary-row.total { font-weight: 800; background: #fafafa; }
  .total-row td { font-weight: 900; background: #fafafa; border-top: 2px solid #e4e4e7; }
  .doc-footer { margin-top: 32px; text-align: center; font-size: 10px; color: #a1a1aa; border-top: 1px solid #e4e4e7; padding-top: 14px; }
`;

const DOC_BODY = (bodyHtml: string) => `
  <div class="doc-header">
    <div class="doc-logo"><img src="/sos-motors-logo.png" alt="SOS Motors"></div>
    <div class="doc-meta">Documento gerado pela plataforma<br>SOS Motors</div>
  </div>
  ${bodyHtml}
  <div class="doc-footer">SOS Motors &middot; Este documento foi gerado automaticamente</div>
`;

// Abre o documento em nova aba com toolbar de visualização e botão de descarregar
function viewAsPDF(bodyHtml: string, docTitle: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  ${DOC_SHARED_CSS}
  body { background: #f4f4f5; }
  .toolbar { position: sticky; top: 0; z-index: 100; background: #18181b; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
  .toolbar-title { color: #f59e0b; font-weight: 900; font-size: 13px; letter-spacing: -0.3px; }
  .btn-dl { background: #f59e0b; color: #18181b; border: none; border-radius: 8px; padding: 8px 18px; font-weight: 900; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
  .btn-dl:hover { background: #fbbf24; }
  .doc-wrap { max-width: 700px; margin: 28px auto 48px; background: #fff; border-radius: 12px; padding: 36px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .doc-wrap { max-width: none; margin: 0; box-shadow: none; border-radius: 0; padding: 18px; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">${docTitle}</span>
    <button class="btn-dl" onclick="window.print()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Descarregar PDF
    </button>
  </div>
  <div class="doc-wrap">
    ${DOC_BODY(bodyHtml)}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

// Abre diretamente a janela de impressão/guardar como PDF (para downloads directos)
function printAsPDF(bodyHtml: string, docTitle: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  ${DOC_SHARED_CSS}
  body { background: #fff; padding: 36px; }
  @media print { body { padding: 18px; } }
</style>
</head>
<body>
  ${DOC_BODY(bodyHtml)}
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch { /* noop */ } }, 300);
}

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const IcoUser      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoKey       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IcoCar       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>;
const IcoWallet    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M2 9h20"/></svg>;
const IcoTrophy    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0 0 4c0 2.5 2 4.5 5 6"/><path d="M17 4h3a2 2 0 0 1 0 4c0 2.5-2 4.5-5 6"/><rect x="7" y="2" width="10" height="6" rx="1"/></svg>;
const IcoHistory   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>;
const IcoChevron   = ({ open }: { open: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoShield    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoBarChart  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="9" width="4" height="12"/><rect x="10" y="5" width="4" height="16"/><rect x="17" y="1" width="4" height="20"/></svg>;

type PagEvt = {
  label: string; sub: string; valor: number; data: string; tipo: 'aluguer' | 'compra' | 'xitique' | 'divida';
  clientName?: string; clientEmail?: string; clientPhone?: string;
  matricula?: string; dataInicio?: string; dataFim?: string;
  formaPagamento?: string; referenciaPagamento?: string; horaPagamento?: string;
  diasAluguer?: number; valorDiario?: number;
};
const TIPO_CLS: Record<PagEvt['tipo'], string> = {
  aluguer: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  compra:  'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  xitique: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  divida:  'bg-red-400/10 text-red-400 border-red-400/20',
};
const TIPO_LABEL: Record<PagEvt['tipo'], string> = {
  aluguer: 'Aluguer', compra: 'Compra', xitique: 'Xitique', divida: 'Dívida',
};

export function ClientProfilePage({ onExit: _onExit }: { onExit?: () => void }) {
  const { user: authUser, allUsers } = useAuth();
  const { reservations, cancelReservation, updateReservation } = useReservations();
  const { grupos, inscricoes } = useXitique();
  const { dividas } = useFinance();
  const { showToast, unreadCount, addNotification } = useNotifications();
  const { vehicles: dynamicVehicles } = useVehicles();

  // ── Dados derivados ────────────────────────────────────────────────────────
  const userRes = reservations.filter(r =>
    r.userId === authUser?.id ||
    (!r.userId && r.clientEmail && r.clientEmail === authUser?.email)
  );

  const alugueres = userRes.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return !v || v.mode === 'aluguer';
  });

  const compras = userRes.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return v?.mode === 'compra';
  });

  let grupoDoUser = null;
  let membro = null;
  for (const g of grupos) {
    const m = g.membros.find(m =>
      (authUser?.id && m.userId === authUser.id) ||
      m.nome.toLowerCase().trim() === authUser?.nome?.toLowerCase().trim()
    );
    if (m) { grupoDoUser = g; membro = m; break; }
  }

  const sorteios   = grupoDoUser?.sorteios   ?? [];
  const mesAtual   = grupoDoUser?.mesAtual   ?? 1;
  const quotaMT    = grupoDoUser?.quotaMT    ?? 0;
  const premioMT   = grupoDoUser?.premioMT   ?? 0;
  const numMembros = grupoDoUser?.maxMembros ?? 0;

  const inscricaoPendente = !membro && inscricoes.find(i =>
    i.email === authUser?.email && i.status === 'aguarda_validacao'
  );

  const sorteioGanho = membro?.estado === 'Sorteado'
    ? sorteios.find(s => s.vencedor === membro!.nome)
    : null;

  const minhasDividas = dividas.filter(d =>
    d.clienteNome.toLowerCase().trim() === authUser?.nome.toLowerCase().trim() &&
    d.status !== 'quitado'
  );

  const prestacoesPendentes = compras.filter(c =>
    c.status !== 'cancelada' && c.status !== 'concluida' &&
    (c.totalPrestacoes ?? 0) > (c.prestacoesPagas ?? 0)
  );

  const totalAlugueresGasto = alugueres
    .filter(a => a.status === 'concluida')
    .reduce((s, a) => s + a.valorTotal, 0);

  const totalComprasGasto = compras
    .filter(c => ['ativa', 'confirmada', 'concluida', 'em_prestacao', 'compra_aprovada', 'liquidada'].includes(c.status))
    .reduce((s, c) => {
      const v = VEHICLES.find(veh => veh.id === c.vehicleId);
      return s + (v ? parseInt(v.price.replace(/\D/g, ''), 10) : c.valorTotal);
    }, 0);

  const totalInvestido = totalAlugueresGasto + totalComprasGasto;

  const totalAlertas =
    prestacoesPendentes.length +
    minhasDividas.length +
    (membro?.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'EmAndamento' ? 1 : 0);

  const fullUser = allUsers.find(u => u.id === authUser?.id) ?? null;

  const [section, setSection] = useState<Section>('resumo');

  const [prestOpen, setPrestOpen]         = useState<Set<string>>(new Set());
  const [secOpen, setSecOpen]             = useState<Set<string>>(new Set());
  const [closedSecs, setClosedSecs]       = useState<Set<string>>(new Set());
  const [showXitiqueModal, setShowXitiqueModal] = useState(false);
  const toggleSec    = (k: string) => setSecOpen(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const toggleClosed = (k: string) => setClosedSecs(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });

  // ── Reservas ───────────────────────────────────────────────────────────────
  const [showInativos,  setShowInativos]  = useState(false);
  const [detalheId,     setDetalheId]     = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [cancelMotivo,  setCancelMotivo]  = useState('');
  const [extensaoModal, setExtensaoModal] = useState<Reservation | null>(null);
  const [extensaoDias,  setExtensaoDias]  = useState('3');
  const [extensaoNota,  setExtensaoNota]  = useState('');
  const [histSearch, setHistSearch] = useState('');
  const [histFiltro, setHistFiltro] = useState<'todos' | PagEvt['tipo']>('todos');
  const [faturaSearch, setFaturaSearch] = useState('');
  const [faturaStatusFiltro, setFaturaStatusFiltro] = useState<'todos' | 'pago' | 'vencendo' | 'pendente' | 'atrasado' | 'cancelado'>('todos');
  const [showDividaDetail, setShowDividaDetail] = useState(false);

  const handleDownloadReserva = (r: Reservation) => {
    const veh = getVehicleName(r.vehicleId);
    const st  = RES_STATUS[r.status]?.label ?? r.status;

    // Soma tudo o que foi pago (prestações ou depósito directo)
    const totalPago = (r.prestacoes && r.prestacoes.length > 0)
      ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
      : (r.deposito ?? 0);

    const valorBase = r.valorTotal > 0 ? r.valorTotal : totalPago;
    const restante  = Math.max(0, valorBase - totalPago);

    const FORMA_MAP: Record<string, string> = {
      mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro',
      transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros',
    };

    const linhasPrestacoes = (r.prestacoes && r.prestacoes.length > 0)
      ? `<tr style="background:#fafafa">
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#71717a;padding:8px 10px;border-bottom:2px solid #e4e4e7;">Nº</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#71717a;padding:8px 10px;border-bottom:2px solid #e4e4e7;">Vencimento</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#71717a;padding:8px 10px;border-bottom:2px solid #e4e4e7;">Valor</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#71717a;padding:8px 10px;border-bottom:2px solid #e4e4e7;">Forma</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#71717a;padding:8px 10px;border-bottom:2px solid #e4e4e7;">Estado</td>
         </tr>
         ${r.prestacoes.map(p => `
           <tr>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;">${p.numero}ª</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;">${p.dataPagamento ?? p.dataVencimento}</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;font-weight:800;color:${p.paga ? '#059669' : '#18181b'};">${fmt(p.valorPago ?? p.valor)}</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;color:#71717a;">${p.paga && (p as any).formaPagamento ? (FORMA_MAP[(p as any).formaPagamento] ?? (p as any).formaPagamento) : '—'}</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;">
               <span style="display:inline-block;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;background:${p.paga ? '#d1fae5' : '#fef3c7'};color:${p.paga ? '#065f46' : '#92400e'};">${p.paga ? 'PAGO' : 'PENDENTE'}</span>
             </td>
           </tr>`).join('')}`
      : '';

    const body = `
      <div class="doc-title">Comprovativo de Reserva</div>
      <div class="doc-sub">Reserva Nº ${r.id}</div>

      <div class="section-title">Detalhes</div>
      <div class="summary-box">
        <div class="summary-row"><span>Viatura</span><span><b>${veh}</b></span></div>
        <div class="summary-row"><span>Estado</span><span><b>${st}</b></span></div>
        <div class="summary-row"><span>Início</span><span>${fmtData(r.dataInicio)}${r.horaLevantamento ? ' às ' + r.horaLevantamento : ''}</span></div>
        <div class="summary-row"><span>Fim</span><span>${fmtData(r.dataFim)}${r.horaDevolucao ? ' às ' + r.horaDevolucao : ''}</span></div>
        ${diffDias(r.dataInicio, r.dataFim) > 0 ? `<div class="summary-row"><span>Duração</span><span>${diffDias(r.dataInicio, r.dataFim)} dia(s)</span></div>` : ''}
      </div>

      <div class="section-title">Pagamento</div>
      <div class="summary-box">
        ${valorBase > 0 ? `<div class="summary-row"><span>Valor Total do Aluguer</span><span style="font-weight:800;">${fmt(valorBase)}</span></div>` : ''}
        ${totalPago > 0 ? `<div class="summary-row"><span>Total Pago</span><span class="val-green">${fmt(totalPago)}</span></div>` : ''}
        ${valorBase > 0
          ? `<div class="summary-row total"><span>Restante a Pagar</span><span class="${restante > 0 ? 'val-red' : 'val-green'}">${fmt(restante)}</span></div>`
          : `<div class="summary-row"><span>Valor</span><span style="color:#71717a;font-style:italic;">A confirmar com o administrador</span></div>`}
      </div>

      ${linhasPrestacoes ? `
        <div class="section-title">Plano de Prestações</div>
        <table>${linhasPrestacoes}</table>
      ` : ''}

      ${r.notas ? `<div class="section-title">Observações</div><div class="summary-box"><div class="summary-row"><span>${r.notas}</span></div></div>` : ''}
    `;
    printAsPDF(body, `Reserva ${r.id}`);
  };

  const handleExtensao = (r: Reservation) => {
    setExtensaoDias('3');
    setExtensaoNota('');
    setExtensaoModal(r);
  };

  const confirmarExtensao = () => {
    if (!extensaoModal) return;
    const r    = extensaoModal;
    const dias = Math.max(1, parseInt(extensaoDias, 10) || 1);
    const veh  = getVehicleName(r.vehicleId);
    const nota = extensaoNota.trim();

    const novaDataFimDate = new Date(r.dataFim + 'T00:00:00');
    novaDataFimDate.setDate(novaDataFimDate.getDate() + dias);
    const novaDataFim = novaDataFimDate.toISOString().split('T')[0];

    updateReservation(r.id, {
      pedidoExtensao: {
        dias,
        novaDataFim,
        motivo: nota,
        dataSubmissao: new Date().toISOString(),
        status: 'pendente',
      },
    });

    addNotification(
      'admin',
      `Pedido de Extensão — ${veh}`,
      `${authUser?.nome ?? 'Cliente'} solicitou extensão de ${dias} dia(s) para a reserva de "${veh}" (data fim actual: ${r.dataFim} → sugerida: ${novaDataFim}). Motivo: "${nota}"`,
      'warning',
      r.id,
      '/admin/aluguer?tab=acoes',
    );

    setExtensaoModal(null);
    showToast(
      'Pedido enviado',
      `Extensão de ${dias} dia(s) solicitada. O administrador analisará e responderá brevemente.`,
      'success',
    );
  };

  const handleCancelReserva = (id: string) => {
    cancelReservation(id, cancelMotivo.trim() || undefined);
    setCancelConfirm(null);
    setCancelMotivo('');
    setDetalheId(null);
    showToast('Reserva cancelada', 'A sua reserva foi cancelada com sucesso.', 'success');
  };

  const handleCancelCompra = (id: string) => {
    cancelReservation(id, cancelMotivo.trim() || undefined);
    setCancelConfirm(null);
    setCancelMotivo('');
    showToast('Compra cancelada', 'A sua compra foi cancelada. A equipa SOS Motors irá contactá-lo.', 'success');
  };

  const getVehicleName = (id: number) => dynamicVehicles.find(v => v.id === id)?.name ?? VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const getVehicle     = (id: number) => dynamicVehicles.find(v => v.id === id) ?? VEHICLES.find(v => v.id === id);

  const pagamentosBadge = minhasDividas.length + prestacoesPendentes.length;
  const xitiqueBadge   = (membro?.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'EmAndamento') ? 1 : 0;

  // ── Histórico de pagamentos partilhado (Pagamentos + Histórico) ───────────
  const historicoPag: PagEvt[] = [];
  alugueres.filter(a => a.status === 'concluida').forEach(a => {
    const dias = Math.max(1, Math.ceil((new Date(a.dataFim).getTime() - new Date(a.dataInicio).getTime()) / 86400000));
    const lastPaid = a.prestacoes?.filter(p => p.paga).at(-1);
    historicoPag.push({
      label: getVehicleName(a.vehicleId), sub: 'Aluguer concluído', valor: a.valorTotal,
      data: lastPaid?.dataPagamento ?? a.dataFim, tipo: 'aluguer',
      clientName: a.clientName, clientEmail: a.clientEmail, clientPhone: a.clientPhone,
      matricula: getVehicle(a.vehicleId)?.matricula,
      dataInicio: a.dataInicio, dataFim: a.dataFim,
      formaPagamento: lastPaid?.formaPagamento ?? a.formaPagamento,
      referenciaPagamento: lastPaid?.referenciaPagamento ?? a.referenciaPagamento,
      horaPagamento: lastPaid?.horaPagamento ?? a.horaPagamento,
      diasAluguer: dias, valorDiario: Math.round(a.valorTotal / dias),
    });
  });
  compras.forEach(c => {
    (c.prestacoes ?? []).filter(p => p.paga && p.dataPagamento).forEach(p => {
      historicoPag.push({
        label: getVehicleName(c.vehicleId), sub: `Prestação ${p.numero}`, valor: p.valorPago ?? p.valor, data: p.dataPagamento!, tipo: 'compra',
        clientName: c.clientName, clientEmail: c.clientEmail, clientPhone: c.clientPhone,
        matricula: getVehicle(c.vehicleId)?.matricula,
        dataInicio: c.dataInicio,
        formaPagamento: (p as any).formaPagamento ?? c.formaPagamento,
        referenciaPagamento: (p as any).referenciaPagamento ?? c.referenciaPagamento,
        horaPagamento: (p as any).horaPagamento ?? c.horaPagamento,
      });
    });
  });
  if (membro) {
    (membro.mesesPagos as number[]).forEach(mes => {
      const reg = (membro!.pagamentos as Record<number, { data: string; metodo?: string }>)?.[mes];
      historicoPag.push({ label: grupoDoUser?.nome ?? 'Xitique', sub: `Quota mês ${mes}`, valor: quotaMT, data: reg?.data ?? '', tipo: 'xitique' });
    });
  }
  historicoPag.sort((a, b) => b.data.localeCompare(a.data));

  // ── helpers de navegação ──────────────────────────────────────────────────
  const goto = (s: Section) => {
    setSection(s);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = authUser?.nome.split(' ')[0] ?? '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex font-medium">

      {/* ══ ASIDE SIDEBAR ════════════════════════════════════════════════════ */}
      <aside className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col sticky top-0 h-screen overflow-hidden">

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto outline-none">

          {/* ── Início ── */}
          {(() => {
            const active = section === 'resumo';
            return (
              <button onClick={() => goto('resumo')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <Home size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Início</span>
              </button>
            );
          })()}

          {/* ── Reservas ── */}
          {(() => {
            const active = section === 'reservas';
            return (
              <button onClick={() => goto('reservas')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <KeyRound size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Reservas</span>
                {alugueres.length > 0 && <span className={`text-xs font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${active ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-white'}`}>{alugueres.length}</span>}
              </button>
            );
          })()}

          {/* ── Compras ── */}
          {(() => {
            const active = section === 'compras';
            return (
              <button onClick={() => goto('compras')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <ShoppingCart size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Compras</span>
                {compras.length > 0 && <span className={`text-xs font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${active ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-white'}`}>{compras.length}</span>}
              </button>
            );
          })()}

          {/* ── Pagamentos ── */}
          {(() => {
            const active = section === 'pagamentos';
            return (
              <button onClick={() => goto('pagamentos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <CreditCard size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Pagamentos</span>
                {pagamentosBadge > 0 && <span className="text-xs font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center bg-red-500 text-white">{pagamentosBadge}</span>}
              </button>
            );
          })()}

          {/* ── Xitique ── */}
          {(() => {
            const active = section === 'xitique';
            return (
              <button onClick={() => goto('xitique')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <Trophy size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Xitique</span>
                {xitiqueBadge > 0 && <span className="text-xs font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center bg-amber-500 text-zinc-950">!</span>}
              </button>
            );
          })()}

          {/* ── Histórico ── */}
          {(() => {
            const active = section === 'historico';
            return (
              <button onClick={() => goto('historico')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <History size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Histórico</span>
              </button>
            );
          })()}

          {/* ── Notificações ── */}
          {(() => {
            const active = section === 'notificacoes';
            return (
              <button onClick={() => goto('notificacoes')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <Bell size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Notificações</span>
                {unreadCount > 0 && <span className={`text-xs font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${active ? 'bg-amber-500 text-zinc-950' : 'bg-red-500 text-white'}`}>{unreadCount}</span>}
              </button>
            );
          })()}

          {/* ── Dados Pessoais ── */}
          {(() => {
            const active = section === 'dados_pessoais';
            return (
              <button onClick={() => goto('dados_pessoais')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-[3px] ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-transparent text-white hover:bg-zinc-800/60 hover:text-white'}`}>
                <User size={15} className="shrink-0" />
                <span className="flex-1 text-left text-xs font-medium">Dados Pessoais</span>
              </button>
            );
          })()}

        </nav>

      </aside>

      {/* ══ CONTENT AREA ═════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-y-auto outline-none">

        {/* ── Topbar ── */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800/60 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-amber-500">
              {section === 'resumo'            && <Home size={15} />}
              {section === 'dados_pessoais'    && <User size={15} />}
              {section === 'dados_estatisticos'&& <BarChart3 size={15} />}
              {section === 'reservas'          && <KeyRound size={15} />}
              {section === 'compras'           && <ShoppingCart size={15} />}
              {section === 'pagamentos'        && <CreditCard size={15} />}
              {section === 'xitique'           && <Trophy size={15} />}
              {section === 'historico'         && <History size={15} />}
            {section === 'notificacoes'      && <Bell size={15} />}
            </div>
            <h1 className="text-xs font-black text-white uppercase tracking-widest">
              {section === 'resumo'            && saudacao + ', ' + firstName}
              {section === 'dados_pessoais'    && 'Dados Pessoais'}
              {section === 'dados_estatisticos'&& 'Dados Estatísticos'}
              {section === 'reservas'          && 'Reservas'}
              {section === 'compras'           && 'Compras'}
              {section === 'pagamentos'        && 'Pagamentos'}
              {section === 'xitique'           && 'Xitique'}
              {section === 'historico'         && 'Histórico'}
              {section === 'notificacoes'      && 'Notificações'}
            </h1>
          </div>
          <div />
        </div>

        <div className="p-6 space-y-4 w-full">

          {/* ══ RESUMO / HOME DASHBOARD ══════════════════════════════════════ */}
          {section === 'resumo' && (() => {
            // ── actividade recente ──────────────────────────────────────────
            type ActEvt = { id: string; icon: React.ReactNode; iconBg: string; title: string; sub: string; status: string; statusCls: string; tipo: 'aluguer' | 'compra' };
            const actFeed: ActEvt[] = [];
            [...alugueres].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,3).forEach(r => {
              const st = RES_STATUS[r.status];
              actFeed.push({ id: r.id, tipo: 'aluguer', icon: <KeyRound size={15} />, iconBg: 'bg-amber-500/12', title: `Reserva — ${getVehicleName(r.vehicleId)}`, sub: `${fmtData(r.dataInicio)} · ${fmt(r.valorTotal)}`, status: st.label, statusCls: st.cls });
            });
            [...compras].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,2).forEach(r => {
              const st = RES_STATUS[r.status];
              const paga = (r.prestacoesPagas ?? 0);
              const total = (r.totalPrestacoes ?? 0);
              actFeed.push({ id: r.id, tipo: 'compra', icon: <ShoppingCart size={15} />, iconBg: 'bg-emerald-400/10', title: `Compra — ${getVehicleName(r.vehicleId)}`, sub: paga > 0 ? `${paga}/${total} prestações · ${fmt(r.valorTotal)}` : fmt(r.valorTotal), status: st.label, statusCls: st.cls });
            });
            actFeed.sort((a,b) => b.id.localeCompare(a.id));
            const feedDisplay = actFeed.slice(0, 5);

            // "Ver tudo" navega para onde estão as ações activas
            const ACTIVE = ['pendente','confirmada','pronta_levantamento','ativa','devolucao_pendente','compra_aprovada','entrada_paga','em_prestacao','prestacao_atraso'];
            const temAluguerActivo = alugueres.some(r => ACTIVE.includes(r.status));
            const temCompraActiva  = compras.some(r => ACTIVE.includes(r.status));
            const verTudoDest: Section = temAluguerActivo ? 'reservas' : temCompraActiva ? 'compras' : 'historico';

            // ── xitique progress ────────────────────────────────────────────
            const totalQuotas = grupoDoUser ? grupoDoUser.maxMembros * (grupoDoUser.quotaMT ?? 0) : 0;
            const pagosQuotas = membro ? membro.mesesPagos.length * quotaMT : 0;
            const xitiquePct  = totalQuotas > 0 ? Math.round((pagosQuotas / totalQuotas) * 100) : 0;
            const nextXitique = membro && grupoDoUser ? { valor: quotaMT, mes: grupoDoUser.mesAtual } : null;

            // ── stat cards ──────────────────────────────────────────────────
            const stats = [
              {
                icon: <KeyRound size={18} />,
                label: 'Reservas',
                value: alugueres.length,
                sub: `${alugueres.filter(a => a.status === 'concluida').length} concluída${alugueres.filter(a => a.status === 'concluida').length !== 1 ? 's' : ''}`,
                accentLine: 'bg-amber-500',
                valueColor: 'text-amber-400',
                onClick: () => goto('reservas'),
              },
              {
                icon: <ShoppingCart size={18} />,
                label: 'Compras',
                value: compras.length,
                sub: `${compras.filter(c => c.status === 'liquidada').length} liquidada${compras.filter(c => c.status === 'liquidada').length !== 1 ? 's' : ''}`,
                accentLine: 'bg-emerald-400',
                valueColor: 'text-emerald-400',
                onClick: () => goto('compras'),
              },
              {
                icon: <CreditCard size={18} />,
                label: 'Pagamentos',
                value: pagamentosBadge,
                sub: pagamentosBadge > 0 ? 'pendente(s)' : 'Em dia',
                accentLine: pagamentosBadge > 0 ? 'bg-red-400' : 'bg-emerald-400',
                valueColor: pagamentosBadge > 0 ? 'text-red-400' : 'text-emerald-400',
                onClick: () => goto('pagamentos'),
              },
              {
                icon: <Trophy size={18} />,
                label: 'Xitique',
                value: membro ? `${xitiquePct}%` : '—',
                sub: membro ? `${fmt(pagosQuotas)} acumulados` : 'Não inscrito',
                accentLine: 'bg-amber-500',
                valueColor: 'text-amber-400',
                onClick: () => goto('xitique'),
              },
            ];

            return (
              <div className="space-y-5">

                {/* ── Alert bar: pagamentos urgentes ── */}
                {pagamentosBadge > 0 && (
                  <div className="flex items-center gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} className="text-red-400 shrink-0" />
                    <p className="text-sm text-white flex-1">
                      Tem <span className="text-red-400 font-bold">{pagamentosBadge} pagamento{pagamentosBadge > 1 ? 's' : ''} pendente{pagamentosBadge > 1 ? 's' : ''}</span> por regularizar.
                    </p>
                    <button onClick={() => goto('pagamentos')} className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                      Ver
                    </button>
                  </div>
                )}

                {/* ── Welcome banner ── */}
                <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Bem-vindo</p>
                  </div>
                  <div className="px-5 py-4">
                    <h2 className="text-lg font-black text-white mb-0.5">
                      {saudacao}, <span className="text-amber-400">{firstName}</span> 👋
                    </h2>
                    {fullUser?.dataCriacao && (
                      <p className="text-sm text-white mb-3">Membro desde {fmtData(fullUser.dataCriacao.slice(0,10))}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${fullUser?.status === 'ativo' ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                        {fullUser?.status === 'ativo' ? 'Conta Activa' : fullUser?.status === 'suspenso' ? 'Conta Suspensa' : fullUser?.status === 'inativo' ? 'Conta Inactiva' : 'Conta Pendente'}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${fullUser?.regularity === 'regular' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                        {fullUser?.regularity === 'regular' ? 'Regular' : 'Pagamento em Falta'}
                      </span>
                      {membro && (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400">
                          Xitique Activo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 4 KPI cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.map(s => (
                    <button key={s.label} onClick={s.onClick} className="group bg-zinc-900 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl overflow-hidden text-left transition-all hover:-translate-y-0.5">
                      <div className="p-4">
                        <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.valueColor} leading-none mb-1`}>{s.value}</p>
                        <p className="text-sm text-white">{s.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* ── Dois painéis ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Actividade recente */}
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Actividade Recente</span>
                      </div>
                      <button onClick={() => goto(verTudoDest)} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">Ver tudo →</button>
                    </div>
                    {feedDisplay.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-white">Sem actividade registada.</div>
                    ) : (
                      <div className="divide-y divide-zinc-800/60">
                        {feedDisplay.map(evt => (
                          <button
                            key={evt.id}
                            onClick={() => goto(evt.tipo === 'aluguer' ? 'reservas' : 'compras')}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                          >
                            <div className={`w-8 h-8 rounded-xl ${evt.iconBg} flex items-center justify-center text-white shrink-0`}>
                              {evt.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{evt.title}</p>
                              <p className="text-xs text-white mt-0.5">{evt.sub}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 ${evt.statusCls}`}>{evt.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Xitique card */}
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">O Meu Xitique</span>
                      </div>
                      <button onClick={() => goto('xitique')} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">Detalhes →</button>
                    </div>
                    {!membro ? (
                      <div className="px-4 py-8 text-center space-y-2">
                        <Trophy size={28} className="mx-auto text-white" />
                        <p className="text-sm text-white">Não está inscrito num grupo de Xitique.</p>
                        <button onClick={() => goto('xitique')} className="mt-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                          Saber mais
                        </button>
                      </div>
                    ) : (
                      <div className="px-5 py-4 space-y-4">
                        {/* Valor acumulado */}
                        <div className="flex items-end justify-between">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Poupança acumulada</p>
                          <span className="text-2xl font-black text-white">{fmt(pagosQuotas)}</span>
                        </div>
                        {/* Barra de progresso */}
                        <div>
                          <div className="flex justify-between text-xs text-white mb-1.5">
                            <span>Meta: {fmt(totalQuotas)}</span>
                            <span className="text-amber-400 font-black">{xitiquePct}%</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all" style={{ width: `${xitiquePct}%` }} />
                          </div>
                        </div>
                        {/* Membros do grupo */}
                        {grupoDoUser && (
                          <div>
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2">Membros</p>
                            <div className="flex flex-wrap gap-1.5">
                              {grupoDoUser.membros.slice(0,4).map(m => (
                                <span key={m.nome} className="inline-flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1 text-xs text-white">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                  {m.nome.split(' ')[0]}
                                </span>
                              ))}
                              {grupoDoUser.membros.length > 4 && (
                                <span className="inline-flex items-center bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1 text-xs text-white">
                                  +{grupoDoUser.membros.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Próxima contribuição */}
                        {nextXitique && (
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                            <div>
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Próxima contribuição</p>
                              <p className="text-sm font-black text-white mt-0.5">{fmt(nextXitique.valor)} <span className="text-white font-medium">· Mês {nextXitique.mes}</span></p>
                            </div>
                            <button onClick={() => goto('xitique')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors">
                              Ver Xitique
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })()}

          {/* ══ DADOS PESSOAIS ════════════════════════════════════════════════ */}
          {section === 'dados_pessoais' && (
            <div className="space-y-4">

              {/* Profile Hero */}
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                  <div className="w-1 h-4 bg-amber-500 rounded-full" />
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Perfil</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-lg shrink-0 shadow-lg ring-2 ring-amber-500/30">
                      {fullUser?.avatar
                        ? <img src={fullUser.avatar} alt={authUser?.nome} className="w-full h-full object-cover" />
                        : <span>{authUser ? initials(authUser.nome) : '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-lg leading-tight">{fullUser?.nome ?? authUser?.nome}</p>
                      <p className="text-white text-sm mt-0.5">{authUser?.email}</p>
                      {fullUser?.dataCriacao && (
                        <p className="text-white/60 text-xs mt-0.5">Membro desde {fmtData(fullUser.dataCriacao.slice(0, 10))}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Stat Cards — estilo Metric admin */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Reservas',   value: alugueres.length, sub: `${alugueres.filter(a => a.status === 'concluida').length} concluída(s)`, color: 'text-amber-400' },
                  { label: 'Compras',    value: compras.length,   sub: `${compras.filter(c => c.status === 'liquidada').length} liquidada(s)`,   color: 'text-white' },
                  { label: 'Pagamentos', value: minhasDividas.length + prestacoesPendentes.length, sub: (minhasDividas.length + prestacoesPendentes.length) > 0 ? 'pendente(s)' : 'Em dia', color: (minhasDividas.length + prestacoesPendentes.length) > 0 ? 'text-red-400' : 'text-white' },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-amber-500/30 rounded-2xl px-5 py-4">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-3xl font-black leading-none ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-white mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Left: Dados Pessoais info rows */}
                <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Dados Pessoais</p>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {([
                      { icon: <Mail size={13} />,      label: 'Email',        value: fullUser?.email ?? authUser?.email },
                      { icon: <Phone size={13} />,     label: 'Telefone',     value: fullUser?.telefone },
                      { icon: <MapPin size={13} />,    label: 'Localização',  value: fullUser?.endereco },
                      { icon: <Briefcase size={13} />, label: 'Profissão',    value:
                          fullUser?.category === 'func_publico' ? 'Funcionário Público' :
                          fullUser?.category === 'func_privado' ? 'Funcionário Privado' :
                          fullUser?.category === 'empreendedor' ? 'Empreendedor' : undefined },
                      { icon: <Calendar size={13} />,  label: 'Membro desde', value: fullUser?.dataCriacao ? fmtData(fullUser.dataCriacao.slice(0, 10)) : undefined },
                    ] as { icon: ReactNode; label: string; value?: string }[]).filter(f => !!f.value).map((f, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-amber-400">
                          {f.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-amber-400 font-black uppercase tracking-widest">{f.label}</div>
                          <div className="text-sm text-white mt-0.5 truncate">{f.value}</div>
                        </div>
                      </div>
                    ))}
                    {!fullUser?.email && !authUser?.email && !fullUser?.telefone && !fullUser?.endereco && (
                      <div className="px-4 py-5 text-center text-xs text-white">
                        Sem dados de contacto registados.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Estado da Conta + Segurança */}
                <div className="space-y-3">
                  {/* Estado da Conta 2×2 grid */}
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                      <div className="w-1 h-4 bg-amber-500 rounded-full" />
                      <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Estado da Conta</p>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-zinc-800/70">
                      {[
                        {
                          label: 'Estado',
                          value: fullUser?.status === 'ativo'    ? 'Activo'    :
                                 fullUser?.status === 'suspenso' ? 'Suspenso'  :
                                 fullUser?.status === 'inativo'  ? 'Inactivo'  : 'Pendente',
                          cls: fullUser?.status === 'ativo'    ? 'text-emerald-400' :
                               fullUser?.status === 'suspenso' ? 'text-red-400'     :
                               fullUser?.status === 'inativo'  ? 'text-white'       : 'text-amber-400',
                        },
                        {
                          label: 'Regularidade',
                          value: fullUser?.regularity === 'regular'      ? 'Regular'      :
                                 fullUser?.regularity === 'inadimplente' ? 'Inadimplente' : 'Pendente',
                          cls: fullUser?.regularity === 'regular'      ? 'text-emerald-400' :
                               fullUser?.regularity === 'inadimplente' ? 'text-red-400'     : 'text-amber-400',
                        },
                        {
                          label: 'Xitique',
                          value: fullUser?.xitique ? 'Inscrito' : 'Não inscrito',
                          cls:   fullUser?.xitique ? 'text-amber-400' : 'text-white',
                        },
                        {
                          label: 'Perfil',
                          value: 'Cliente',
                          cls:   'text-white',
                        },
                      ].map(row => (
                        <div key={row.label} className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">{row.label}</p>
                          <p className={`text-sm font-black ${row.cls}`}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documentos */}
                  {(() => {
                    const allDocs = [
                      { key: 'bi',                   label: 'Bilhete de Identidade (BI)', value: fullUser?.documentos?.bi  ?? (fullUser?.bi   ? true : undefined) },
                      { key: 'nuit',                  label: 'NUIT',                       value: fullUser?.documentos?.nuit ?? (fullUser?.nuit  ? true : undefined) },
                      { key: 'declaracao_rendimento', label: 'Declaração de Rendimento',   value: fullUser?.documentos?.declaracao_rendimento },
                      { key: 'contrato_trabalho',     label: 'Contrato de Trabalho',       value: fullUser?.documentos?.contrato_trabalho },
                      { key: 'carta_conducao',        label: 'Carta de Condução',          value: fullUser?.documentos?.carta_conducao },
                      { key: 'declaracao_bairro',     label: 'Declaração de Bairro',       value: fullUser?.documentos?.declaracao_bairro },
                    ] as { key: string; label: string; value?: string | boolean }[];
                    const conhecidos = allDocs.filter(d => d.value !== undefined);
                    const entregues  = conhecidos.filter(d => !!d.value).length;
                    const emFalta    = conhecidos.filter(d => !d.value).length;
                    const hasAnyDoc  = fullUser?.bi || fullUser?.nuit || fullUser?.documentos;
                    return (
                      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-800/70">
                          <div className="flex items-center gap-2.5">
                            <div className="w-1 h-4 bg-amber-500 rounded-full shrink-0" />
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Documentos</p>
                          </div>
                          {hasAnyDoc && (
                            <div className="flex items-center gap-1">
                              {entregues > 0 && <span className="text-xs bg-emerald-400/15 text-emerald-400 border border-emerald-400/20 rounded-md px-1.5 py-0.5 font-black">{entregues} ok</span>}
                              {emFalta > 0   && <span className="text-xs bg-red-400/15 text-red-400 border border-red-400/20 rounded-md px-1.5 py-0.5 font-black">{emFalta} em falta</span>}
                            </div>
                          )}
                        </div>
                        {!hasAnyDoc ? (
                          <div className="px-4 py-5 text-center text-xs text-white">
                            Nenhum documento registado. Contacte o administrador.
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800/50">
                            {conhecidos.map(d => {
                              const presente = !!d.value;
                              return (
                                <div key={d.key} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${presente ? '' : 'opacity-70'}`}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${presente ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                                      {presente
                                        ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      }
                                    </div>
                                    <span className="text-xs text-white truncate">{d.label}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${presente ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                                    {presente ? 'Entregue' : 'Em falta'}
                                  </span>
                                </div>
                              );
                            })}
                            {conhecidos.length > 0 && (
                              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/30">
                                <span className="text-xs text-amber-400 font-black uppercase tracking-widest">Total</span>
                                <span className="text-xs font-black text-white">{entregues} / {conhecidos.length}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* ══ DADOS ESTATÍSTICOS ════════════════════════════════════════════ */}
          {section === 'dados_estatisticos' && (
            <div className="space-y-4">

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Reservas</div>
                  <div className="text-3xl font-black text-white">{alugueres.length}</div>
                  <div className="text-xs text-white mt-0.5">{alugueres.filter(a => a.status === 'concluida').length} concluída{alugueres.filter(a => a.status === 'concluida').length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Compras</div>
                  <div className="text-3xl font-black text-white">{compras.length}</div>
                  <div className="text-xs text-white mt-0.5">{compras.filter(c => c.status === 'liquidada').length} liquidada{compras.filter(c => c.status === 'liquidada').length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Total Investido</div>
                  <div className="text-sm font-black text-amber-400 leading-tight mt-1">{totalInvestido > 0 ? fmt(totalInvestido) : '—'}</div>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${
                  membro?.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' :
                  membro?.estado === 'Aceite'   ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-900 border-amber-500/20'
                }`}>
                  <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Xitique</div>
                  <div className={`text-sm font-black leading-tight mt-1 ${
                    membro?.estado === 'Sorteado' ? 'text-emerald-400' :
                    membro?.estado === 'Aceite'   ? 'text-amber-400' : 'text-white'
                  }`}>
                    {membro?.estado === 'Sorteado' ? 'Contemplado' :
                     membro?.estado === 'Aceite'   ? 'Activo' :
                     membro                        ? 'Pendente' :
                     inscricaoPendente             ? 'Em análise' : '—'}
                  </div>
                </div>
              </div>

              {/* Resumo financeiro */}
              <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                  <span className="text-amber-400"><IcoBarChart /></span>
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Resumo Financeiro</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-white">Gasto em Alugueres</span>
                    <span className="text-xs font-black text-white">{totalAlugueresGasto > 0 ? fmt(totalAlugueresGasto) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-white">Total em Compras</span>
                    <span className="text-xs font-black text-white">{totalComprasGasto > 0 ? fmt(totalComprasGasto) : '—'}</span>
                  </div>
                  {membro && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-white">Pago em Xitique</span>
                      <span className="text-xs font-black text-amber-400">{fmt(membro.mesesPagos.length * quotaMT)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/30">
                    <span className="text-xs font-black text-white">Total global</span>
                    <span className="text-sm font-black text-amber-400">{fmt(totalInvestido + (membro ? membro.mesesPagos.length * quotaMT : 0))}</span>
                  </div>
                </div>
              </div>

              {/* Distribuição de reservas por estado */}
              {alugueres.length > 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Reservas por Estado</span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {Object.entries(
                      alugueres.reduce((acc, r) => {
                        acc[r.status] = (acc[r.status] ?? 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([status, count]) => {
                      const st = RES_STATUS[status as ReservationStatus];
                      return (
                        <div key={status} className="flex items-center justify-between px-4 py-2.5">
                          <span className={`text-xs border rounded-md px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                          <span className="text-xs font-black text-white">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prestações pendentes alert */}
              {prestacoesPendentes.length > 0 && (
                <div className="space-y-2">
                  {prestacoesPendentes.map(c => {
                    const restam = (c.totalPrestacoes ?? 0) - (c.prestacoesPagas ?? 0);
                    return (
                      <div key={c.id} className="flex items-center gap-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 py-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-amber-400">Prestação Pendente — {getVehicleName(c.vehicleId)}</p>
                          <p className="text-xs text-white mt-0.5">{restam} prestação{restam > 1 ? 'ões' : ''} em falta · {fmt(c.deposito)}/mês</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ RESERVAS ══════════════════════════════════════════════════════ */}
          {section === 'reservas' && (() => {
            const sortDesc = (a: Reservation, b: Reservation) => b.createdAt.localeCompare(a.createdAt);
            const ativos   = alugueres.filter(r =>  ACTIVE_STATUSES.includes(r.status)).sort(sortDesc);
            const inativos = alugueres.filter(r => !ACTIVE_STATUSES.includes(r.status)).sort(sortDesc);
            const lista    = showInativos ? inativos : ativos;

            const ReservaRow = ({ r }: { r: Reservation }) => {
              const st        = RES_STATUS[r.status];
              const expanded  = detalheId === r.id;
              const isAtivo   = ACTIVE_STATUSES.includes(r.status);
              const podeCancelar = isAtivo && r.status !== 'ativa' && r.status !== 'devolucao_pendente';
              const podeEstender = r.status === 'ativa';
              const valorRestante = r.valorTotal - r.deposito;
              const pct = r.deposito > 0 && r.valorTotal > 0
                ? Math.min(100, Math.round((r.deposito / r.valorTotal) * 100))
                : 0;

              return (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden">
                  {/* ── Linha principal ── */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center">

                    {/* Carro + datas + estado + obs */}
                    <div className="flex items-center gap-3 px-4 py-3 min-w-0">
                      {/* Thumbnail do veículo */}
                      <div className="shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50">
                        {getVehicle(r.vehicleId)?.img
                          ? <img src={getVehicle(r.vehicleId)!.img} alt={getVehicleName(r.vehicleId)} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xl">🚗</div>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white truncate">{getVehicleName(r.vehicleId)}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                          <span className="text-xs text-white">Início: <span className="text-white font-bold">{fmtData(r.dataInicio)}</span></span>
                          <span className="text-xs text-white">Fim: <span className="text-white font-bold">{fmtData(r.dataFim)}</span></span>
                          {r.horaDevolucao && <span className="text-xs text-white">Dev: <span className="text-white font-bold">{r.horaDevolucao}</span></span>}
                        </div>
                        {r.notas && <p className="text-xs text-white mt-0.5 truncate">{r.notas}</p>}
                        {r.status === 'cancelada' && r.motivoCancelamento && (
                          <p className="text-xs text-red-400 mt-1 flex items-start gap-1">
                            <span className="shrink-0 font-bold">Motivo:</span>
                            <span className="truncate">{r.motivoCancelamento}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="px-3 py-3 shrink-0">
                      <span className={`text-xs border rounded-md px-2 py-0.5 font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                    </div>

                    {/* Btn: Download */}
                    <button
                      onClick={() => handleDownloadReserva(r)}
                      title="Baixar comprovativo"
                      className="px-3 py-3 h-full border-l border-zinc-800 text-white hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>

                    {/* Btn: Expandir (mesmo estilo das Compras) */}
                    <button
                      onClick={() => setDetalheId(expanded ? null : r.id)}
                      title="Ver detalhes"
                      className={`px-4 py-3 h-full border-l border-zinc-800 transition-colors ${expanded ? 'text-amber-400 bg-amber-500/10' : 'text-white hover:text-white hover:bg-zinc-800/60'}`}
                    >
                      <IcoChevron open={expanded} />
                    </button>
                  </div>

                  {/* ── Painel de detalhes expandido ── */}
                  {expanded && (() => {
                    const vehicle = getVehicle(r.vehicleId);
                    const d = (iso: string) => fmtData(iso).split(' ').slice(0, 2).join(' ');
                    const R = 28;
                    const circ = 2 * Math.PI * R;
                    const dash = circ - (pct / 100) * circ;
                    return (
                      <div className="border-t border-zinc-800 bg-zinc-950/50 divide-y divide-zinc-800">

                        {/* ── 1. Estado do Processo ── */}
                        <div className="px-5 py-5">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Estado do Processo</p>
                          <ReservationTracker status={r.status} readonly clientView />
                          {r.status === 'cancelada' && r.motivoCancelamento && (
                            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <div>
                                <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-0.5">Motivo do Cancelamento</p>
                                <p className="text-sm text-white leading-snug">{r.motivoCancelamento}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── 3. Grid: Período | Locais | Financeiro ── */}
                        <div className="grid grid-cols-3 divide-x divide-zinc-800">

                          {/* PERÍODO */}
                          <div className="px-5 py-5 space-y-4">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Período</p>
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-white">Levantamento</p>
                                <p className="text-3xl font-black text-white leading-none mt-1">{d(r.dataInicio)}</p>
                                {r.horaLevantamento && <p className="text-sm text-white mt-1.5">{r.horaLevantamento}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Devolução</p>
                                <p className="text-3xl font-black text-amber-400 leading-none mt-1">{d(r.dataFim)}</p>
                                {r.horaDevolucao && <p className="text-sm text-amber-400 mt-1.5">{r.horaDevolucao}</p>}
                              </div>
                            </div>
                          </div>

                          {/* LOCAIS */}
                          <div className="px-5 py-5 space-y-4">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Locais</p>
                            <div className="space-y-4">
                              {r.localLevantamento && (
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-white mb-1">Levantamento</p>
                                  <p className="text-sm font-semibold text-white leading-snug">{r.localLevantamento}</p>
                                </div>
                              )}
                              {r.localDevolucao && (
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-white mb-1">Devolução</p>
                                  <p className="text-sm font-semibold text-white leading-snug">{r.localDevolucao}</p>
                                </div>
                              )}
                              {!r.localLevantamento && !r.localDevolucao && (
                                <p className="text-sm text-white italic">Não definido</p>
                              )}
                            </div>
                          </div>

                          {/* FINANCEIRO */}
                          <div className="px-5 py-5 space-y-4">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Financeiro</p>
                            <div className="flex items-center gap-4">
                              <div className="relative shrink-0 w-[72px] h-[72px]">
                                <svg viewBox="0 0 76 76" className="w-full h-full">
                                  <circle cx="38" cy="38" r={R} fill="none" stroke="#27272a" strokeWidth="10" />
                                  <circle
                                    cx="38" cy="38" r={R}
                                    fill="none" stroke="#10b981" strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={dash}
                                    transform="rotate(-90 38 38)"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-black text-white">{pct}%</span>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-white mb-1">Pago vs Restante</p>
                                <p className="text-xl font-black text-white leading-none">{fmt(r.valorTotal)}</p>
                                <p className="text-xs text-white mt-1">valor total da reserva</p>
                                {valorRestante > 0 && r.status !== 'concluida' && (
                                  <p className="text-sm font-bold text-red-400 mt-1.5">−{fmt(valorRestante)} restante</p>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* ── 4. Acções ── */}
                        <div className="flex gap-2 flex-wrap px-4 py-3">
                          <button
                            onClick={() => handleDownloadReserva(r)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Comprovativo
                          </button>
                          {podeEstender && !r.pedidoExtensao && (
                            <button
                              onClick={() => handleExtensao(r)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>
                              Solicitar Extensão
                            </button>
                          )}
                          {podeCancelar && (
                            <button
                              onClick={() => setCancelConfirm(r.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                              Cancelar Reserva
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })()}

                  {/* ── Banner de estado do pedido de extensão ── */}
                  {r.pedidoExtensao && (
                    <div className={`border-t px-4 py-4 space-y-1 ${
                      r.pedidoExtensao.status === 'pendente'  ? 'border-amber-500/20 bg-amber-500/5' :
                      r.pedidoExtensao.status === 'aprovado'  ? 'border-emerald-500/20 bg-emerald-500/5' :
                      'border-red-500/20 bg-red-500/5'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {r.pedidoExtensao.status === 'pendente' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <p className="text-xs font-black text-amber-400 uppercase tracking-wider">Pedido de extensão em análise</p>
                          </>
                        )}
                        {r.pedidoExtensao.status === 'aprovado' && (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Extensão aprovada!</p>
                          </>
                        )}
                        {r.pedidoExtensao.status === 'rejeitado' && (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            <p className="text-xs font-black text-red-400 uppercase tracking-wider">Extensão não aprovada</p>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-white/70">
                        Pedido: <span className="text-white font-bold">+{r.pedidoExtensao.dias} dia(s)</span>
                        {' '}· Nova data fim sugerida: <span className="text-white font-bold">{r.pedidoExtensao.novaDataFim}</span>
                      </p>
                      {r.pedidoExtensao.motivo && (
                        <p className="text-xs text-white/70">Motivo: <span className="text-white">{r.pedidoExtensao.motivo}</span></p>
                      )}
                      {r.pedidoExtensao.respostaAdmin && (
                        <p className={`text-xs font-bold mt-1 ${r.pedidoExtensao.status === 'aprovado' ? 'text-emerald-400' : 'text-red-400'}`}>
                          Resposta do admin: {r.pedidoExtensao.respostaAdmin}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Modal de confirmação de cancelamento ── */}
                  {cancelConfirm === r.id && (
                    <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-4 space-y-3">
                      <div>
                        <p className="text-sm text-white font-bold mb-0.5">Cancelar Reserva?</p>
                        <p className="text-xs text-white/70">Esta ação não pode ser desfeita. A sua reserva de <span className="text-white font-bold">{getVehicleName(r.vehicleId)}</span> será cancelada.</p>
                      </div>
                      <div>
                        <label className="text-xs text-white font-bold block mb-1">Motivo do Cancelamento <span className="text-red-400">*</span></label>
                        <textarea
                          value={cancelMotivo}
                          onChange={e => setCancelMotivo(e.target.value)}
                          placeholder="Descreva o motivo (ex: mudança de planos, viagem cancelada…)"
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-400 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 resize-none outline-none transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelReserva(r.id)}
                          disabled={!cancelMotivo.trim()}
                          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-colors"
                        >
                          Sim, cancelar
                        </button>
                        <button
                          onClick={() => { setCancelConfirm(null); setCancelMotivo(''); }}
                          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors"
                        >
                          Não, manter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="space-y-3">
                {/* Header com contadores e toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Activos</span>
                    <span className="text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-md px-2 py-0.5">{ativos.length}</span>
                    {inativos.length > 0 && <>
                      <span className="text-white">·</span>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Concluídos/Cancelados</span>
                      <span className="text-xs font-black bg-zinc-800 text-white border border-zinc-700 rounded-md px-2 py-0.5">{inativos.length}</span>
                    </>}
                  </div>
                  {inativos.length > 0 && (
                    <button
                      onClick={() => { setShowInativos(v => !v); setDetalheId(null); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        showInativos
                          ? 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-amber-500/20 text-white hover:text-white hover:border-amber-500/40'
                      }`}
                    >
                      {showInativos ? 'Ver activos' : 'Ver histórico'}
                    </button>
                  )}
                </div>

                {/* Lista */}
                {lista.length === 0 ? (
                  <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-xl border border-amber-500/20">
                    {showInativos ? 'Nenhum aluguer concluído ou cancelado.' : 'Não tem alugueres activos de momento.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lista.map(r => <ReservaRow key={r.id} r={r} />)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ COMPRAS ═══════════════════════════════════════════════════════ */}
          {section === 'compras' && (() => {
            const CAT_LABEL: Record<string, string> = {
              suv: 'SUV', pickup: 'Pick-up', sedan: 'Sedan',
              hatchback: 'Hatchback', van: 'Van', outro: 'Outro',
            };

            const garantiaInfo = (dataCompra: string, vehYear?: number) => {
              const anos = 2;
              const compra = new Date(dataCompra);
              const expira = new Date(compra);
              expira.setFullYear(expira.getFullYear() + anos);
              const hoje = new Date();
              const ativa = hoje < expira;
              const mesesRestantes = ativa
                ? Math.max(0, Math.round((expira.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                : 0;
              return {
                ativa,
                expira: expira.toISOString().split('T')[0],
                mesesRestantes,
                vehYear,
              };
            };

            const downloadComprovativo = (c: Reservation, veh: ReturnType<typeof getVehicle>) => {
              const st  = RES_STATUS[c.status]?.label ?? c.status;
              const gar = garantiaInfo(c.dataInicio, veh?.year);
              const body = `
                <div class="doc-title">Comprovativo de Compra</div>
                <div class="doc-sub">ID Operação ${c.id}</div>
                <div class="section-title">Viatura</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Viatura</span><span><b>${veh?.name ?? `#${c.vehicleId}`}</b></span></div>
                  <div class="summary-row"><span>Marca</span><span>${veh?.brand ?? '—'}</span></div>
                  <div class="summary-row"><span>Tipo</span><span>${CAT_LABEL[veh?.cat ?? ''] ?? '—'}</span></div>
                  <div class="summary-row"><span>Matrícula</span><span>${veh?.matricula ?? '—'}</span></div>
                  <div class="summary-row"><span>Ano</span><span>${veh?.year ?? '—'}</span></div>
                </div>
                <div class="section-title">Compra</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Data da compra</span><span>${fmtData(c.dataInicio)}</span></div>
                  <div class="summary-row"><span>Estado</span><span><b>${st}</b></span></div>
                  <div class="summary-row"><span>Garantia</span><span class="${gar.ativa ? 'val-green' : 'val-red'}">${gar.ativa ? `Activa até ${fmtData(gar.expira)}` : 'Expirada'}</span></div>
                  <div class="summary-row total"><span>Valor</span><span class="val-amber">${veh?.price ?? fmt(c.valorTotal)}</span></div>
                </div>
              `;
              printAsPDF(body, `Compra ${c.id}`);
            };

            return (
              <div className="space-y-3">
                {/* Contagem */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Histórico de Compras</span>
                  <span className="text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-md px-2 py-0.5">{compras.length}</span>
                </div>

                {compras.length === 0 ? (
                  <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-xl border border-amber-500/20">
                    Nenhuma compra registada.
                  </div>
                ) : compras.map(c => {
                  const st            = RES_STATUS[c.status];
                  const veh           = getVehicle(c.vehicleId);
                  const gar           = garantiaInfo(c.dataInicio, veh?.year);
                  const isParcelada   = (c.totalPrestacoes ?? 0) > 0;
                  const prestacoesPagas = c.prestacoesPagas ?? 0;
                  const totalPrestacoes = c.totalPrestacoes ?? 0;
                  const prestRestantes  = totalPrestacoes - prestacoesPagas;
                  const progressPct     = totalPrestacoes > 0 ? (prestacoesPagas / totalPrestacoes) * 100 : 0;
                  const prestacoes      = c.prestacoes ?? [];
                  const totalPago       = prestacoes.length > 0
                    ? prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
                    : prestacoesPagas * c.deposito;
                  const totalEmFalta    = prestacoes.length > 0
                    ? prestacoes.filter(p => !p.paga).reduce((s, p) => s + p.valor, 0)
                    : prestRestantes * c.deposito;
                  const proximaNumero   = prestacoes.find(p => !p.paga)?.numero ?? null;
                  const expanded        = secOpen.has(c.id);

                  const docs = [
                    { label: 'Certificado de Matrícula', valor: veh?.matricula ?? '—', ok: !!veh?.matricula },
                    { label: 'Livrete / Doc. Único',     valor: 'Disponível',           ok: true },
                    { label: 'Seguro Obrigatório',        valor: c.status === 'liquidada' ? 'Disponível' : 'Aguarda Liquidação', ok: c.status === 'liquidada' },
                    { label: 'Inspeção Técnica',          valor: (veh?.year ?? 0) >= 2022 ? 'Válida' : 'Verificar renovação', ok: (veh?.year ?? 0) >= 2022 },
                  ];

                  return (
                    <div key={c.id} className="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden">

                      {/* ── Linha de tabela ── */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-0">
                        <div className="px-4 py-3 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-white">{veh?.name ?? getVehicleName(c.vehicleId)}</p>
                            {veh?.cat && (
                              <span className="text-xs font-bold bg-zinc-800 border border-zinc-700 text-white rounded-md px-2 py-0.5 uppercase">
                                {CAT_LABEL[veh.cat] ?? veh.cat}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            <span className="text-xs text-white">Compra: <span className="text-white font-bold">{fmtData(c.dataInicio)}</span></span>
                            <span className="text-xs text-white">Valor: <span className="text-amber-400 font-bold">{veh?.price ?? fmt(c.valorTotal)}</span></span>
                            <span className={`text-xs font-bold ${gar.ativa ? 'text-emerald-400' : 'text-red-400'}`}>
                              {gar.ativa ? `Garantia: ${gar.mesesRestantes}m restantes` : 'Garantia expirada'}
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-3 shrink-0">
                          <span className={`text-xs border rounded-md px-2 py-0.5 font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                        </div>

                        <button
                          onClick={() => toggleSec(c.id)}
                          title="Ver detalhes"
                          className={`px-4 py-3 h-full border-l border-zinc-800 transition-colors ${expanded ? 'text-amber-400 bg-amber-500/10' : 'text-white hover:text-white hover:bg-zinc-800/60'}`}
                        >
                          <IcoChevron open={expanded} />
                        </button>
                      </div>

                      {/* ── Painel expandido ── */}
                      {expanded && (() => {
                        const sk = (s: string) => `${c.id}:${s}`;
                        const isOpen = (s: string) => !closedSecs.has(sk(s));
                        const SecHeader = ({ id, label }: { id: string; label: string }) => (
                          <button
                            type="button"
                            onClick={() => toggleClosed(sk(id))}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                          >
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{label}</span>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
                              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              className={`shrink-0 transition-transform duration-200 ${isOpen(id) ? 'rotate-90' : ''}`}
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        );
                        return (
                          <div className="border-t border-zinc-800">

                            {/* Header: small image left + car info */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              {veh?.img && (
                                <div className="w-20 h-[52px] shrink-0 rounded-lg overflow-hidden border border-zinc-700">
                                  <img src={veh.img} alt={veh.name ?? ''} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{veh?.name ?? getVehicleName(c.vehicleId)}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {veh?.cat && (
                                    <span className="text-xs font-bold bg-zinc-800 border border-zinc-700 text-white rounded-md px-2 py-0.5 uppercase">
                                      {CAT_LABEL[veh.cat] ?? veh.cat}
                                    </span>
                                  )}
                                  <span className={`text-xs font-black border rounded-md px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                                </div>
                              </div>
                            </div>

                            {c.status === 'cancelada' && c.motivoCancelamento && (
                              <div className="mx-4 mt-4 mb-0 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <div>
                                  <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-0.5">Motivo do Cancelamento</p>
                                  <p className="text-sm text-white leading-snug">{c.motivoCancelamento}</p>
                                </div>
                              </div>
                            )}

                            <div className="divide-y divide-zinc-800">

                              {/* ── Detalhes da Compra ── */}
                              <div>
                                <SecHeader id="det" label="Detalhes da Compra" />
                                {isOpen('det') && (
                                  <div className="px-4 pb-4">
                                    <div className="bg-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-800">
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Veículo</span>
                                        <span className="text-sm font-bold text-white text-right">{veh?.name ?? getVehicleName(c.vehicleId)}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Data da Compra</span>
                                        <span className="text-sm font-semibold text-white">{fmtData(c.dataInicio)}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Estado</span>
                                        <span className={`text-xs font-black border rounded-lg px-2.5 py-1 ${st.cls}`}>{st.label}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Valor Total</span>
                                        <span className="text-lg font-black text-amber-400">{fmt(c.valorTotal)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── Estado dos Pagamentos ── */}
                              {isParcelada && (
                                <div>
                                  <SecHeader id="pag" label="Estado dos Pagamentos" />
                                  {isOpen('pag') && (
                                    <div className="px-4 pb-4">
                                      <div className="bg-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-800">
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Prestações pagas</span>
                                          <span className="text-sm font-black text-emerald-400">{prestacoesPagas} / {totalPrestacoes}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Faltam</span>
                                          <span className={`text-sm font-black ${prestRestantes > 0 ? 'text-amber-400' : 'text-white'}`}>{prestRestantes}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Valor mensal</span>
                                          <span className="text-sm font-bold text-white">{fmt(prestacoes.find(p => !p.paga)?.valor ?? c.deposito)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Total pago</span>
                                          <span className="text-sm font-black text-emerald-400">{fmt(totalPago)}</span>
                                        </div>
                                        {totalEmFalta > 0 && (
                                          <div className="flex items-center justify-between px-5 py-4 gap-4">
                                            <span className="text-sm text-white">Total em dívida</span>
                                            <span className="text-lg font-black text-red-400">{fmt(totalEmFalta)}</span>
                                          </div>
                                        )}
                                        {prestRestantes === 0 && (
                                          <div className="px-4 py-3 text-center">
                                            <span className="text-emerald-400 font-black text-xs">Viatura totalmente liquidada!</span>
                                          </div>
                                        )}
                                        {proximaNumero !== null && prestRestantes > 0 && (
                                          <div className="flex items-center justify-between px-5 py-4 gap-4">
                                            <span className="text-sm text-white">Próxima prestação</span>
                                            <span className="text-sm font-bold text-amber-400">
                                              #{proximaNumero} · {fmt(prestacoes.find(p => p.numero === proximaNumero)?.valor ?? c.deposito)}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Progress bar */}
                                      <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1.5">
                                          <span className="text-white font-bold">{Math.round(progressPct)}% pago</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                          <div className={`h-1.5 rounded-full transition-all duration-700 ${prestRestantes === 0 ? 'bg-emerald-400' : 'bg-amber-500'}`} style={{ width: `${progressPct}%` }} />
                                        </div>
                                      </div>

                                      {/* Prestações detail list */}
                                      {prestacoes.length > 0 && (
                                        <div className="space-y-1 mt-3">
                                          <button
                                            type="button"
                                            onClick={() => setPrestOpen(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 transition-all"
                                          >
                                            <span className="flex items-center gap-2 text-xs font-black text-white">
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                              Detalhe das Prestações
                                              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-md px-2 py-0.5">{prestacoesPagas}/{totalPrestacoes}</span>
                                            </span>
                                            <IcoChevron open={prestOpen.has(c.id)} />
                                          </button>
                                          {prestOpen.has(c.id) && (
                                            <div className="bg-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-800">
                                              {prestacoes.map(p => {
                                                const isProxima = p.numero === proximaNumero;
                                                const hoje2 = new Date().toISOString().split('T')[0];
                                                const emAtraso = !p.paga && p.dataVencimento < hoje2;
                                                return (
                                                  <div key={p.numero} className={`flex items-center gap-3 px-4 py-3 ${p.paga ? 'bg-emerald-500/5' : isProxima ? 'bg-amber-500/5' : ''}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                                                      p.paga    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                      isProxima ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                      emAtraso  ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                                  'bg-zinc-800 text-white border-zinc-700'
                                                    }`}>
                                                      {p.paga ? '✓' : p.numero}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <p className={`text-xs font-bold ${p.paga ? 'text-emerald-300' : isProxima ? 'text-amber-300' : 'text-white'}`}>
                                                        Prestação {p.numero}
                                                        {isProxima && <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Próxima</span>}
                                                        {emAtraso  && <span className="ml-1.5 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md">Em atraso</span>}
                                                      </p>
                                                      <p className="text-xs text-white tabular-nums mt-0.5">
                                                        {p.paga && p.dataPagamento ? `Pago a ${fmtData(p.dataPagamento)}` : `Vence a ${fmtData(p.dataVencimento)}`}
                                                      </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                      {p.paga ? (
                                                        <>
                                                          <p className="text-xs font-black text-emerald-400">{fmt(p.valorPago ?? p.valor)}</p>
                                                          {p.valorPago && p.valorPago !== p.valor && <p className="text-xs text-white line-through">{fmt(p.valor)}</p>}
                                                        </>
                                                      ) : (
                                                        <p className={`text-xs font-bold tabular-nums ${isProxima ? 'text-amber-400' : 'text-white'}`}>{fmt(p.valor)}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Pagamento único ── */}
                              {c.deposito > 0 && !isParcelada && (
                                <div>
                                  <SecHeader id="pag" label="Pagamento" />
                                  {isOpen('pag') && (
                                    <div className="px-4 pb-4">
                                      <div className="bg-zinc-900 rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Valor pago (pronto pagamento)</span>
                                          <span className="text-lg font-black text-emerald-400">{fmt(c.deposito)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Garantia ── */}
                              <div>
                                <SecHeader id="gar" label="Garantia" />
                                {isOpen('gar') && (
                                  <div className="px-4 pb-4">
                                    <div className="bg-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-800">
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Estado</span>
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${gar.ativa ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
                                          {gar.ativa ? 'Activa' : 'Expirada'}
                                        </span>
                                      </div>
                                      {gar.ativa && (
                                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">Tempo restante</span>
                                          <span className="text-sm font-black text-emerald-400">{gar.mesesRestantes} meses</span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white">Válida até</span>
                                        <span className="text-sm font-bold text-white">{fmtData(gar.expira)}</span>
                                      </div>
                                      <div className="flex items-start justify-between px-5 py-4 gap-4">
                                        <span className="text-sm text-white shrink-0">Cobertura</span>
                                        <span className="text-sm text-white text-right">Motor, transmissão e componentes estruturais</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── Documentos ── */}
                              <div>
                                <SecHeader id="docs" label="Documentos do Veículo" />
                                {isOpen('docs') && (
                                  <div className="px-4 pb-4">
                                    <div className="bg-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-800">
                                      {docs.map(doc => (
                                        <div key={doc.label} className="flex items-center justify-between px-5 py-4 gap-4">
                                          <span className="text-sm text-white">{doc.label}</span>
                                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${doc.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
                                            {doc.ok ? doc.valor : 'Pendente'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* ── Bottom actions ── */}
                            <div className="px-4 py-3 border-t border-zinc-800 space-y-2">

                              <div className="flex gap-2">
                                <button
                                  onClick={() => downloadComprovativo(c, veh)}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  Descarregar Comprovativo
                                </button>

                                {(c.status === 'pendente' || c.status === 'compra_aprovada') && cancelConfirm !== c.id && (
                                  <button
                                    onClick={() => { setCancelConfirm(c.id); setCancelMotivo(''); }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                    Cancelar Compra
                                  </button>
                                )}
                              </div>

                              {cancelConfirm === c.id && (
                                <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-4 space-y-3">
                                  <div>
                                    <p className="text-sm text-white font-bold mb-0.5">Cancelar compra?</p>
                                    <p className="text-xs text-white/70">Esta ação não pode ser desfeita. O pedido de compra de <span className="text-white font-bold">{veh?.name ?? getVehicleName(c.vehicleId)}</span> será cancelado.</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-white font-bold block mb-1">Motivo do Cancelamento <span className="text-red-400">*</span></label>
                                    <textarea
                                      value={cancelMotivo}
                                      onChange={e => setCancelMotivo(e.target.value)}
                                      placeholder="Descreva o motivo (ex: mudança de decisão, dificuldade financeira…)"
                                      rows={3}
                                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-400 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 resize-none outline-none transition-colors"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleCancelCompra(c.id)}
                                      disabled={!cancelMotivo.trim()}
                                      className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-colors"
                                    >
                                      Sim, cancelar
                                    </button>
                                    <button
                                      onClick={() => { setCancelConfirm(null); setCancelMotivo(''); }}
                                      className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors"
                                    >
                                      Não, manter
                                    </button>
                                  </div>
                                </div>
                              )}

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

          {/* ══ PAGAMENTOS ════════════════════════════════════════════════════ */}
          {section === 'pagamentos' && (() => {
            // ── Totais ──────────────────────────────────────────────────────
            const totalPagoAlugueres = alugueres
              .filter(a => a.status === 'concluida')
              .reduce((s, a) => s + a.valorTotal, 0);

            const totalPagoCompras = compras.reduce((s, c) => {
              const prest = c.prestacoes ?? [];
              if (prest.length > 0)
                return s + prest.filter(p => p.paga).reduce((ps, p) => ps + (p.valorPago ?? p.valor), 0);
              return s + (c.prestacoesPagas ?? 0) * c.deposito;
            }, 0);

            const totalPagoXitique = membro ? membro.mesesPagos.length * quotaMT : 0;
            const totalPago = totalPagoAlugueres + totalPagoCompras + totalPagoXitique;

            const totalDividaCompras = compras.reduce((s, c) => {
              const prest = c.prestacoes ?? [];
              if (prest.length > 0)
                return s + prest.filter(p => !p.paga).reduce((ps, p) => ps + p.valor, 0);
              const restam = (c.totalPrestacoes ?? 0) - (c.prestacoesPagas ?? 0);
              return s + restam * c.deposito;
            }, 0);
            const totalDividaOutras = minhasDividas.reduce((s, d) => s + (d.valorTotal - d.valorPago), 0);
            const totalDivida = totalDividaCompras + totalDividaOutras;

            // ── Próxima prestação ────────────────────────────────────────────
            const proximaPrestacao = compras
              .flatMap(c => {
                const prox = (c.prestacoes ?? []).find(p => !p.paga);
                if (!prox) return [];
                return [{ valor: prox.valor, data: prox.dataVencimento, veiculo: getVehicleName(c.vehicleId) }];
              })
              .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null;

            const totalPrestacoesPagas   = compras.reduce((s, c) => s + (c.prestacoesPagas ?? 0), 0);
            const totalPrestacoesTotais  = compras.reduce((s, c) => s + (c.totalPrestacoes ?? 0), 0);
            const viaturasLiquidadas     = compras.filter(c => c.status === 'liquidada').length;

            // ── Evolução mensal (12 meses) ───────────────────────────────────
            const hojeD = new Date();
            const mesesEvol = Array.from({ length: 12 }, (_, idx) => {
              const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - (11 - idx), 1);
              const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              let valor = 0;
              alugueres.filter(a => a.status === 'concluida' && a.dataFim.startsWith(mesKey))
                .forEach(a => { valor += a.valorTotal; });
              compras.forEach(c => {
                (c.prestacoes ?? [])
                  .filter(p => p.paga && p.dataPagamento?.startsWith(mesKey))
                  .forEach(p => { valor += p.valorPago ?? p.valor; });
              });
              return { label: MESES[d.getMonth()], valor, isNow: idx === 11 };
            });
            const maxEvol = Math.max(...mesesEvol.map(m => m.valor), 1);

            // ── Prestação mensal por viatura ────────────────────────────────
            const prestMensais = compras
              .filter(c => (c.totalPrestacoes ?? 0) > 0 && (c.totalPrestacoes ?? 0) > (c.prestacoesPagas ?? 0))
              .map(c => {
                const prox = (c.prestacoes ?? []).find(p => !p.paga);
                return {
                  nome:   getVehicleName(c.vehicleId),
                  valor:  prox?.valor ?? c.deposito,
                  data:   prox?.dataVencimento ?? '',
                  pagas:  c.prestacoesPagas ?? 0,
                  total:  c.totalPrestacoes ?? 0,
                };
              });

            const historico = historicoPag;
            const tipoCls   = TIPO_CLS;
            const tipoLabel = TIPO_LABEL;

            // ── Download extrato ────────────────────────────────────────────
            const downloadExtrato = () => {
              const hoje = fmtData(new Date().toISOString().split('T')[0]);
              const totalHist = historico.reduce((s, e) => s + e.valor, 0);
              const body = `
                <div class="doc-title">Extrato de Conta</div>
                <div class="doc-sub">Gerado a ${hoje}</div>
                <div class="info-grid">
                  <div class="info-box">
                    <div class="info-label">Remetente</div>
                    <div class="info-value">SOS Motors</div>
                    <div class="info-sub">info@rentcar.co.mz</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Destinatário</div>
                    <div class="info-value">${fullUser?.nome ?? authUser?.nome ?? '—'}</div>
                    <div class="info-sub">${fullUser?.email ?? authUser?.email ?? '—'}</div>
                  </div>
                </div>
                <div class="section-title">Resumo de Contratos</div>
                <div class="summary-box">
                  ${totalPagoAlugueres > 0 ? `<div class="summary-row"><span>Alugueres pagos</span><span class="val-green">${fmt(totalPagoAlugueres)}</span></div>` : ''}
                  ${totalPagoCompras   > 0 ? `<div class="summary-row"><span>Compras (prestações pagas)</span><span class="val-green">${fmt(totalPagoCompras)}</span></div>` : ''}
                  ${totalPagoXitique   > 0 ? `<div class="summary-row"><span>Xitique</span><span class="val-green">${fmt(totalPagoXitique)}</span></div>` : ''}
                  <div class="summary-row total"><span>Total Pago</span><span class="val-green">${fmt(totalPago)}</span></div>
                  <div class="summary-row total"><span>Total em Dívida</span><span class="${totalDivida > 0 ? 'val-red' : 'val-green'}">${totalDivida > 0 ? fmt(totalDivida) : 'Em dia'}</span></div>
                </div>
                <div class="section-title">Histórico de Pagamentos</div>
                <table>
                  <thead>
                    <tr><th>Data</th><th>Item</th><th>Tipo</th><th style="text-align:right">Valor</th></tr>
                  </thead>
                  <tbody>
                    ${historico.map(ev => `
                      <tr>
                        <td>${ev.data.length === 10 ? fmtData(ev.data) : (ev.data || '—')}</td>
                        <td>${ev.sub}<br><span style="font-size:10px;color:#71717a;">${ev.label}</span></td>
                        <td><span class="badge badge-${ev.tipo}">${tipoLabel[ev.tipo]}</span></td>
                        <td class="val-green" style="text-align:right">${fmt(ev.valor)}</td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td colspan="3">Total</td>
                      <td class="val-green" style="text-align:right;font-size:14px;">${fmt(totalHist)}</td>
                    </tr>
                  </tbody>
                </table>
              `;
              printAsPDF(body, 'Extrato de Conta');
            };

            return (
              <div className="space-y-4">

                {/* ── KPI strip compacto ──────────────────────────────────────── */}
                {(() => {
                  const contratosAtivos =
                    alugueres.filter(a => ACTIVE_STATUSES.includes(a.status)).length +
                    compras.filter(c => c.status !== 'cancelada' && c.status !== 'liquidada').length;
                  const kpis = [
                    {
                      label: 'Total em Dívida',
                      value: totalDivida > 0 ? fmt(totalDivida) : 'Em dia',
                      sub:   totalDivida > 0
                               ? (compras.some(c => c.status === 'prestacao_atraso') ? 'Em atraso' : 'Em aberto')
                               : 'Conta regularizada',
                      bar:   totalDivida > 0 ? 'bg-red-400' : 'bg-amber-400',
                      valueColor: totalDivida > 0 ? 'text-red-400' : 'text-amber-400',
                    },
                    {
                      label: 'Contratos Activos',
                      value: String(contratosAtivos),
                      sub:   contratosAtivos > 0
                               ? `${alugueres.filter(a => ACTIVE_STATUSES.includes(a.status)).length} aluguer · ${compras.filter(c => c.status !== 'cancelada' && c.status !== 'liquidada').length} compra`
                               : 'Nenhum em curso',
                      bar:   contratosAtivos > 0 ? 'bg-amber-400' : 'bg-zinc-600',
                      valueColor: contratosAtivos > 0 ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Próxima Prestação',
                      value: proximaPrestacao ? fmt(proximaPrestacao.valor) : '—',
                      sub:   proximaPrestacao ? `Vence ${fmtData(proximaPrestacao.data)}` : 'Sem pendentes',
                      bar:   proximaPrestacao ? 'bg-amber-400' : 'bg-zinc-600',
                      valueColor: proximaPrestacao ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Total Pago',
                      value: totalPago > 0 ? fmt(totalPago) : '—',
                      sub:   totalPago > 0
                               ? [totalPagoAlugueres > 0 && 'Alu.', totalPagoCompras > 0 && 'Compra', totalPagoXitique > 0 && 'Xit.'].filter(Boolean).join(' · ')
                               : 'Sem pagamentos',
                      bar:   totalPago > 0 ? 'bg-amber-400' : 'bg-zinc-600',
                      valueColor: totalPago > 0 ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Prestações Pagas',
                      value: totalPrestacoesTotais > 0 ? `${totalPrestacoesPagas}/${totalPrestacoesTotais}` : '—',
                      sub:   viaturasLiquidadas > 0 ? `${viaturasLiquidadas} liquidada${viaturasLiquidadas > 1 ? 's' : ''}` : 'Em curso',
                      bar:   totalPrestacoesPagas > 0 ? 'bg-amber-400' : 'bg-zinc-600',
                      valueColor: totalPrestacoesPagas > 0 ? 'text-amber-400' : 'text-white',
                    },
                  ];
                  return (
                    <>
                      <div className="grid grid-cols-5 gap-3">
                        {kpis.map((k, i) => {
                          const isDiv = i === 0;
                          return (
                            <div
                              key={i}
                              onClick={isDiv ? () => setShowDividaDetail(v => !v) : undefined}
                              className={`bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden transition-all duration-200 ${isDiv ? 'cursor-pointer hover:border-amber-500/50 hover:-translate-y-0.5 select-none' : 'hover:border-amber-500/50 hover:-translate-y-0.5'}`}
                            >
                              <div className="p-3.5">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest leading-tight">{k.label}</p>
                                  {isDiv && (
                                    <svg
                                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                                      strokeLinecap="round"
                                      className={`text-white shrink-0 transition-transform duration-200 ${showDividaDetail ? 'rotate-180' : ''}`}
                                    >
                                      <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                  )}
                                </div>
                                <p className={`text-xl font-black leading-none tabular-nums mb-1.5 ${k.valueColor}`}>{k.value}</p>
                                <p className="text-xs text-white leading-tight truncate">{k.sub}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Painel de detalhe da dívida ────────────────────────── */}
                      {showDividaDetail && (
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                            <div className="flex items-center gap-2.5">
                              <div className="w-1 h-4 bg-red-500 rounded-full" />
                              <span className="text-xs font-black text-red-400 uppercase tracking-widest">Detalhe da Dívida</span>
                            </div>
                            <button
                              onClick={() => setShowDividaDetail(false)}
                              className="w-5 h-5 flex items-center justify-center rounded text-white hover:bg-zinc-800 transition-colors"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>

                          {totalDivida === 0 ? (
                            <div className="flex items-center gap-2 px-4 py-4">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              <p className="text-xs font-bold text-emerald-400">Conta regularizada — sem dívidas em aberto.</p>
                            </div>
                          ) : (
                            <>
                              <div className="divide-y divide-zinc-800/60">

                                {/* Prestações de compras */}
                                {prestacoesPendentes.map(c => {
                                  const restam      = (c.totalPrestacoes ?? 0) - (c.prestacoesPagas ?? 0);
                                  const proxPrest   = (c.prestacoes ?? []).find(p => !p.paga);
                                  const montante    = (c.prestacoes ?? []).filter(p => !p.paga).reduce((s, p) => s + p.valor, 0) || restam * c.deposito;
                                  const emAtraso    = c.status === 'prestacao_atraso';
                                  return (
                                    <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className="text-xs font-bold text-white truncate">{getVehicleName(c.vehicleId)}</p>
                                          {emAtraso && (
                                            <span className="text-[8px] font-black bg-red-500/15 text-red-400 border border-red-500/25 rounded-md px-1.5 py-0.5 shrink-0">Atraso</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-white">
                                          {restam} prestação{restam !== 1 ? 'ões' : ''} em falta
                                          {proxPrest?.dataVencimento ? ` · Próxima: ${fmtData(proxPrest.dataVencimento)}` : ''}
                                        </p>
                                        {(c.totalPrestacoes ?? 0) > 0 && (
                                          <div className="flex gap-0.5 mt-1.5">
                                            {Array.from({ length: c.totalPrestacoes ?? 0 }).map((_, idx) => (
                                              <div key={idx} className={`flex-1 h-0.5 rounded-full ${idx < (c.prestacoesPagas ?? 0) ? 'bg-amber-500' : emAtraso ? 'bg-red-500/50' : 'bg-zinc-700'}`} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className={`text-sm font-black tabular-nums ${emAtraso ? 'text-red-400' : 'text-amber-400'}`}>{fmt(montante)}</p>
                                        <p className="text-xs text-white">{fmt(proxPrest?.valor ?? c.deposito)}/mês</p>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Outras dívidas (Finance context) */}
                                {minhasDividas.map(d => {
                                  const emAberto = d.valorTotal - d.valorPago;
                                  return (
                                    <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate">{d.descricao}</p>
                                        <p className="text-xs text-white">
                                          {d.dataVencimento ? `Vence ${d.dataVencimento}` : 'Sem data de vencimento'}
                                          {d.valorPago > 0 && ` · Pago: ${fmt(d.valorPago)}`}
                                        </p>
                                      </div>
                                      <p className="text-sm font-black text-red-400 tabular-nums shrink-0">{fmt(emAberto)}</p>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Totais breakdown + rodapé */}
                              <div className="border-t border-zinc-800 bg-zinc-800/30">
                                {totalDividaCompras > 0 && (
                                  <div className="flex items-center justify-between px-4 py-2">
                                    <span className="text-xs text-white">Prestações em aberto</span>
                                    <span className="text-xs font-black text-amber-400 tabular-nums">{fmt(totalDividaCompras)}</span>
                                  </div>
                                )}
                                {totalDividaOutras > 0 && (
                                  <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/50">
                                    <span className="text-xs text-white">Outras dívidas</span>
                                    <span className="text-xs font-black text-red-400 tabular-nums">{fmt(totalDividaOutras)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
                                  <span className="text-xs font-black text-white uppercase tracking-wide">Total em Dívida</span>
                                  <span className="text-base font-black text-red-400 tabular-nums">{fmt(totalDivida)}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* ── Evolução + Compras em Prestação (2 col) ──────────────── */}
                <div className="grid lg:grid-cols-2 gap-3">

                  {/* Evolução de Pagamentos — compacto */}
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Evolução</span>
                      </div>
                      <span className="text-xs text-white">12 meses</span>
                    </div>
                    <div className="px-4 pt-4 pb-3">
                      {mesesEvol.every(m => m.valor === 0) ? (
                        <div className="flex items-center justify-center py-5">
                          <span className="text-xs text-white">Sem pagamentos registados</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-end gap-0.5 h-20">
                            {mesesEvol.map((m, i) => {
                              const pct = maxEvol > 0 ? (m.valor / maxEvol) * 100 : 0;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                  {m.valor > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                      <div className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[8px] text-white whitespace-nowrap -translate-y-5 mx-auto w-fit">{fmt(m.valor)}</div>
                                    </div>
                                  )}
                                  <div className="w-full flex flex-col justify-end" style={{ height: '62px' }}>
                                    {m.valor > 0
                                      ? <div className={`w-full rounded-t ${m.isNow ? 'bg-amber-500' : 'bg-zinc-700 group-hover:bg-zinc-600'}`} style={{ height: `${Math.max(pct, 8)}%` }} />
                                      : <div className="w-full h-px bg-zinc-800/60 mt-auto" />
                                    }
                                  </div>
                                  <span className={`text-[10px] font-bold leading-none ${m.isNow ? 'text-amber-400' : 'text-white'}`}>{m.label}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-sm text-white text-right mt-2">
                            Total: <span className="text-white font-black">{fmt(mesesEvol.reduce((s, m) => s + m.valor, 0))}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compras em Prestação — Prestação Mensal + Pendentes fundidos */}
                  {compras.filter(c => (c.totalPrestacoes ?? 0) > 0).length > 0 ? (
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1 h-4 bg-amber-500 rounded-full" />
                          <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Compras em Prestação</span>
                        </div>
                        <span className="text-xs text-white">{compras.filter(c => (c.totalPrestacoes ?? 0) > 0).length}</span>
                      </div>
                      <div className="divide-y divide-zinc-800/50">
                        {compras.filter(c => (c.totalPrestacoes ?? 0) > 0).map(c => {
                          const pagas  = c.prestacoesPagas ?? 0;
                          const total  = c.totalPrestacoes ?? 0;
                          const pct    = total > 0 ? (pagas / total) * 100 : 0;
                          const proxP  = (c.prestacoes ?? []).find(p => !p.paga);
                          const emAtr  = c.status === 'prestacao_atraso';
                          const liquid = c.status === 'liquidada';
                          const st     = RES_STATUS[c.status];
                          return (
                            <div key={c.id} className="px-3 py-3">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-xs font-bold text-white truncate">{getVehicleName(c.vehicleId)}</p>
                                    <span className={`text-[8px] font-black border rounded-md px-1.5 py-0.5 shrink-0 ${st.cls}`}>{st.label}</span>
                                  </div>
                                  <p className="text-xs text-white">
                                    {pagas}/{total} prestações
                                    {proxP?.dataVencimento && !liquid ? ` · Próxima: ${fmtData(proxP.dataVencimento)}` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-sm font-black tabular-nums ${liquid ? 'text-emerald-400' : emAtr ? 'text-red-400' : 'text-amber-400'}`}>
                                    {fmt(proxP?.valor ?? c.deposito)}
                                  </p>
                                  {!liquid && <p className="text-xs text-white">/mês</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${liquid ? 'bg-emerald-500' : emAtr ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-white tabular-nums shrink-0">{Math.round(pct)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl flex items-center justify-center p-6">
                      <p className="text-xs text-white text-center">Sem planos de prestação activos</p>
                    </div>
                  )}
                </div>

                {/* ── Outras Dívidas (Finance context) — só aparece se existirem ── */}
                {minhasDividas.length > 0 && (
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 bg-red-500 rounded-full" />
                        <span className="text-xs font-black text-red-400 uppercase tracking-widest">Outras Dívidas</span>
                      </div>
                      <span className="text-xs font-black text-white">{minhasDividas.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {minhasDividas.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{d.descricao}</p>
                            <p className="text-xs text-white">
                              {d.dataVencimento ? `Vence ${d.dataVencimento}` : 'Sem data'}
                              {d.valorPago > 0 ? ` · Pago: ${fmt(d.valorPago)}` : ''}
                            </p>
                          </div>
                          <span className="text-sm font-black text-red-400 tabular-nums shrink-0">{fmt(d.valorTotal - d.valorPago)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Tabela Detalhada + Centro de Descargas ─────────────────── */}
                {(() => {
                  type FaturaStatus = 'pago' | 'vencendo' | 'pendente' | 'atrasado' | 'cancelado';
                  type Fatura = { id: string; descricao: string; dataVencimento: string; valor: number; statusKey: FaturaStatus; reservationRef: Reservation; tipo: 'aluguer' | 'compra'; prestacaoRef?: Prestacao; };

                  const hojeStr  = new Date().toISOString().split('T')[0];
                  const diasAte  = (d: string) => Math.ceil((new Date(d).getTime() - new Date(hojeStr).getTime()) / 86400000);
                  const getFatStatus = (paga: boolean, cancel: boolean, dataVenc: string): FaturaStatus => {
                    if (cancel) return 'cancelado';
                    if (paga)   return 'pago';
                    const d = diasAte(dataVenc);
                    return d < 0 ? 'atrasado' : d <= 7 ? 'vencendo' : 'pendente';
                  };

                  const faturas: Fatura[] = [];
                  let fi = 1;
                  alugueres.forEach(a => {
                    faturas.push({
                      id: `FAT-${String(fi++).padStart(3, '0')}`,
                      descricao: getVehicleName(a.vehicleId),
                      dataVencimento: a.dataFim,
                      valor: a.valorTotal,
                      statusKey: getFatStatus(a.status === 'concluida', a.status === 'cancelada', a.dataFim),
                      reservationRef: a,
                      tipo: 'aluguer',
                    });
                  });
                  compras.forEach(c => {
                    const prests = c.prestacoes ?? [];
                    if (prests.length > 0) {
                      prests.forEach(p => {
                        faturas.push({
                          id: `FAT-${String(fi++).padStart(3, '0')}`,
                          descricao: `${getVehicleName(c.vehicleId)} · Prest. ${p.numero}`,
                          dataVencimento: p.dataVencimento,
                          valor: p.valorPago ?? p.valor,
                          statusKey: getFatStatus(p.paga, c.status === 'cancelada', p.dataVencimento),
                          reservationRef: c,
                          tipo: 'compra',
                          prestacaoRef: p,
                        });
                      });
                    } else {
                      faturas.push({
                        id: `FAT-${String(fi++).padStart(3, '0')}`,
                        descricao: getVehicleName(c.vehicleId),
                        dataVencimento: c.dataFim,
                        valor: c.deposito,
                        statusKey: getFatStatus(c.status === 'liquidada', c.status === 'cancelada', c.dataFim),
                        reservationRef: c,
                        tipo: 'compra',
                      });
                    }
                  });

                  const STATUS_STYLE: Record<FaturaStatus, { label: string; cls: string; dot: string }> = {
                    pago:      { label: 'Pago',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
                    vencendo:  { label: 'Vencendo',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400' },
                    pendente:  { label: 'Pendente',  cls: 'bg-zinc-700/60 text-white border-zinc-600',                dot: 'bg-white' },
                    atrasado:  { label: 'Atrasado',  cls: 'bg-red-500/15 text-red-400 border-red-500/30',             dot: 'bg-red-400' },
                    cancelado: { label: 'Cancelado', cls: 'bg-zinc-800 text-white border-zinc-700',                   dot: 'bg-zinc-500' },
                  };

                  const fatFiltradas = faturas.filter(f => {
                    const matchStatus = faturaStatusFiltro === 'todos' || f.statusKey === faturaStatusFiltro;
                    const q = faturaSearch.toLowerCase();
                    const matchQ = !q || f.id.toLowerCase().includes(q) || f.descricao.toLowerCase().includes(q) || f.dataVencimento.includes(q);
                    return matchStatus && matchQ;
                  });

                  const downloadResumoDiv = () => {
                    const hoje = fmtData(new Date().toISOString().split('T')[0]);
                    const rows = faturas.filter(f => f.statusKey !== 'pago' && f.statusKey !== 'cancelado').map(f => `
                      <tr>
                        <td>${f.id}</td>
                        <td>${f.descricao}</td>
                        <td>${fmtData(f.dataVencimento)}</td>
                        <td class="val-red">${fmt(f.valor)}</td>
                        <td><span class="badge badge-divida">${STATUS_STYLE[f.statusKey].label}</span></td>
                      </tr>
                    `).join('');
                    const body = `
                      <div class="doc-title">Resumo de Dívida</div>
                      <div class="doc-sub">Gerado a ${hoje}</div>
                      <div class="info-grid">
                        <div class="info-box"><div class="info-label">Titular</div><div class="info-value">${authUser?.nome ?? '—'}</div><div class="info-sub">${authUser?.email ?? '—'}</div></div>
                        <div class="info-box"><div class="info-label">Total em Dívida</div><div class="info-value val-red">${fmt(totalDivida)}</div></div>
                      </div>
                      <div class="section-title">Facturas em Aberto</div>
                      <table><thead><tr><th>Factura</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Estado</th></tr></thead>
                      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#a1a1aa">Sem dívidas em aberto</td></tr>'}</tbody></table>
                    `;
                    printAsPDF(body, 'Resumo de Dívida');
                  };

                  const downloadContratos = () => {
                    const hoje = fmtData(new Date().toISOString().split('T')[0]);
                    const rowsA = alugueres.map(a => `<tr><td>${getVehicleName(a.vehicleId)}</td><td>${fmtData(a.dataInicio)}</td><td>${fmtData(a.dataFim)}</td><td class="val-amber">${fmt(a.valorTotal)}</td><td>${RES_STATUS[a.status]?.label ?? a.status}</td></tr>`).join('');
                    const rowsC = compras.map(c => `<tr><td>${getVehicleName(c.vehicleId)}</td><td>${fmtData(c.dataInicio)}</td><td>—</td><td class="val-green">${fmt(c.deposito)}/mês</td><td>${RES_STATUS[c.status]?.label ?? c.status}</td></tr>`).join('');
                    const body = `
                      <div class="doc-title">Comprovativo de Contratos</div>
                      <div class="doc-sub">Gerado a ${hoje}</div>
                      <div class="section-title">Alugueres</div>
                      <table><thead><tr><th>Viatura</th><th>Início</th><th>Fim</th><th>Valor</th><th>Estado</th></tr></thead><tbody>${rowsA || '<tr><td colspan="5" style="text-align:center;color:#a1a1aa">Sem alugueres</td></tr>'}</tbody></table>
                      <div class="section-title">Compras</div>
                      <table><thead><tr><th>Viatura</th><th>Data</th><th>—</th><th>Prestação</th><th>Estado</th></tr></thead><tbody>${rowsC || '<tr><td colspan="5" style="text-align:center;color:#a1a1aa">Sem compras</td></tr>'}</tbody></table>
                    `;
                    printAsPDF(body, 'Comprovativo de Contratos');
                  };

                  return (
                    <div className="space-y-3">
                      {/* Título da secção */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-1 h-4 rounded-full bg-amber-500" />
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Tabela Detalhada de Pagamentos</span>
                      </div>

                      {/* Barra de pesquisa + filtro */}
                      <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[140px]">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            value={faturaSearch}
                            onChange={e => setFaturaSearch(e.target.value)}
                            placeholder="Pesquisa..."
                            className="w-full rounded-xl bg-zinc-900 border border-amber-500/20 pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-amber-500/60"
                          />
                        </div>
                        <select
                          value={faturaStatusFiltro}
                          onChange={e => setFaturaStatusFiltro(e.target.value as typeof faturaStatusFiltro)}
                          className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50 cursor-pointer"
                        >
                          <option value="todos">Todos os estados</option>
                          <option value="pago">Pago</option>
                          <option value="vencendo">Vencendo</option>
                          <option value="pendente">Pendente</option>
                          <option value="atrasado">Atrasado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>

                      {/* Tabela + Centro de Descargas */}
                      <div className="grid lg:grid-cols-[1fr_200px] gap-3 items-start">

                        {/* Tabela */}
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          {/* Cabeçalho */}
                          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-4 py-2.5 border-b border-zinc-800/70 bg-zinc-800/30">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest w-[72px]">Factura ID</span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Data Vencimento</span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-right">Valor</span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-center w-20">Status</span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-center">PDF</span>
                          </div>

                          {fatFiltradas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span className="text-xs text-white">Sem facturas encontradas</span>
                            </div>
                          ) : (
                            <div className="divide-y divide-zinc-800/50 max-h-72 overflow-y-auto">
                              {fatFiltradas.map((f) => {
                                const st = STATUS_STYLE[f.statusKey];
                                const downloadFatura = () => {
                                  const r    = f.reservationRef;
                                  const veh  = getVehicle(r.vehicleId);
                                  const vehName  = veh?.name ?? `Viatura #${r.vehicleId}`;
                                  const matricula = veh?.matricula ?? '—';
                                  const periodo  = `${fmtData(r.dataInicio)} → ${fmtData(r.dataFim)}`;
                                  const dias = Math.max(1, Math.ceil((new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86400000));
                                  const emitidoEm = fmtData(new Date().toISOString().split('T')[0]);
                                  const statusLabel = st.label;
                                  const sPill = f.statusKey === 'pago'
                                    ? 'background:#d1fae5;color:#065f46'
                                    : f.statusKey === 'atrasado'
                                    ? 'background:#fee2e2;color:#991b1b'
                                    : 'background:#fef3c7;color:#92400e';

                                  const p = f.prestacaoRef;
                                  const FORMA_LABEL: Record<string, string> = {
                                    mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro',
                                    transferencia: 'Transferência Bancária', cheque: 'Cheque', outros: 'Outros',
                                  };
                                  const forma   = p?.formaPagamento   ?? r.prestacoes?.find(pp => pp.paga)?.formaPagamento;
                                  const ref     = p?.referenciaPagamento ?? r.prestacoes?.find(pp => pp.paga)?.referenciaPagamento;
                                  const dataPag = p?.dataPagamento    ?? r.prestacoes?.find(pp => pp.paga)?.dataPagamento;

                                  let trows = '';
                                  if (f.tipo === 'aluguer') {
                                    const dailyRate = veh?.price ? parseInt(veh.price.replace(/\D/g, ''), 10) : 0;
                                    if (dailyRate) {
                                      trows += `<tr><td class="td-desc">Aluguer de Viatura</td><td>${fmt(dailyRate)} MT</td><td>${dias} dia${dias !== 1 ? 's' : ''}</td><td class="td-val">${fmt(dailyRate * dias)} MT</td></tr>`;
                                    } else {
                                      trows += `<tr><td class="td-desc">Aluguer de Viatura</td><td>—</td><td>—</td><td class="td-val">${fmt(r.valorTotal)} MT</td></tr>`;
                                    }
                                    if (r.deposito > 0) {
                                      trows += `<tr><td class="td-desc">Depósito / Caução</td><td>—</td><td>—</td><td class="td-val">${fmt(r.deposito)} MT</td></tr>`;
                                    }
                                  } else {
                                    if (p) {
                                      const total = r.prestacoes?.length ?? 0;
                                      trows += `<tr><td class="td-desc">${vehName} · Prestação ${p.numero}${total ? `/${total}` : ''}</td><td>—</td><td>—</td><td class="td-val">${fmt(p.valor)} MT</td></tr>`;
                                    } else {
                                      trows += `<tr><td class="td-desc">${vehName}</td><td>—</td><td>—</td><td class="td-val">${fmt(f.valor)} MT</td></tr>`;
                                    }
                                  }

                                  const vehSection = `
                                    <div class="section">
                                      <div class="section-title">${f.tipo === 'aluguer' ? 'Informação da Viatura' : 'Informação da Viatura'}</div>
                                      <div class="veh-grid">
                                        <div class="veh-cell"><div class="veh-lbl">Modelo</div><div class="veh-val">${vehName}</div></div>
                                        <div class="veh-cell"><div class="veh-lbl">Matrícula</div><div class="veh-val">${matricula}</div></div>
                                        <div class="veh-cell"><div class="veh-lbl">${f.tipo === 'aluguer' ? 'Período de Aluguer' : 'Tipo'}</div><div class="veh-val" style="font-size:11px">${f.tipo === 'aluguer' ? periodo : 'Compra'}</div></div>
                                      </div>
                                    </div>`;

                                  const payLeft = `
                                    <div class="pay-row"><span class="pay-lbl">Data de Vencimento</span><span class="pay-val">${fmtData(f.dataVencimento)}</span></div>
                                    <div class="pay-row"><span class="pay-lbl">Estado</span><span class="pay-val">${statusLabel}</span></div>
                                    ${dataPag ? `<div class="pay-row"><span class="pay-lbl">Data de Pagamento</span><span class="pay-val">${fmtData(dataPag)}</span></div>` : ''}
                                  `;
                                  const payRight = `
                                    ${forma ? `<div class="pay-row"><span class="pay-lbl">Forma de Pagamento</span><span class="pay-val">${FORMA_LABEL[forma] ?? forma}</span></div>` : ''}
                                    ${ref   ? `<div class="pay-row"><span class="pay-lbl">Referência</span><span class="pay-val">${ref}</span></div>` : ''}
                                    <div class="pay-row"><span class="pay-lbl">Valor Total</span><span class="pay-val" style="color:#92400e;font-size:13px">${fmt(f.valor)} MT</span></div>
                                  `;

                                  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${f.id}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#1c1917;background:#f5f5f4}
.toolbar{position:sticky;top:0;z-index:100;background:#18181b;padding:10px 28px;display:flex;align-items:center;justify-content:space-between}
.toolbar-title{color:#f59e0b;font-weight:900;font-size:13px}
.btn-dl{background:#f59e0b;color:#18181b;border:none;border-radius:8px;padding:8px 18px;font-weight:900;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.btn-dl:hover{background:#fbbf24}
.invoice{max-width:740px;margin:28px auto 48px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
.inv-header{display:flex}
.inv-brand{background:#18181b;padding:26px 32px;flex:0 0 55%;display:flex;align-items:center;gap:14px}
.inv-brand img{height:42px;width:auto}
.brand-name{color:#f59e0b;font-size:19px;font-weight:900;letter-spacing:-.5px;line-height:1}
.brand-sub{color:#a16207;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-top:3px}
.inv-contact{padding:20px 28px;flex:1;display:flex;flex-direction:column;justify-content:center;gap:4px;text-align:right}
.contact-item{font-size:11px;color:#57534e}
.gold-bar{height:3px;background:linear-gradient(90deg,#f59e0b 60%,#fef3c7)}
.inv-meta{display:flex}
.bill-to{padding:22px 32px;flex:1}
.section-lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px;color:#92400e;margin-bottom:12px}
.bill-row{display:flex;align-items:baseline;gap:6px;margin-bottom:5px;font-size:12px}
.bill-label{color:#a8a29e;min-width:58px;font-size:11px}
.bill-val{font-weight:700;color:#1c1917}
.inv-badge{background:#18181b;padding:22px 28px;min-width:220px;text-align:right}
.inv-badge-title{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:2.5px;color:#f59e0b;margin-bottom:14px}
.inv-badge-row{font-size:11px;color:#d6d3d1;margin-bottom:6px}
.inv-badge-val{color:#fff;font-weight:800}
.section{padding:18px 32px 0}
.section-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;padding-bottom:8px;border-bottom:1px solid #fef3c7;margin-bottom:12px}
.veh-grid{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden}
.veh-cell{padding:11px 16px;border-right:1px solid #e7e5e4}
.veh-cell:last-child{border-right:none}
.veh-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#a8a29e;margin-bottom:4px}
.veh-val{font-size:13px;font-weight:800;color:#1c1917}
.inv-tbl{width:100%;border-collapse:collapse;margin-top:8px}
.inv-tbl thead tr{background:#18181b}
.inv-tbl th{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#f59e0b;padding:11px 16px;text-align:left}
.inv-tbl th:not(:first-child){text-align:right}
.inv-tbl td{font-size:12px;padding:11px 16px;border-bottom:1px solid #f5f5f4;color:#1c1917}
.td-desc{font-weight:600}
.td-val{font-weight:800;text-align:right}
.inv-tbl td:not(:first-child){text-align:right}
.row-sub td{background:#fefce8;font-weight:700;border-bottom:none}
.row-total td{background:#f59e0b;font-weight:900;font-size:13px;border-bottom:none;color:#1c1917}
.pay-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;margin-top:8px}
.pay-col:first-child{border-right:1px solid #e7e5e4}
.pay-row{display:flex;padding:9px 16px;border-bottom:1px solid #f5f5f4;font-size:12px}
.pay-row:last-child{border-bottom:none}
.pay-lbl{color:#a8a29e;min-width:120px;font-size:11px}
.pay-val{font-weight:700;color:#1c1917}
.inv-bottom{padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-end}
.notes-text{font-size:11px;color:#78716c;line-height:1.7;max-width:320px}
.sig-block{text-align:right}
.sig-date{font-size:11px;color:#78716c;margin-bottom:28px}
.sig-line-el{border-top:1px solid #1c1917;padding-top:6px;display:inline-block;min-width:150px}
.sig-name{font-size:12px;font-weight:900}
.sig-role{font-size:10px;color:#78716c;margin-top:2px}
.inv-footer{background:#18181b;padding:12px 32px;display:flex;justify-content:space-between;align-items:center}
.footer-txt{font-size:10px;color:#78716c}
.status-pill{font-size:10px;font-weight:800;padding:3px 14px;border-radius:20px}
@media print{body{background:#fff}.toolbar{display:none!important}.invoice{max-width:none;margin:0;box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="toolbar">
  <span class="toolbar-title">${f.id} · ${vehName}</span>
  <button class="btn-dl" onclick="window.print()">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Descarregar PDF
  </button>
</div>
<div class="invoice">
  <div class="inv-header">
    <div class="inv-brand">
      <img src="/sos-motors-logo.png" alt="SOS Motors">
      <div><div class="brand-name">SOS Motors</div><div class="brand-sub">Aluguer de Viaturas · Moçambique</div></div>
    </div>
    <div class="inv-contact">
      <span class="contact-item">Av. Julius Nyerere, Maputo, Moçambique</span>
      <span class="contact-item">+258 84 000 0000</span>
      <span class="contact-item">geral@sosmotors.co.mz</span>
      <span class="contact-item">www.sosmotors.co.mz</span>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="inv-meta">
    <div class="bill-to">
      <div class="section-lbl">Bill To</div>
      <div class="bill-row"><span class="bill-label">Nome</span><span class="bill-val">${r.clientName}</span></div>
      ${r.clientEmail ? `<div class="bill-row"><span class="bill-label">Email</span><span class="bill-val">${r.clientEmail}</span></div>` : ''}
      ${r.clientPhone ? `<div class="bill-row"><span class="bill-label">Telefone</span><span class="bill-val">${r.clientPhone}</span></div>` : ''}
    </div>
    <div class="inv-badge">
      <div class="inv-badge-title">Factura</div>
      <div class="inv-badge-row">N.º Factura: <span class="inv-badge-val">${f.id}</span></div>
      <div class="inv-badge-row">Emitida a: <span class="inv-badge-val">${emitidoEm}</span></div>
      <div class="inv-badge-row">Vencimento: <span class="inv-badge-val">${fmtData(f.dataVencimento)}</span></div>
    </div>
  </div>
  ${vehSection}
  <div class="section" style="margin-top:16px">
    <div class="section-title">Descrição de Encargos</div>
    <table class="inv-tbl">
      <thead><tr>
        <th style="width:45%">Descrição</th>
        <th>Preço Unit.</th>
        <th>Qtd.</th>
        <th>Subtotal</th>
      </tr></thead>
      <tbody>
        ${trows}
        <tr class="row-sub"><td colspan="3">Subtotal</td><td class="td-val">${fmt(f.valor)} MT</td></tr>
        <tr class="row-total"><td colspan="3">Total</td><td class="td-val">${fmt(f.valor)} MT</td></tr>
      </tbody>
    </table>
  </div>
  <div class="section" style="margin-top:16px">
    <div class="section-title">Informação de Pagamento</div>
    <div class="pay-grid">
      <div class="pay-col">${payLeft}</div>
      <div class="pay-col">${payRight}</div>
    </div>
  </div>
  <div class="inv-bottom">
    <div class="notes-text">
      Obrigado por escolher a SOS Motors para as suas necessidades.<br>
      Para qualquer questão sobre esta factura, contacte-nos em<br>
      <b>+258 84 000 0000</b> ou <b>geral@sosmotors.co.mz</b>.
    </div>
    <div class="sig-block">
      <div class="sig-date">Data: ${emitidoEm}</div>
      <div class="sig-line-el">
        <div class="sig-name">SOS Motors Lda.</div>
        <div class="sig-role">Assinatura Autorizada</div>
      </div>
    </div>
  </div>
  <div class="inv-footer">
    <span class="footer-txt">SOS Motors · Documento gerado automaticamente</span>
    <span class="status-pill" style="${sPill}">${statusLabel}</span>
  </div>
</div>
</body>
</html>`;
                                  const win = window.open('', '_blank');
                                  if (!win) return;
                                  win.document.write(html);
                                  win.document.close();
                                  win.focus();
                                };
                                return (
                                  <div key={f.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                                    <span className="text-xs font-black text-amber-400 tabular-nums w-[72px] shrink-0">{f.id}</span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-white truncate">{f.descricao}</p>
                                      <p className="text-xs text-white">{fmtData(f.dataVencimento)}</p>
                                    </div>
                                    <span className="text-xs font-black text-white tabular-nums text-right whitespace-nowrap shrink-0">{fmt(f.valor)}</span>
                                    <span className={`text-xs font-black border rounded-md px-2 py-0.5 whitespace-nowrap w-20 text-center shrink-0 ${st.cls}`}>
                                      {st.label}
                                    </span>
                                    <button
                                      onClick={downloadFatura}
                                      title="Ver PDF"
                                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-amber-400/20 hover:text-amber-400 text-white border border-zinc-700 transition-colors shrink-0"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Centro de Descargas */}
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                            <div className="w-1 h-4 bg-amber-500 rounded-full" />
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Descargas</span>
                          </div>
                          <div className="p-3 space-y-2">
                            <button
                              onClick={downloadResumoDiv}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors leading-tight">Resumo de Dívida<br/><span className="text-white font-normal">PDF</span></span>
                            </button>
                            <button
                              onClick={downloadContratos}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors leading-tight">Comprovativo<br/><span className="text-white font-normal">PDF</span></span>
                            </button>
                            <button
                              onClick={downloadExtrato}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>
                              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors leading-tight">Histórico de Facturas<br/><span className="text-white font-normal">PDF</span></span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* ── Histórico de pagamentos ────────────────────────────────── */}
                <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-4 bg-amber-500 rounded-full" />
                      <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Histórico</span>
                    </div>
                    <span className="text-xs font-black bg-zinc-800 border border-zinc-700 text-white rounded-full px-2 py-0.5">{historico.length}</span>
                  </div>

                  {historico.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span className="text-xs text-white">Sem pagamentos registados</span>
                    </div>
                  ) : (
                    <>
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-800/25">
                        <span className="text-xs font-black text-white uppercase tracking-widest">Data / Item</span>
                        <span className="text-xs font-black text-white uppercase tracking-widest text-right">Valor</span>
                        <span className="text-xs font-black text-white uppercase tracking-widest text-center">Tipo</span>
                        <span className="text-xs font-black text-white uppercase tracking-widest text-center">Recibo</span>
                      </div>

                      {/* Rows */}
                      <div className="divide-y divide-zinc-800/50 max-h-80 overflow-y-auto">
                        {historico.map((ev, i) => {
                          const downloadRecibo = () => {
                            const FORMA_LABEL_R: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência Bancária', cheque: 'Cheque', outros: 'Outros' };
                            const body = `
                              <div class="doc-title">Recibo de Pagamento</div>
                              <div class="doc-sub">Recibo Nº ${i + 1}</div>
                              <div class="info-grid">
                                <div class="info-box">
                                  <div class="info-label">Emitido por</div>
                                  <div class="info-value">SOS Motors</div>
                                  <div class="info-sub">geral@sosmotors.co.mz</div>
                                </div>
                                <div class="info-box">
                                  <div class="info-label">Titular</div>
                                  <div class="info-value">${ev.clientName ?? fullUser?.nome ?? '—'}</div>
                                  ${ev.clientEmail ? `<div class="info-sub">${ev.clientEmail}</div>` : ''}
                                  ${ev.clientPhone ? `<div class="info-sub">${ev.clientPhone}</div>` : ''}
                                </div>
                              </div>
                              <div class="section-title">Detalhes do Pagamento</div>
                              <div class="summary-box">
                                <div class="summary-row"><span>Item</span><span><b>${ev.sub}</b></span></div>
                                <div class="summary-row"><span>Viatura</span><span>${ev.label}${ev.matricula ? ` · ${ev.matricula}` : ''}</span></div>
                                ${ev.dataInicio ? `<div class="summary-row"><span>Período</span><span>${fmtData(ev.dataInicio)}${ev.dataFim ? ` → ${fmtData(ev.dataFim)}` : ''}</span></div>` : ''}
                                ${ev.diasAluguer ? `<div class="summary-row"><span>Duração / Taxa</span><span>${ev.diasAluguer} dia${ev.diasAluguer !== 1 ? 's' : ''} · ${fmt(ev.valorDiario ?? 0)}/dia</span></div>` : ''}
                                <div class="summary-row"><span>Data de Pagamento</span><span>${ev.data.length === 10 ? fmtData(ev.data) : (ev.data || '—')}</span></div>
                                <div class="summary-row"><span>Hora de Pagamento</span><span>${ev.horaPagamento ?? '—'}</span></div>
                                ${ev.formaPagamento ? `<div class="summary-row"><span>Método</span><span>${FORMA_LABEL_R[ev.formaPagamento] ?? ev.formaPagamento}</span></div>` : ''}
                                ${ev.referenciaPagamento ? `<div class="summary-row"><span>Referência</span><span>${ev.referenciaPagamento}</span></div>` : ''}
                                <div class="summary-row"><span>Tipo</span><span><span class="badge badge-${ev.tipo}">${tipoLabel[ev.tipo]}</span></span></div>
                                <div class="summary-row total"><span>Valor Pago</span><span class="val-green">${fmt(ev.valor)} MT</span></div>
                              </div>
                            `;
                            printAsPDF(body, `Recibo ${i + 1}`);
                          };
                          return (
                            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{ev.sub}</p>
                                <p className="text-sm text-white truncate">{ev.data ? (ev.data.length === 10 ? fmtData(ev.data) : ev.data) : '—'}</p>
                              </div>
                              <span className="text-sm font-black text-amber-400 tabular-nums text-right whitespace-nowrap">{fmt(ev.valor)}</span>
                              <span className={`text-xs font-black border rounded-md px-2 py-0.5 whitespace-nowrap ${tipoCls[ev.tipo]}`}>
                                {tipoLabel[ev.tipo].toUpperCase()}
                              </span>
                              <button
                                onClick={downloadRecibo}
                                title="Baixar recibo"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-amber-400/20 hover:text-amber-400 text-white border border-zinc-700 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer total */}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-800/30">
                        <span className="text-sm text-white font-bold">Total do histórico</span>
                        <span className="text-sm font-black text-amber-400">{fmt(historico.reduce((s, e) => s + e.valor, 0))}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Estado vazio ───────────────────────────────────────────── */}
                {totalPago === 0 && totalDivida === 0 && historico.length === 0 && (
                  <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 text-center">
                    <div className="text-amber-400 text-2xl mb-2">✅</div>
                    <p className="text-white text-sm font-bold">Sem movimentos financeiros</p>
                    <p className="text-white text-xs mt-1">As suas reservas e compras aparecem aqui após registo.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ XITIQUE ═══════════════════════════════════════════════════════ */}
          {section === 'xitique' && (
            <div className="space-y-4">
              {/* Estado do grupo */}
              {grupoDoUser && (() => {
                const estadoGrupo = grupoDoUser.estadoGrupo ?? 'Aberto';
                const membrosActuais = grupoDoUser.membros.length;
                const dataInicio = grupoDoUser.dataInicio;
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Estado', value: estadoGrupo === 'EmAndamento' ? 'Em Andamento' : estadoGrupo === 'Concluido' ? 'Concluído' : 'Aberto' },
                        estadoGrupo === 'Aberto'
                          ? { label: 'Membros', value: `${membrosActuais} / ${numMembros}` }
                          : { label: 'Mês Actual', value: `${mesAtual} / ${numMembros}` },
                        { label: 'Prémio Mensal', value: fmt(premioMT) },
                      ].map(s => (
                        <div key={s.label} className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-3 text-center">
                          <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">{s.label}</div>
                          <div className="text-sm font-black text-white leading-tight">{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {dataInicio && (
                      <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/20 rounded-xl px-4 py-2.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span className="text-xs text-white">Início do ciclo:</span>
                        <span className="text-xs font-black text-amber-400">{fmtData(dataInicio)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {membro && (
                <div className={`rounded-2xl border p-5 space-y-4 ${membro.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' : membro.estado === 'Aceite' ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-900 border-amber-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${membro.estado === 'Sorteado' ? 'bg-emerald-400' : membro.estado === 'Aceite' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500 animate-pulse'}`} />
                      <span className={`text-sm font-black uppercase tracking-wide ${membro.estado === 'Sorteado' ? 'text-emerald-400' : membro.estado === 'Aceite' ? 'text-amber-400' : 'text-white'}`}>
                        {membro.estado === 'Sorteado' ? 'Contemplado 🎉' : membro.estado === 'Aceite' ? 'Pagamento Confirmado' : grupoDoUser?.estadoGrupo === 'Aberto' ? 'Inscrito no Grupo' : 'Pagamento Pendente'}
                      </span>
                    </div>
                    {grupoDoUser?.estadoGrupo === 'EmAndamento' && <span className="text-xs text-white">Mês {mesAtual}</span>}
                  </div>
                  <p className="text-xs text-white leading-relaxed">
                    {membro.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'Aberto' && `O grupo aguarda os restantes ${numMembros - (grupoDoUser?.membros.length ?? 0)} membros.`}
                    {membro.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'EmAndamento' && `Efectue o pagamento de ${fmt(quotaMT)} e aguarde a confirmação.`}
                    {membro.estado === 'Aceite' && `O seu pagamento de ${fmt(quotaMT)} foi confirmado.`}
                    {membro.estado === 'Sorteado' && `Parabéns! Foi contemplado e receberá ${fmt(premioMT)}.`}
                  </p>

                  {membro.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'EmAndamento' && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 space-y-3">
                      <div className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Contas para Pagamento</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-zinc-900 border border-zinc-700/50 rounded-lg">
                          <div className="text-[10px] text-white font-bold uppercase mb-1">M-Pesa</div>
                          <div className="text-sm font-black text-white">84 000 0000</div>
                          <div className="text-[10px] text-white mt-0.5">SOS Motors Lda</div>
                        </div>
                        <div className="p-3 bg-zinc-900 border border-zinc-700/50 rounded-lg">
                          <div className="text-[10px] text-white font-bold uppercase mb-1">e-Mola</div>
                          <div className="text-sm font-black text-white">86 000 0000</div>
                          <div className="text-[10px] text-white mt-0.5">SOS Motors Lda</div>
                        </div>
                        <div className="p-3 bg-zinc-900 border border-zinc-700/50 rounded-lg sm:col-span-2">
                          <div className="text-[10px] text-white font-bold uppercase mb-1">Transferência Bancária (Millennium BIM)</div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="text-xs text-white">Conta: <span className="text-sm font-black text-white">0000 0000</span></div>
                              <div className="text-xs text-white">NIB: <span className="text-sm font-mono text-white">0001 0000 0000 0000 0000 0</span></div>
                            </div>
                            <div className="text-[10px] text-white text-left sm:text-right">Titular:<br/>SOS Motors Lda</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-white leading-relaxed mt-2">
                        * Após efectuar a transferência ou depósito, guarde o comprovativo. O administrador irá confirmar o seu pagamento e o estado será actualizado automaticamente.
                      </p>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-xs text-white mb-1.5">
                      <span>Progresso do Ciclo</span>
                      <span>{sorteios.length} / {numMembros} sorteios</span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: numMembros }).map((_, i) => {
                        const s = sorteios[i];
                        const ganhou = s?.vencedor === membro.nome;
                        return <div key={i} className={`flex-1 h-1.5 rounded-full ${ganhou ? 'bg-emerald-400' : s ? 'bg-amber-500' : 'bg-zinc-700'}`} />;
                      })}
                    </div>
                  </div>
                  {sorteioGanho && (
                    <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 text-center">
                      <div className="text-emerald-400 font-black text-sm">🏆 Sorteio do Mês {sorteioGanho.mes}</div>
                      <div className="text-white font-black text-2xl mt-1">{fmt(sorteioGanho.valorPremio)}</div>
                    </div>
                  )}
                </div>
              )}

              {!membro && inscricaoPendente && (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-400 font-black text-sm uppercase tracking-wide">Inscrição em Análise</span>
                  </div>
                  <p className="text-xs text-white leading-relaxed">A sua inscrição foi recebida e está a aguardar validação pelo administrador.</p>
                </div>
              )}

              {membro && (membro.mesesPagos.length > 0 || sorteios.length > 0) && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">O Meu Histórico de Pagamentos</h3>
                  <div className="space-y-2">
                    {Array.from({ length: Math.max(sorteios.length, membro.mesesPagos.length, mesAtual - 1) }, (_, i) => i + 1).map(mes => {
                      const sorteio = sorteios.find(s => s.mes === mes);
                      const pagou   = membro.mesesPagos.includes(mes);
                      const ganhou  = sorteio?.vencedor === membro.nome;
                      const registo = membro.pagamentos?.[mes];
                      return (
                        <div key={mes} className={`rounded-xl overflow-hidden border ${ganhou ? 'border-emerald-400/20' : 'border-transparent'}`}>
                          <div className={`flex items-center justify-between gap-2 px-3 py-2.5 ${ganhou ? 'bg-emerald-400/10' : 'bg-zinc-800/50'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">{mes}</span>
                              <div>
                                <span className="text-xs text-white">Mês {mes}</span>
                                {ganhou && <p className="text-xs text-emerald-400 font-black">🏆 Contemplado</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pagou
                                ? <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Pago</span>
                                : <span className="text-xs font-bold text-white bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">Pendente</span>
                              }
                              {ganhou && sorteio && <span className="text-xs text-amber-400 font-black">{fmt(sorteio.valorPremio)}</span>}
                            </div>
                          </div>
                          {pagou && registo && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 py-1.5 bg-zinc-900/60 border-t border-zinc-700/40">
                              <span className="text-xs text-white">Via <span className="text-white font-bold">{registo.metodo}</span></span>
                              {registo.referencia && <span className="text-xs text-white">Ref: <span className="text-white font-bold">{registo.referencia}</span></span>}
                              <span className="text-xs text-white">{registo.data}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-xs">
                    <span className="text-white">Total pago</span>
                    <span className="text-white font-black">{fmt(membro.mesesPagos.length * quotaMT)}</span>
                  </div>
                </div>
              )}

              {sorteios.length > 0 && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Sorteios do Grupo</h3>
                  <div className="space-y-2">
                    {[...sorteios].reverse().map(s => (
                      <div key={s.mes} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${s.vencedor === membro?.nome ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-zinc-800/50'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">{s.mes}</span>
                          <span className={`text-sm font-semibold truncate ${s.vencedor === membro?.nome ? 'text-emerald-400 font-black' : 'text-white'}`}>
                            {s.vencedor === membro?.nome ? `${s.vencedor} (você)` : s.vencedor}
                          </span>
                        </div>
                        <span className="text-xs text-amber-400 font-bold shrink-0">{fmt(s.valorPremio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!membro && !inscricaoPendente && (
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-zinc-800">
                    {/* Esquerda: porquê participar */}
                    <div className="px-5 py-4">
                      <p className="text-sm font-black text-amber-400 mb-3">Porquê Participar?</p>
                      <ul className="space-y-2">
                        {['Poupança Colectiva', 'Sorteio Mensal', 'Grupo de Confiança'].map(item => (
                          <li key={item} className="flex items-center gap-2">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span className="text-xs text-white">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Direita: CTA */}
                    <div className="px-5 py-4 flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => setShowXitiqueModal(true)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
                      >
                        Participar no Xitique
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ HISTÓRICO ═════════════════════════════════════════════════════ */}
          {section === 'historico' && (() => {
            const totalHist = historicoPag.reduce((s, e) => s + e.valor, 0);
            const filtrado  = historicoPag.filter(e => {
              const matchTipo   = histFiltro === 'todos' || e.tipo === histFiltro;
              const q           = histSearch.toLowerCase();
              const matchSearch = !q || e.sub.toLowerCase().includes(q) || e.label.toLowerCase().includes(q) || e.data.includes(q);
              return matchTipo && matchSearch;
            });

            const downloadRecibo = (ev: PagEvt, idx: number) => {
              const FORMA_LABEL_H: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência Bancária', cheque: 'Cheque', outros: 'Outros' };
              const body = `
                <div class="doc-title">Recibo de Pagamento</div>
                <div class="doc-sub">Recibo Nº ${idx + 1}</div>
                <div class="info-grid">
                  <div class="info-box">
                    <div class="info-label">Emitido por</div>
                    <div class="info-value">SOS Motors</div>
                    <div class="info-sub">geral@sosmotors.co.mz</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Titular</div>
                    <div class="info-value">${ev.clientName ?? authUser?.nome ?? '—'}</div>
                    ${ev.clientEmail ? `<div class="info-sub">${ev.clientEmail}</div>` : ''}
                    ${ev.clientPhone ? `<div class="info-sub">${ev.clientPhone}</div>` : ''}
                  </div>
                </div>
                <div class="section-title">Detalhes do Pagamento</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Item</span><span><b>${ev.sub}</b></span></div>
                  <div class="summary-row"><span>Viatura</span><span>${ev.label}${ev.matricula ? ` · ${ev.matricula}` : ''}</span></div>
                  ${ev.dataInicio ? `<div class="summary-row"><span>Período</span><span>${fmtData(ev.dataInicio)}${ev.dataFim ? ` → ${fmtData(ev.dataFim)}` : ''}</span></div>` : ''}
                  ${ev.diasAluguer ? `<div class="summary-row"><span>Duração / Taxa</span><span>${ev.diasAluguer} dia${ev.diasAluguer !== 1 ? 's' : ''} · ${fmt(ev.valorDiario ?? 0)}/dia</span></div>` : ''}
                  <div class="summary-row"><span>Data de Pagamento</span><span>${ev.data.length === 10 ? fmtData(ev.data) : (ev.data || '—')}</span></div>
                  <div class="summary-row"><span>Hora de Pagamento</span><span>${ev.horaPagamento ?? '—'}</span></div>
                  ${ev.formaPagamento ? `<div class="summary-row"><span>Método</span><span>${FORMA_LABEL_H[ev.formaPagamento] ?? ev.formaPagamento}</span></div>` : ''}
                  ${ev.referenciaPagamento ? `<div class="summary-row"><span>Referência</span><span>${ev.referenciaPagamento}</span></div>` : ''}
                  <div class="summary-row"><span>Tipo</span><span><span class="badge badge-${ev.tipo}">${TIPO_LABEL[ev.tipo]}</span></span></div>
                  <div class="summary-row total"><span>Valor Pago</span><span class="val-green">${fmt(ev.valor)} MT</span></div>
                </div>
              `;
              printAsPDF(body, `Recibo ${idx + 1}`);
            };

            const downloadExtrato = () => {
              const hoje  = fmtData(new Date().toISOString().split('T')[0]);
              const rows  = historicoPag.map(e => `
                <tr>
                  <td>${e.data.length === 10 ? fmtData(e.data) : (e.data || '—')}</td>
                  <td>${e.sub}<br><span style="color:#71717a;font-size:10px">${e.label}</span></td>
                  <td class="val-green">${fmt(e.valor)}</td>
                  <td><span class="badge badge-${e.tipo}">${TIPO_LABEL[e.tipo]}</span></td>
                </tr>
              `).join('');
              const body = `
                <div class="doc-title">Extrato de Conta</div>
                <div class="doc-sub">Gerado a ${hoje}</div>
                <div class="info-grid">
                  <div class="info-box">
                    <div class="info-label">Remetente</div>
                    <div class="info-value">SOS Motors</div>
                    <div class="info-sub">info@rentcar.co.mz</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Titular</div>
                    <div class="info-value">${authUser?.nome ?? '—'}</div>
                    <div class="info-sub">${authUser?.email ?? '—'}</div>
                  </div>
                </div>
                <div class="section-title">Histórico de Pagamentos</div>
                <table>
                  <thead><tr><th>Data</th><th>Item</th><th>Valor</th><th>Tipo</th></tr></thead>
                  <tbody>${rows}<tr class="total-row"><td colspan="2">Total</td><td class="val-green">${fmt(totalHist)}</td><td></td></tr></tbody>
                </table>
              `;
              printAsPDF(body, 'Extrato de Conta');
            };

            return (
              <div className="space-y-4">

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Total Pago</p>
                    <p className="text-lg font-black text-amber-400 tabular-nums">{fmt(totalHist)}</p>
                  </div>
                  <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Transações</p>
                    <p className="text-lg font-black text-white tabular-nums">{historicoPag.length}</p>
                  </div>
                  <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Contratos</p>
                    <p className="text-lg font-black text-white tabular-nums">{alugueres.length + compras.length}</p>
                  </div>
                </div>

                {/* Search + extrato */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      value={histSearch}
                      onChange={e => setHistSearch(e.target.value)}
                      placeholder="Pesquisar pagamento..."
                      className="w-full rounded-xl bg-zinc-900 border border-amber-500/20 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-500/60"
                    />
                  </div>
                  <button
                    onClick={downloadExtrato}
                    title="Baixar extrato completo"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 border border-amber-500/20 hover:border-amber-500/40 hover:text-amber-400 text-white text-sm font-bold transition-colors shrink-0"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Extrato
                  </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap">
                  {(['todos', 'aluguer', 'compra', 'xitique'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setHistFiltro(f)}
                      className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-wide border transition-colors ${
                        histFiltro === f
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-900 border-zinc-700 text-white hover:border-amber-500/30 hover:text-amber-400'
                      }`}
                    >
                      {f === 'todos' ? `Todos (${historicoPag.length})` : `${TIPO_LABEL[f]} (${historicoPag.filter(e => e.tipo === f).length})`}
                    </button>
                  ))}
                </div>

                {/* Tabela */}
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
                  {filtrado.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span className="text-xs text-white/40">
                        {histSearch ? 'Nenhum resultado para a pesquisa' : 'Sem pagamentos registados'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Cabeçalho */}
                      <div className="grid grid-cols-[110px_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-zinc-800 bg-zinc-800/40">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Data</span>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Item</span>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-right">Valor</span>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-center">Tipo</span>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest text-center">Recibo</span>
                      </div>

                      {/* Linhas */}
                      <div className="divide-y divide-zinc-800/50">
                        {filtrado.map((ev, i) => (
                          <div key={i} className={`grid grid-cols-[110px_1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors ${i % 2 !== 0 ? 'bg-zinc-800/50' : ''}`}>
                            <div className="shrink-0">
                              <p className="text-sm text-white whitespace-nowrap">
                                {ev.data.length === 10 ? fmtData(ev.data) : (ev.data || '—')}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{ev.sub}</p>
                              <p className="text-xs text-white truncate">{ev.label}</p>
                            </div>
                            <span className="text-sm font-black text-amber-400 tabular-nums text-right whitespace-nowrap shrink-0">
                              {fmt(ev.valor)}
                            </span>
                            <span className={`text-xs font-black border rounded-md px-2 py-0.5 whitespace-nowrap shrink-0 ${TIPO_CLS[ev.tipo]}`}>
                              {TIPO_LABEL[ev.tipo]}
                            </span>
                            <button
                              onClick={() => downloadRecibo(ev, i)}
                              title="Baixar recibo"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-amber-400/20 hover:text-amber-400 text-white border border-zinc-700 transition-colors shrink-0"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Footer total */}
                      <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 bg-zinc-800/30">
                        <span className="text-sm text-white font-bold">
                          {filtrado.length === historicoPag.length
                            ? `${historicoPag.length} transações`
                            : `${filtrado.length} de ${historicoPag.length} transações`}
                        </span>
                        <span className="text-sm font-black text-amber-400">
                          {fmt(filtrado.reduce((s, e) => s + e.valor, 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ══ NOTIFICAÇÕES ══════════════════════════════════════════════════ */}
          {section === 'notificacoes' && (
            <NotificacoesPanel />
          )}

        </div>
      </main>

      {/* ── Modal de inscrição no Xitique ── */}
      {showXitiqueModal && (
        <XitiqueModal onClose={() => setShowXitiqueModal(false)} />
      )}

      {/* ── Modal de pedido de extensão (overlay fixo) ── */}
      {extensaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <p className="text-base text-white font-black mb-1">Solicitar extensão de reserva</p>
              <p className="text-xs text-white/60">
                Viatura:{' '}
                <span className="text-white font-bold">{getVehicleName(extensaoModal.vehicleId)}</span>
                {' '}· Data fim actual:{' '}
                <span className="text-amber-400 font-bold">{extensaoModal.dataFim}</span>
              </p>
            </div>

            <div>
              <label className="text-xs text-white font-bold block mb-1">Nº de dias</label>
              <input
                type="number"
                min={1}
                max={30}
                value={extensaoDias}
                onChange={e => setExtensaoDias(e.target.value)}
                className="w-24 bg-zinc-800 border border-zinc-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors text-center font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-white font-bold block mb-1">
                Motivo do pedido <span className="text-amber-400">*</span>
              </label>
              <textarea
                value={extensaoNota}
                onChange={e => setExtensaoNota(e.target.value)}
                placeholder="Ex: viagem prolongada, trabalho extra…"
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmarExtensao}
                disabled={!extensaoDias || parseInt(extensaoDias, 10) < 1 || !extensaoNota.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-black transition-colors"
              >
                Enviar pedido
              </button>
              <button
                onClick={() => setExtensaoModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}