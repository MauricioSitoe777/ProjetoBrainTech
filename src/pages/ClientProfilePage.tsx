import { useState, type ReactNode } from 'react';
import {
  Mail, Phone, MapPin, Briefcase, Calendar,
  Home, KeyRound, ShoppingCart, CreditCard,
  Trophy, User, BarChart3, Bell,
  AlertTriangle, Clock, FileText, Smartphone,
  Menu, X,
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

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro',
  transferencia: 'Transferência', cheque: 'Cheque', outros: 'Outros',
};

// ── Geração de PDF (impressão de HTML estilizado) ───────────────────────────
const DOC_SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #18181b; }
  .doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #f59e0b; padding-bottom: 14px; margin-bottom: 22px; }
  .doc-logo img { height: 36px; width: auto; display: block; }
  .doc-meta { text-align: right; font-size: 11px; color: #18181b; }
  .doc-title { font-size: 18px; font-weight: 900; color: #18181b; margin-bottom: 2px; }
  .doc-sub { font-size: 12px; color: #92400e; font-weight: 700; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.3px; color: #b45309; margin: 20px 0 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 6px; }
  .info-box { border: 1px solid #f3d9a8; border-radius: 8px; padding: 10px 12px; }
  .info-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 3px; letter-spacing: 0.5px; }
  .info-value { font-size: 13px; font-weight: 700; color: #18181b; }
  .info-sub { font-size: 11px; color: #18181b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #fdf3e0; }
  th { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; padding: 8px 10px; text-align: left; border-bottom: 2px solid #f3d9a8; }
  td { font-size: 12px; padding: 9px 10px; border-bottom: 1px solid #f3d9a8; color: #18181b; vertical-align: top; }
  .val-green { font-weight: 800; color: #059669; }
  .val-red   { font-weight: 800; color: #dc2626; }
  .val-amber { font-weight: 800; color: #b45309; }
  .badge { display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 9px; border-radius: 10px; white-space: nowrap; }
  .badge-aluguer { background: #fef3c7; color: #92400e; }
  .badge-compra  { background: #d1fae5; color: #065f46; }
  .badge-xitique { background: #fef3c7; color: #78350f; }
  .badge-divida  { background: #fee2e2; color: #991b1b; }
  .summary-box { border: 1px solid #f3d9a8; border-radius: 8px; overflow: hidden; margin-bottom: 6px; }
  .summary-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f3d9a8; font-size: 12px; }
  .summary-row:last-child { border-bottom: none; }
  .summary-row.total { font-weight: 800; background: #fdf3e0; }
  .total-row td { font-weight: 900; background: #fdf3e0; border-top: 2px solid #f3d9a8; }
  .doc-footer { margin-top: 32px; text-align: center; font-size: 10px; color: #18181b; border-top: 1px solid #f3d9a8; padding-top: 14px; }
  .clause-title { font-size: 12px; font-weight: 900; color: #b45309; margin: 14px 0 4px; }
  .clause-text { font-size: 11px; color: #18181b; line-height: 1.6; text-align: justify; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; text-align: center; }
  .sign-line { border-top: 1px solid #18181b; margin-bottom: 6px; padding-top: 6px; }
  .sign-name { font-size: 11px; font-weight: 700; color: #18181b; }
  .sign-role { font-size: 10px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
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
const TIPO_LABEL: Record<PagEvt['tipo'], string> = {
  aluguer: 'Aluguer', compra: 'Compra', xitique: 'Xitique', divida: 'Dívida',
};

export function ClientProfilePage({ onExit: _onExit }: { onExit?: () => void }) {
  const { user: authUser, allUsers } = useAuth();
  const { reservations, cancelReservation, updateReservation, rules } = useReservations();
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

  const [section,     setSection]     = useState<Section>('resumo');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [faturaSearch, setFaturaSearch] = useState('');
  const [faturaStatusFiltro, setFaturaStatusFiltro] = useState<'todos' | 'pago' | 'vencendo' | 'pendente' | 'atrasado' | 'cancelado'>('todos');
  const [faturasExpandido, setFaturasExpandido] = useState(false);
  const [transacoesExpandido, setTransacoesExpandido] = useState(false);
  const [showDividaDetail, setShowDividaDetail] = useState(false);

  const handleDownloadReserva = (r: Reservation) => {
    const veh = getVehicleName(r.vehicleId);
    const st  = RES_STATUS[r.status]?.label ?? r.status;

    // Soma tudo o que foi pago (prestações ou depósito confirmado)
    const depConfirmado = ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente', 'concluida'].includes(r.status);
    const totalPago = (r.prestacoes && r.prestacoes.length > 0)
      ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
      : (depConfirmado ? (r.deposito ?? 0) : 0);

    const multa        = r.multaAtraso ?? 0;
    const valorBase    = r.valorTotal > 0 ? r.valorTotal : totalPago;
    const totalComMulta = valorBase + multa;
    const restante     = Math.max(0, totalComMulta - totalPago);
    const horasMulta   = multa > 0 && rules.penalizacaoAtrasoPorHora > 0
      ? Math.round(multa / rules.penalizacaoAtrasoPorHora) : 0;
    const diasMulta    = Math.floor(horasMulta / 24);
    const horasRest    = horasMulta % 24;

    const linhasPrestacoes = (r.prestacoes && r.prestacoes.length > 0)
      ? `<tr style="background:#fafafa">
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#92400e;padding:8px 10px;border-bottom:2px solid #f3d9a8;">Nº</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#92400e;padding:8px 10px;border-bottom:2px solid #f3d9a8;">Vencimento</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#92400e;padding:8px 10px;border-bottom:2px solid #f3d9a8;">Valor</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#92400e;padding:8px 10px;border-bottom:2px solid #f3d9a8;">Forma</td>
           <td style="font-size:9px;font-weight:800;text-transform:uppercase;color:#92400e;padding:8px 10px;border-bottom:2px solid #f3d9a8;">Estado</td>
         </tr>
         ${r.prestacoes.map(p => `
           <tr>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;">${p.numero}ª</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;">${p.dataPagamento ?? p.dataVencimento}</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;font-weight:800;color:${p.paga ? '#059669' : '#18181b'};">${fmt(p.valorPago ?? p.valor)}</td>
             <td style="padding:8px 10px;border-bottom:1px solid #f4f4f5;font-size:12px;color:#44403c;">${p.paga && (p as any).formaPagamento ? (FORMA_PAGAMENTO_LABEL[(p as any).formaPagamento] ?? (p as any).formaPagamento) : '—'}</td>
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
        ${valorBase > 0 ? `<div class="summary-row"><span>Valor do Aluguer (${diffDias(r.dataInicio, r.dataFim)} dia${diffDias(r.dataInicio, r.dataFim) !== 1 ? 's' : ''})</span><span style="font-weight:800;">${fmt(valorBase)}</span></div>` : ''}
        ${multa > 0 ? `
          <div class="summary-row" style="align-items:flex-start;">
            <div>
              <span style="font-weight:700;color:#dc2626;">Multa por Atraso</span>
              <small style="font-size:10px;color:#52525b;font-weight:400;display:block;margin-top:3px;">Devolução prevista: ${fmtData(r.dataFim)} · ${diasMulta > 0 ? diasMulta + 'd ' : ''}${horasRest}h × ${fmt(rules.penalizacaoAtrasoPorHora)}/hora</small>
            </div>
            <span style="font-weight:800;color:#dc2626;white-space:nowrap;padding-left:12px;">${fmt(multa)}</span>
          </div>
          <div class="summary-row" style="font-weight:900;background:#fffbeb;border-top:1px solid #fde68a;">
            <span>Total com Multa</span><span style="white-space:nowrap;">${fmt(totalComMulta)}</span>
          </div>` : ''}
        ${totalPago > 0 ? `<div class="summary-row"><span>Total Pago</span><span class="val-green">${fmt(totalPago)}</span></div>` : ''}
        ${(valorBase > 0 || multa > 0)
          ? `<div class="summary-row total"><span>Restante a Pagar</span><span class="${restante > 0 ? 'val-red' : 'val-green'}">${fmt(restante)}</span></div>`
          : `<div class="summary-row"><span>Valor</span><span style="color:#92400e;font-style:italic;">A confirmar com o administrador</span></div>`}
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
  alugueres.filter(a => a.status === 'concluida' && (a.reembolsoValor ?? 0) > 0).forEach(a => {
    historicoPag.push({
      label: getVehicleName(a.vehicleId), sub: `Reembolso (${a.reembolsoDescricao ?? 'caução'})`, valor: -(a.reembolsoValor ?? 0),
      data: a.dataReembolso ?? a.dataFim, tipo: 'aluguer',
      clientName: a.clientName, clientEmail: a.clientEmail, clientPhone: a.clientPhone,
      matricula: getVehicle(a.vehicleId)?.matricula,
      dataInicio: a.dataInicio, dataFim: a.dataFim,
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
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = authUser?.nome.split(' ')[0] ?? '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex font-medium">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══ ASIDE SIDEBAR ════════════════════════════════════════════════════ */}
      <aside style={{borderRight:'3px solid #3f3f46'}} className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-zinc-900 transition-transform duration-300 overflow-hidden md:relative md:z-auto md:w-56 md:shrink-0 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Cabeçalho do drawer (só mobile) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 md:hidden">
          <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition">
            <X size={14} />
          </button>
        </div>

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
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800/60 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger — só mobile */}
            <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-700 text-white hover:bg-zinc-800 transition" onClick={() => setSidebarOpen(true)}>
              <Menu size={16} />
            </button>
            <div className="text-amber-500">
              {section === 'resumo'            && <Home size={15} />}
              {section === 'dados_pessoais'    && <User size={15} />}
              {section === 'dados_estatisticos'&& <BarChart3 size={15} />}
              {section === 'reservas'          && <KeyRound size={15} />}
              {section === 'compras'           && <ShoppingCart size={15} />}
              {section === 'pagamentos'        && <CreditCard size={15} />}
              {section === 'xitique'           && <Trophy size={15} />}
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
              {section === 'notificacoes'      && 'Notificações'}
            </h1>
          </div>
          <div />
        </div>

        <div className="p-4 md:p-6 space-y-4 w-full">

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
            const verTudoDest: Section = temAluguerActivo ? 'reservas' : temCompraActiva ? 'compras' : 'pagamentos';

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              const depositoConfirmado = ['confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente', 'concluida'].includes(r.status);
              const pagoViaPrest = r.prestacoes && r.prestacoes.length > 0
                ? r.prestacoes.filter(p => p.paga).reduce((s, p) => s + (p.valorPago ?? p.valor), 0)
                : null;
              const valorPago = pagoViaPrest !== null ? pagoViaPrest : (depositoConfirmado ? (r.deposito ?? 0) : 0);
              const multaR = r.multaAtraso ?? 0;
              const totalComMultaR = r.valorTotal + multaR;
              const valorRestante = Math.max(0, totalComMultaR - valorPago);
              const pct = totalComMultaR > 0
                ? Math.min(100, Math.round((valorPago / totalComMultaR) * 100))
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
                          <ReservationTracker
                            status={r.status}
                            readonly
                            clientView
                            stepDates={{
                              pendente:            r.createdAt,
                              pronta_levantamento: r.dataInicio,
                              ativa:               r.dataInicio,
                              devolucao_pendente:  r.dataFim,
                              concluida:           r.dataFim,
                            }}
                          />
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

                        {/* ── 3. Grid: [Levantamento + Devolução] | Financeiro ── */}
                        <div className="grid grid-cols-2 divide-x divide-zinc-800 border-b border-zinc-800">

                          {/* PERÍODO — Levantamento e Devolução lado a lado */}
                          <div className="grid grid-cols-2 divide-x divide-zinc-800">
                            {/* Levantamento */}
                            <div className="px-5 py-5">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Levantamento</p>
                              <p className="text-2xl font-black text-white leading-none">{d(r.dataInicio)}</p>
                              {r.horaLevantamento && <p className="text-sm text-white/70 mt-1.5">{r.horaLevantamento}</p>}
                              <p className="text-xs text-white/50 mt-2 leading-snug">
                                {r.localLevantamento || 'Não definido'}
                              </p>
                            </div>

                            {/* Devolução */}
                            <div className="px-5 py-5">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Devolução</p>
                              <p className="text-2xl font-black text-amber-400 leading-none">{d(r.dataFim)}</p>
                              {r.horaDevolucao && <p className="text-sm text-amber-400/70 mt-1.5">{r.horaDevolucao}</p>}
                              <p className="text-xs text-amber-400/50 mt-2 leading-snug">
                                {r.localDevolucao || 'Não definido'}
                              </p>
                            </div>
                          </div>

                          {/* FINANCEIRO */}
                          <div className="px-5 py-5 space-y-3">
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
                                <p className="text-[10px] text-white/60 mb-0.5">Valor do aluguer</p>
                                <p className="text-xl font-black text-white leading-none">{fmt(r.valorTotal)}</p>
                                {multaR > 0 && (
                                  <p className="text-[11px] font-bold text-red-400 mt-1">+ {fmt(multaR)} multa</p>
                                )}
                                {multaR > 0 && (
                                  <p className="text-xs font-black text-white mt-0.5">= {fmt(totalComMultaR)} total</p>
                                )}
                                {valorRestante > 0 && r.status !== 'concluida' && (
                                  <p className="text-sm font-bold text-red-400 mt-1.5">−{fmt(valorRestante)} restante</p>
                                )}
                                {valorRestante === 0 && (
                                  <p className="text-xs font-bold text-emerald-400 mt-1">Liquidado ✓</p>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* ── Plano de Prestações ── */}
                        {r.prestacoes && r.prestacoes.length > 0 && (() => {
                          const FORMA_LABEL_P: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência Bancária', cheque: 'Cheque', outros: 'Outros' };
                          const veh = getVehicleName(r.vehicleId);
                          const downloadReciboPrestacao = (p: Prestacao) => {
                            const isMulta = p.numero > 1 && r.prestacoes!.length > 1 && p === r.prestacoes![r.prestacoes!.length - 1] && (r.multaAtraso ?? 0) > 0;
                            const itemLabel = isMulta ? 'Multa por Atraso na Devolução' : `Pagamento do Aluguer`;
                            const reciboNum = `${r.id}-P${p.numero}`;
                            const body = `
                              <div class="doc-title">Recibo de Pagamento</div>
                              <div class="doc-sub">Recibo Nº ${reciboNum}</div>

                              <div class="info-grid">
                                <div class="info-box">
                                  <div class="info-label">Emitido por</div>
                                  <div class="info-value">SOS Motors</div>
                                  <div class="info-sub">geral@sosmotors.co.mz</div>
                                </div>
                                <div class="info-box">
                                  <div class="info-label">Cliente</div>
                                  <div class="info-value">${r.clientName ?? fullUser?.nome ?? '—'}</div>
                                  ${r.clientEmail ? `<div class="info-sub">${r.clientEmail}</div>` : ''}
                                  ${r.clientPhone ? `<div class="info-sub">${r.clientPhone}</div>` : ''}
                                </div>
                              </div>

                              <div class="section-title">Detalhes do Pagamento</div>
                              <div class="summary-box">
                                <div class="summary-row"><span>Descrição</span><span><b>${itemLabel}</b></span></div>
                                <div class="summary-row"><span>Viatura</span><span>${veh}</span></div>
                                <div class="summary-row"><span>Período do Aluguer</span><span>${fmtData(r.dataInicio)} → ${fmtData(r.dataFim)}</span></div>
                                <div class="summary-row"><span>Prestação</span><span>${p.numero}ª de ${r.prestacoes!.length}</span></div>
                                <div class="summary-row"><span>Data de Pagamento</span><span>${p.dataPagamento ? fmtData(p.dataPagamento) : '—'}</span></div>
                                ${p.horaPagamento ? `<div class="summary-row"><span>Hora</span><span>${p.horaPagamento}</span></div>` : ''}
                                ${p.formaPagamento ? `<div class="summary-row"><span>Método</span><span>${FORMA_LABEL_P[p.formaPagamento] ?? p.formaPagamento}</span></div>` : ''}
                                ${p.referenciaPagamento ? `<div class="summary-row"><span>Referência</span><span>${p.referenciaPagamento}</span></div>` : ''}
                                ${p.notasPagamento ? `<div class="summary-row"><span>Notas</span><span>${p.notasPagamento}</span></div>` : ''}
                                <div class="summary-row total"><span>Valor Pago</span><span class="val-green">${fmt(p.valorPago ?? p.valor)}</span></div>
                              </div>
                            `;
                            printAsPDF(body, `Recibo ${reciboNum}`);
                          };

                          return (
                          <div className="px-5 py-4 space-y-2">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Plano de Pagamentos</p>
                            <div className="space-y-1.5">
                              {r.prestacoes!.map(p => {
                                const vencida = !p.paga && p.dataVencimento < new Date().toISOString().split('T')[0];
                                return (
                                  <div key={p.numero} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                                    p.paga ? 'bg-emerald-500/5 border-emerald-500/20' : vencida ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-800/40 border-zinc-700/40'
                                  }`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${p.paga ? 'bg-emerald-500 border-emerald-400' : vencida ? 'border-red-500' : 'border-zinc-600'}`}>
                                      {p.paga && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                      {!p.paga && vencida && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-white">{p.numero}ª prestação</p>
                                      <p className={`text-[10px] ${p.paga ? 'text-emerald-400' : vencida ? 'text-red-400' : 'text-white/60'}`}>
                                        {p.paga ? `Pago em ${p.dataPagamento ?? '—'}` : `Vence ${p.dataVencimento}`}
                                        {vencida && ' · VENCIDA'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-sm font-black ${p.paga ? 'text-emerald-400' : vencida ? 'text-red-400' : 'text-white'}`}>
                                        {fmt(p.valorPago ?? p.valor)}
                                      </p>
                                      {p.paga && p.formaPagamento && (
                                        <p className="text-[10px] text-white/50">
                                          {FORMA_LABEL_P[p.formaPagamento] ?? p.formaPagamento}
                                        </p>
                                      )}
                                    </div>
                                    {p.paga && (
                                      <button
                                        onClick={() => downloadReciboPrestacao(p)}
                                        title="Baixar recibo"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-white/60 border border-zinc-700 transition-colors shrink-0"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {multaR > 0 && (
                              <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2.5 mt-2">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12.01" y1="16" x2="12" y2="16"/></svg>
                                <div className="flex-1">
                                  <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Multa por Atraso na Devolução</p>
                                  <p className="text-[10px] text-red-300/60">
                                    {Math.floor((multaR / (rules.penalizacaoAtrasoPorHora || 1)) / 24)}d {Math.round((multaR / (rules.penalizacaoAtrasoPorHora || 1)) % 24)}h · {fmt(rules.penalizacaoAtrasoPorHora)}/hora
                                  </p>
                                </div>
                                <p className="text-sm font-black text-red-400">{fmt(multaR)}</p>
                              </div>
                            )}
                          </div>
                          );
                        })()}

                        {/* ── O que precisa de fazer ── */}
                        {(() => {
                          const checklist: Partial<Record<ReservationStatus, string[]>> = {
                            pendente: [
                              'Aguarde a confirmação da sua reserva',
                              'Verifique o email para actualizações de estado',
                              'Prepare o seu documento de identificação',
                            ],
                            confirmada: [
                              'Prepare o seu documento de identificação',
                              'Prepare a sua carta de condução',
                              'Aguarde a nossa notificação de levantamento',
                            ],
                            pronta_levantamento: [
                              'Leve o seu documento de identificação',
                              'Leve a sua carta de condução',
                              'Dirija-se à receção no horário agendado',
                            ],
                            ativa: [
                              'Respeite as regras de trânsito e limites de velocidade',
                              'Devolva a viatura na data e hora acordadas',
                              'Em caso de avaria ou acidente, contacte-nos imediatamente',
                            ],
                            devolucao_pendente: [
                              'Viatura devolvida e vistoria de regresso já realizada',
                              'Estamos a finalizar a liquidação do aluguer',
                              'Consulte "Pagamentos" caso ainda exista saldo pendente',
                            ],
                            concluida: [
                              'O seu aluguer foi concluído com sucesso',
                              'Pode baixar o comprovativo para os seus registos',
                              'Obrigado por escolher a SOS Motors!',
                            ],
                          };
                          const items = checklist[r.status];
                          if (!items) return null;
                          return (
                            <div className="px-5 py-5">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">O que precisa de fazer</p>
                              <div className="space-y-3">
                                {items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <div className="w-[22px] h-[22px] rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center shrink-0">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </div>
                                    <p className="text-sm text-white leading-snug">{item}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── Estado da viatura na devolução ── */}
                        {r.estadoViaturaDevolucao && (
                          <div className="px-5 py-5 border-t border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Estado da Viatura na Devolução</p>
                              {r.dataRegistoDevolucao && (
                                <span className="text-[10px] text-white/40 tabular-nums">· {r.dataRegistoDevolucao}</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-white leading-snug bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">{r.estadoViaturaDevolucao}</p>
                          </div>
                        )}

                        {/* ── Ações disponíveis ── */}
                        <div className="px-5 py-5">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Ações disponíveis</p>
                          <div className="flex flex-wrap gap-2">
                            {r.localLevantamento && (
                              <button
                                onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(r.localLevantamento!)}`, '_blank')}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 text-zinc-950 font-black text-sm transition-all hover:bg-amber-300 active:scale-[0.98] shadow-sm shadow-amber-400/20"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                Ver localização
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadReserva(r)}
                              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-sm transition-all active:scale-[0.98]"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Baixar comprovativo
                            </button>
                            {isAtivo && !r.pedidoExtensao && (
                              <button
                                onClick={() => handleExtensao(r)}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-amber-500/30 text-amber-400 font-bold text-sm transition-all active:scale-[0.98]"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>
                                Solicitar Extensão
                              </button>
                            )}
                            {podeCancelar && (
                              <button
                                onClick={() => setCancelConfirm(r.id)}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm transition-all active:scale-[0.98]"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Cancelar reserva
                              </button>
                            )}
                          </div>
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
              const isParcelado = (c.totalPrestacoes ?? 0) > 0;
              const formaPagLabel = c.formaPagamento
                ? (FORMA_PAGAMENTO_LABEL[c.formaPagamento] ?? c.formaPagamento)
                : (isParcelado ? 'Prestações' : 'Não informado');
              const compradorNome = fullUser?.nome ?? c.clientName;

              const body = `
                <div class="doc-title">Contrato de Compra e Venda de Veículo</div>
                <div class="doc-sub">Ref. Operação ${c.id.slice(0, 8).toUpperCase()}</div>

                <div class="section-title">Vendedor</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Nome / Razão Social</span><span><b>SOS Motors Lda.</b></span></div>
                  <div class="summary-row"><span>NUIT</span><span>400XXXXXXX</span></div>
                  <div class="summary-row"><span>Endereço</span><span>Av. Julius Nyerere, Maputo</span></div>
                  <div class="summary-row"><span>Telefone</span><span>+258 84 000 0000</span></div>
                </div>

                <div class="section-title">Comprador</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Nome</span><span><b>${compradorNome}</b></span></div>
                  <div class="summary-row"><span>BI</span><span>${fullUser?.bi ?? 'Não informado'}</span></div>
                  <div class="summary-row"><span>NUIT</span><span>${fullUser?.nuit ?? 'Não informado'}</span></div>
                  <div class="summary-row"><span>Telefone</span><span>${c.clientPhone ?? fullUser?.telefone ?? 'Não informado'}</span></div>
                  <div class="summary-row"><span>Endereço</span><span>${fullUser?.endereco ?? 'Não informado'}</span></div>
                </div>

                <div class="section-title">Dados do Veículo</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Viatura</span><span><b>${veh?.name ?? `#${c.vehicleId}`}</b></span></div>
                  <div class="summary-row"><span>Marca</span><span>${veh?.brand ?? '—'}</span></div>
                  <div class="summary-row"><span>Categoria</span><span>${CAT_LABEL[veh?.cat ?? ''] ?? '—'}</span></div>
                  <div class="summary-row"><span>Combustível</span><span>${veh?.fuel ?? '—'}</span></div>
                  <div class="summary-row"><span>Ano</span><span>${veh?.year ?? '—'}</span></div>
                  <div class="summary-row"><span>Matrícula</span><span>${veh?.matricula ?? '—'}</span></div>
                </div>

                <div class="section-title">Informações da Venda</div>
                <div class="summary-box">
                  <div class="summary-row"><span>Valor a Pagar</span><span class="val-amber">${veh?.price ?? fmt(c.valorTotal)}</span></div>
                  <div class="summary-row"><span>Forma de Pagamento</span><span>${formaPagLabel}</span></div>
                  <div class="summary-row"><span>Data da Venda</span><span>${fmtData(c.dataInicio)}</span></div>
                  ${isParcelado ? `<div class="summary-row"><span>Plano de Prestações</span><span>${c.prestacoesPagas ?? 0} de ${c.totalPrestacoes} pagas</span></div>` : ''}
                  <div class="summary-row total"><span>Estado</span><span><b>${st}</b></span></div>
                </div>

                <div class="clause-title">Cláusulas de Garantia</div>
                <p class="clause-text">O veículo é entregue com garantia de 2 (dois) anos a partir da data de compra, ${gar.ativa ? `válida até ${fmtData(gar.expira)}` : `expirada em ${fmtData(gar.expira)}`}, cobrindo defeitos de fabrico e de montagem dos componentes internos do motor e da caixa de velocidades. Excluem-se desta garantia as peças de desgaste natural, tais como pneus, pastilhas e discos de travão, baterias, filtros e fluídos.</p>

                <div class="clause-title">Cláusulas do Contrato</div>
                <p class="clause-text">
                  1. A propriedade do veículo transfere-se para o Comprador ${isParcelado ? 'apenas após a liquidação integral do valor acordado' : 'no acto do pagamento integral do valor acordado'}.<br>
                  2. O Comprador declara ter inspeccionado o veículo e aceita o seu estado actual, ressalvados os termos de garantia acima descritos.<br>
                  3. É da responsabilidade do Comprador tratar da transferência de registo e demais formalidades legais junto das entidades competentes.<br>
                  4. Qualquer litígio resultante deste contrato será resolvido nos termos da legislação da República de Moçambique.
                </p>

                <div class="sign-grid">
                  <div>
                    <div class="sign-line"></div>
                    <div class="sign-name">SOS Motors Lda.</div>
                    <div class="sign-role">Vendedor</div>
                  </div>
                  <div>
                    <div class="sign-line"></div>
                    <div class="sign-name">${compradorNome}</div>
                    <div class="sign-role">Comprador</div>
                  </div>
                </div>
              `;
              printAsPDF(body, `Contrato de Compra ${c.id}`);
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
                        const COMPRA_FLOW = [
                          { key: 'pendente',        label: 'Compra\npedida' },
                          { key: 'compra_aprovada', label: 'Compra\naprovada' },
                          { key: 'entrada_paga',    label: 'Entrada\npaga' },
                          { key: 'em_prestacao',    label: 'Em\nprestação' },
                          { key: 'liquidada',       label: 'Finalizado' },
                        ] as const;
                        const compraStatusOrder: string[] = ['pendente','compra_aprovada','entrada_paga','em_prestacao','liquidada'];
                        const currentIdx = c.status === 'prestacao_atraso'
                          ? compraStatusOrder.indexOf('em_prestacao')
                          : Math.max(0, compraStatusOrder.indexOf(c.status));
                        const isCancelled = c.status === 'cancelada';
                        const valorMensal = isParcelada ? (prestacoes.find(p => !p.paga)?.valor ?? prestacoes[0]?.valor ?? c.deposito) : null;

                        return (
                          <div className="border-t border-zinc-800">

                            {/* ── Tracker de 5 passos ── */}
                            {!isCancelled && (
                              <div className="px-5 pt-5 pb-4">
                                <div className="flex items-start">
                                  {COMPRA_FLOW.map((step, idx) => {
                                    const isDone    = idx < currentIdx;
                                    const isCurrent = idx === currentIdx;
                                    const isLast    = idx === COMPRA_FLOW.length - 1;
                                    return (
                                      <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                        {/* Connector line left */}
                                        {idx > 0 && (
                                          <div className={`absolute top-[13px] right-1/2 w-full h-[2px] ${isDone || isCurrent ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                                        )}
                                        {/* Circle */}
                                        <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                          isDone    ? 'bg-amber-400 border-amber-400 text-zinc-950' :
                                          isCurrent ? 'bg-zinc-950 border-amber-400 text-amber-400' :
                                                      'bg-zinc-900 border-zinc-700 text-white'
                                        }`}>
                                          {isDone
                                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            : idx + 1}
                                        </div>
                                        {/* Label */}
                                        <p className={`mt-2 text-center text-xs font-bold leading-tight whitespace-pre-line ${
                                          isCurrent ? 'text-amber-400' : 'text-white'
                                        }`}>{step.label}</p>
                                        {/* Connector line right */}
                                        {!isLast && (
                                          <div className={`absolute top-[13px] left-1/2 w-full h-[2px] ${isDone ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {c.status === 'prestacao_atraso' && (
                                  <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12.01" y1="16" x2="12" y2="16"/></svg>
                                    <p className="text-[11px] font-bold text-red-400">Prestação em atraso — regularize o pagamento o mais brevemente possível.</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Motivo cancelamento */}
                            {isCancelled && c.motivoCancelamento && (
                              <div className="mx-5 mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <div>
                                  <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-0.5">Motivo do Cancelamento</p>
                                  <p className="text-sm text-white leading-snug">{c.motivoCancelamento}</p>
                                </div>
                              </div>
                            )}

                            {/* ── Card GARANTIA ── */}
                            <div className="mx-5 mt-4 mb-5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                                <div>
                                  <p className="text-[10px] text-white uppercase tracking-wider mb-1">Carro</p>
                                  <p className="text-sm font-black text-white leading-snug">{veh?.name ?? getVehicleName(c.vehicleId)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-white uppercase tracking-wider mb-1">Valor</p>
                                  <p className="text-sm font-black text-amber-400 leading-snug">{veh?.price ?? fmt(c.valorTotal)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-white uppercase tracking-wider mb-1">Tempo restante</p>
                                  <p className={`text-sm font-black leading-snug ${gar.ativa ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {gar.ativa ? `${gar.mesesRestantes} meses` : 'Expirada'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-white uppercase tracking-wider mb-1">Válido até</p>
                                  <p className="text-sm font-black text-white leading-snug">{fmtData(gar.expira)}</p>
                                </div>
                              </div>
                              {valorMensal !== null && (
                                <div className="mt-4 pt-4 border-t border-amber-500/20">
                                  <p className="text-[10px] text-white uppercase tracking-wider mb-1">Valor mensal</p>
                                  <p className="text-lg font-black text-amber-400">{fmt(valorMensal)}</p>
                                </div>
                              )}
                            </div>

                            {/* ── Ações disponíveis ── */}
                            <div className="px-5 pb-5 space-y-2 border-t border-zinc-800 pt-5">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Ações disponíveis</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => downloadComprovativo(c, veh)}
                                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-bold transition-all active:scale-[0.98]"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  Baixar contrato de compra
                                </button>
                                {(c.status === 'pendente' || c.status === 'compra_aprovada') && cancelConfirm !== c.id && (
                                  <button
                                    onClick={() => { setCancelConfirm(c.id); setCancelMotivo(''); }}
                                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold transition-all active:scale-[0.98]"
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                    Cancelar Compra
                                  </button>
                                )}
                              </div>
                              {cancelConfirm === c.id && (
                                <div
                                  className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
                                  onClick={() => { setCancelConfirm(null); setCancelMotivo(''); }}
                                >
                                  <div
                                    className="bg-zinc-900 border border-amber-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
                                      <h2 className="text-zinc-950 font-black text-base">Cancelar Compra</h2>
                                      <button
                                        onClick={() => { setCancelConfirm(null); setCancelMotivo(''); }}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-950 hover:bg-black/10 transition-colors"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                    <div className="p-5 space-y-4">
                                      <p className="text-sm text-white leading-snug">
                                        Deseja cancelar o pedido de compra de <span className="font-black text-white">{veh?.name ?? getVehicleName(c.vehicleId)}</span>? Esta acção não pode ser desfeita.
                                      </p>
                                      <div>
                                        <label className="text-xs text-white font-bold block mb-1">Motivo do Cancelamento <span className="text-amber-400">*</span></label>
                                        <textarea
                                          value={cancelMotivo}
                                          onChange={e => setCancelMotivo(e.target.value)}
                                          placeholder="Descreva o motivo (ex: mudança de decisão, dificuldade financeira…)"
                                          rows={3}
                                          className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 resize-none outline-none transition-colors"
                                        />
                                      </div>
                                      <div className="flex gap-3 pt-1">
                                        <button
                                          onClick={() => { setCancelConfirm(null); setCancelMotivo(''); }}
                                          className="flex-1 py-2.5 rounded-xl text-sm font-black text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleCancelCompra(c.id)}
                                          disabled={!cancelMotivo.trim()}
                                          className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                          Confirmar
                                        </button>
                                      </div>
                                    </div>
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
              .reduce((s, a) => s + a.valorTotal - (a.reembolsoValor ?? 0), 0);

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

            const historico = historicoPag;
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
                  <div class="summary-row total"><span>Total em Dívida</span><span class="${totalDivida > 0 ? 'val-red' : 'val-green'}">${totalDivida > 0 ? fmt(totalDivida) : 'Nenhuma'}</span></div>
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
                        <td>${ev.sub}<br><span style="font-size:10px;color:#92400e;">${ev.label}</span></td>
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

            // ── Transacções recentes (pesquisa + recibo individual) ─────────
            const transacoesFiltradas = historico.filter(e => {
              const q = histSearch.toLowerCase();
              return !q || e.sub.toLowerCase().includes(q) || e.label.toLowerCase().includes(q) || e.data.includes(q);
            });

            const downloadRecibo = (ev: PagEvt, idx: number) => {
              const isReembolso = ev.valor < 0;
              const FORMA_LABEL_R: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', dinheiro: 'Dinheiro', transferencia: 'Transferência Bancária', cheque: 'Cheque', outros: 'Outros' };
              const body = `
                <div class="doc-title">${isReembolso ? 'Comprovativo de Reembolso' : 'Recibo de Pagamento'}</div>
                <div class="doc-sub">${isReembolso ? 'Reembolso' : 'Recibo'} Nº ${idx + 1}</div>
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
                  <div class="summary-row total"><span>${isReembolso ? 'Valor Reembolsado' : 'Valor Pago'}</span><span class="val-green">${fmt(Math.abs(ev.valor))} MT</span></div>
                </div>
              `;
              printAsPDF(body, `${isReembolso ? 'Reembolso' : 'Recibo'} ${idx + 1}`);
            };

            return (
              <div className="space-y-4">

                {/* ── Cabeçalho ─────────────────────────────────────────────── */}
                <div>
                  <h2 className="text-xl font-black text-white">Pagamentos</h2>
                  <p className="text-xs text-white/60 mt-0.5">Organize as suas faturas, pagamentos e documentos.</p>
                </div>

                {/* ── KPI strip compacto ──────────────────────────────────────── */}
                {(() => {
                  const contratosAtivos =
                    alugueres.filter(a => ACTIVE_STATUSES.includes(a.status)).length +
                    compras.filter(c => c.status !== 'cancelada' && c.status !== 'liquidada').length;
                  const kpis = [
                    {
                      label: 'Total em Dívida',
                      value: totalDivida > 0 ? fmt(totalDivida) : 'Nenhuma',
                      sub:   totalDivida > 0
                               ? (compras.some(c => c.status === 'prestacao_atraso') ? 'Em atraso' : 'Em aberto')
                               : 'Conta regularizada',
                      valueColor: totalDivida > 0 ? 'text-red-400' : 'text-amber-400',
                    },
                    {
                      label: 'Contratos Activos',
                      value: String(contratosAtivos),
                      sub:   contratosAtivos > 0
                               ? `${alugueres.filter(a => ACTIVE_STATUSES.includes(a.status)).length} aluguer · ${compras.filter(c => c.status !== 'cancelada' && c.status !== 'liquidada').length} compra`
                               : 'Nenhum em curso',
                      valueColor: contratosAtivos > 0 ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Próxima Prestação',
                      value: proximaPrestacao ? fmt(proximaPrestacao.valor) : '—',
                      sub:   proximaPrestacao ? `Vence ${fmtData(proximaPrestacao.data)}` : 'Sem pendentes',
                      valueColor: proximaPrestacao ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Total Pago',
                      value: totalPago > 0 ? fmt(totalPago) : '—',
                      sub:   totalPago > 0
                               ? [totalPagoAlugueres > 0 && 'Alu.', totalPagoCompras > 0 && 'Compra', totalPagoXitique > 0 && 'Xit.'].filter(Boolean).join(' · ')
                               : 'Sem pagamentos',
                      valueColor: totalPago > 0 ? 'text-amber-400' : 'text-white',
                    },
                    {
                      label: 'Prestações Pagas',
                      value: totalPrestacoesTotais > 0 ? `${totalPrestacoesPagas}/${totalPrestacoesTotais}` : '—',
                      sub:   viaturasLiquidadas > 0 ? `${viaturasLiquidadas} liquidada${viaturasLiquidadas > 1 ? 's' : ''}` : 'Em curso',
                      valueColor: totalPrestacoesPagas > 0 ? 'text-amber-400' : 'text-white',
                    },
                  ];
                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                    pago:      { label: 'Pago',        cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
                    vencendo:  { label: 'A vencer',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400' },
                    pendente:  { label: 'Por pagar',   cls: 'bg-zinc-700/60 text-white border-zinc-600',                dot: 'bg-white' },
                    atrasado:  { label: 'Em atraso',   cls: 'bg-red-500/15 text-red-400 border-red-500/30',             dot: 'bg-red-400' },
                    cancelado: { label: 'Cancelado',   cls: 'bg-zinc-800 text-white border-zinc-700',                   dot: 'bg-zinc-500' },
                  };

                  const totalAtrasado = faturas.filter(f => f.statusKey === 'atrasado').reduce((s, f) => s + f.valor, 0);
                  const totalAVencer  = faturas.filter(f => f.statusKey === 'vencendo').reduce((s, f) => s + f.valor, 0);
                  const totalAReceber = faturas.filter(f => f.statusKey !== 'pago' && f.statusKey !== 'cancelado').reduce((s, f) => s + f.valor, 0);

                  const fatFiltradas = faturas.filter(f => {
                    const matchStatus = faturaStatusFiltro === 'todos' || f.statusKey === faturaStatusFiltro;
                    const q = faturaSearch.toLowerCase();
                    const matchQ = !q || f.id.toLowerCase().includes(q) || f.descricao.toLowerCase().includes(q) || f.dataVencimento.includes(q);
                    return matchStatus && matchQ;
                  });
                  const faturasVisiveis = faturasExpandido ? fatFiltradas : fatFiltradas.slice(0, 5);
                  const transacoesVisiveis = transacoesExpandido ? transacoesFiltradas : transacoesFiltradas.slice(0, 5);

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
                      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#92400e">Sem dívidas em aberto</td></tr>'}</tbody></table>
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
                      <table><thead><tr><th>Viatura</th><th>Início</th><th>Fim</th><th>Valor</th><th>Estado</th></tr></thead><tbody>${rowsA || '<tr><td colspan="5" style="text-align:center;color:#92400e">Sem alugueres</td></tr>'}</tbody></table>
                      <div class="section-title">Compras</div>
                      <table><thead><tr><th>Viatura</th><th>Data</th><th>—</th><th>Prestação</th><th>Estado</th></tr></thead><tbody>${rowsC || '<tr><td colspan="5" style="text-align:center;color:#92400e">Sem compras</td></tr>'}</tbody></table>
                    `;
                    printAsPDF(body, 'Comprovativo de Contratos');
                  };

                  return (
                    <div className="space-y-4">

                      {/* KPI cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          </div>
                          <p className="text-lg font-black text-white tabular-nums">{fmt(totalAReceber)}</p>
                          <p className="text-xs text-white/60 mt-0.5">Total a receber</p>
                        </div>
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
                          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <p className="text-lg font-black text-red-400 tabular-nums">{fmt(totalAtrasado)}</p>
                          <p className="text-xs text-white/60 mt-0.5">Em atraso</p>
                        </div>
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </div>
                          <p className="text-lg font-black text-amber-400 tabular-nums">{fmt(totalAVencer)}</p>
                          <p className="text-xs text-white/60 mt-0.5">A vencer</p>
                        </div>
                      </div>

                      {/* Faturas + Transações recentes + Documentos */}
                      <div className="flex flex-col gap-4">

                        {/* Faturas */}
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3.5 border-b border-zinc-800/70">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Faturas</span>
                          </div>
                          <div className="p-3 space-y-2 border-b border-zinc-800/70">
                            <div className="relative">
                              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                              <input
                                value={faturaSearch}
                                onChange={e => setFaturaSearch(e.target.value)}
                                placeholder="Pesquisar fatura ou veículo..."
                                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-amber-500/60"
                              />
                            </div>
                            <select
                              value={faturaStatusFiltro}
                              onChange={e => setFaturaStatusFiltro(e.target.value as typeof faturaStatusFiltro)}
                              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50 cursor-pointer"
                            >
                              <option value="todos">Todos os estados</option>
                              <option value="pago">Pago</option>
                              <option value="vencendo">A vencer</option>
                              <option value="pendente">Por pagar</option>
                              <option value="atrasado">Em atraso</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                          {fatFiltradas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span className="text-xs text-white/40">Sem facturas encontradas</span>
                            </div>
                          ) : (
                            <>
                              <div className="divide-y divide-zinc-800/50">
                                {faturasVisiveis.map(f => {
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
                                    <div key={f.id} className="px-4 py-3">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="text-xs font-bold text-white truncate">{f.descricao}</p>
                                        <button
                                          onClick={downloadFatura}
                                          title="Ver PDF"
                                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-amber-400/20 hover:text-amber-400 text-white/60 shrink-0 transition-colors"
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        </button>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-white/50">{f.id} · {fmtData(f.dataVencimento)}</span>
                                        <span className={`text-[10px] font-black border rounded-md px-1.5 py-0.5 whitespace-nowrap ${st.cls}`}>{st.label}</span>
                                      </div>
                                      <p className="text-sm font-black text-amber-400 tabular-nums mt-1">{fmt(f.valor)}</p>
                                    </div>
                                  );
                                })}
                              </div>
                              {fatFiltradas.length > 5 && (
                                <button
                                  onClick={() => setFaturasExpandido(v => !v)}
                                  className="w-full text-center text-xs text-amber-400/70 hover:text-amber-400 transition-colors py-2.5 border-t border-zinc-800/70"
                                >
                                  {faturasExpandido ? 'Ver menos' : 'Ver todas'} →
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Transações recentes */}
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3.5 border-b border-zinc-800/70">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Transações recentes</span>
                          </div>
                          <div className="p-3 border-b border-zinc-800/70">
                            <div className="relative">
                              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                              <input
                                value={histSearch}
                                onChange={e => setHistSearch(e.target.value)}
                                placeholder="Pesquisar transação..."
                                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-amber-500/60"
                              />
                            </div>
                          </div>
                          {transacoesFiltradas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span className="text-xs text-white/40">
                                {histSearch ? 'Nenhum resultado para a pesquisa' : 'Sem transações registadas'}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="divide-y divide-zinc-800/50">
                                {transacoesVisiveis.map((ev, i) => (
                                  <button
                                    key={i}
                                    onClick={() => downloadRecibo(ev, i)}
                                    title="Baixar recibo"
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs text-white/50">{ev.data ? (ev.data.length === 10 ? fmtData(ev.data) : ev.data) : '—'}</p>
                                      <p className="text-xs font-bold text-white truncate">{ev.sub}</p>
                                    </div>
                                    <span className={`text-sm font-black tabular-nums text-right whitespace-nowrap shrink-0 ${ev.valor < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{fmt(ev.valor)}</span>
                                  </button>
                                ))}
                              </div>
                              {transacoesFiltradas.length > 5 && (
                                <button
                                  onClick={() => setTransacoesExpandido(v => !v)}
                                  className="w-full text-center text-xs text-amber-400/70 hover:text-amber-400 transition-colors py-2.5 border-t border-zinc-800/70"
                                >
                                  {transacoesExpandido ? 'Ver menos' : 'Ver todas'} →
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Documentos */}
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3.5 border-b border-zinc-800/70">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Documentos</span>
                          </div>
                          <div className="p-3 space-y-2">
                            <button
                              onClick={downloadResumoDiv}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                              <span className="flex-1 text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Resumo de Dívida</span>
                              <span className="text-[9px] font-black text-white/40 group-hover:text-amber-400/70 shrink-0">PDF</span>
                            </button>
                            <button
                              onClick={downloadContratos}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                              <span className="flex-1 text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Comprovativo</span>
                              <span className="text-[9px] font-black text-white/40 group-hover:text-amber-400/70 shrink-0">PDF</span>
                            </button>
                            <button
                              onClick={downloadExtrato}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/30 transition-all text-left group"
                            >
                              <svg width="14" height="14" className="text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>
                              <span className="flex-1 text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Histórico de Facturas</span>
                              <span className="text-[9px] font-black text-white/40 group-hover:text-amber-400/70 shrink-0">PDF</span>
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Estado vazio */}
                      {totalPago === 0 && totalAReceber === 0 && historico.length === 0 && (
                        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 text-center">
                          <div className="text-amber-400 text-2xl mb-2">✅</div>
                          <p className="text-white text-sm font-bold">Sem movimentos financeiros</p>
                          <p className="text-white text-xs mt-1">As suas reservas e compras aparecem aqui após registo.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
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