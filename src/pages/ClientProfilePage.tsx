import { useState } from 'react';
import { Mail, Phone, MapPin, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useXitique } from '../context/XitiqueContext';
import { useFinance } from '../context/FinanceContext';
import { useNotifications } from '../context/NotificationsContext';
import { VEHICLES } from '../data/constants';
import { ReservationTracker } from '../components/ReservationTracker';
import XitiqueModal from '../components/XitiqueModal';
import type { Reservation, ReservationStatus } from '../types/reservation';

const ACTIVE_STATUSES: ReservationStatus[] = [
  'pendente', 'confirmada', 'pronta_levantamento', 'ativa', 'devolucao_pendente',
];

type Section =
  | 'dados_pessoais'
  | 'dados_estatisticos'
  | 'reservas'
  | 'compras'
  | 'pagamentos'
  | 'xitique'
  | 'historico';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MT';

const RES_STATUS: Record<ReservationStatus, { label: string; cls: string }> = {
  pendente:            { label: 'Aguarda Pagamento',      cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', cls: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Ativo',          cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     cls: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              cls: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  compra_aprovada:     { label: 'Compra Aprovada',        cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  entrada_paga:        { label: 'Entrada Paga',           cls: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  em_prestacao:        { label: 'Em Prestação',           cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
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

export function ClientProfilePage({ onExit: _onExit }: { onExit?: () => void }) {
  const { user: authUser, allUsers } = useAuth();
  const { reservations, cancelReservation } = useReservations();
  const { grupos, inscricoes } = useXitique();
  const { dividas } = useFinance();
  const { showToast } = useNotifications();

  // ── Dados derivados ────────────────────────────────────────────────────────
  const userRes = reservations.filter(r => r.userId === authUser?.id);

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

  const [section, setSection] = useState<Section>('dados_pessoais');
  const [perfilOpen, setPerfilOpen]       = useState(true);
  const [prestOpen, setPrestOpen]         = useState<Set<string>>(new Set());
  const [secOpen, setSecOpen]             = useState<Set<string>>(new Set());
  const [showXitiqueModal, setShowXitiqueModal] = useState(false);
  const toggleSec = (k: string) => setSecOpen(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });

  // ── Reservas ───────────────────────────────────────────────────────────────
  const [showInativos,  setShowInativos]  = useState(false);
  const [detalheId,     setDetalheId]     = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [cancelMotivo,  setCancelMotivo]  = useState('');

  const handleDownloadReserva = (r: Reservation) => {
    const veh = getVehicleName(r.vehicleId);
    const st  = RES_STATUS[r.status]?.label ?? r.status;
    const lines = [
      '========================================',
      '       SOS MOTORS — Comprovativo',
      '========================================',
      `Reserva Nº : ${r.id}`,
      `Viatura    : ${veh}`,
      `Estado     : ${st}`,
      `Início     : ${fmtData(r.dataInicio)} ${r.horaLevantamento ? 'às ' + r.horaLevantamento : ''}`,
      `Fim        : ${fmtData(r.dataFim)} ${r.horaDevolucao ? 'às ' + r.horaDevolucao : ''}`,
      `Valor Total: ${fmt(r.valorTotal)} MT`,
      r.deposito > 0 ? `Depositado : ${fmt(r.deposito)} MT` : '',
      r.notas ? `Observações: ${r.notas}` : '',
      '========================================',
      'Gerado pela plataforma SOS Motors',
    ].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `reserva_${r.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExtensao = (r: Reservation) => {
    showToast(
      'Pedido enviado',
      `Extensão para "${getVehicleName(r.vehicleId)}" solicitada. O administrador entrará em contacto.`,
      'info',
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

  const getVehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const getVehicle     = (id: number) => VEHICLES.find(v => v.id === id);

  const pagamentosBadge = minhasDividas.length + prestacoesPendentes.length;
  const xitiqueBadge   = (membro?.estado === 'Pendente' && grupoDoUser?.estadoGrupo === 'EmAndamento') ? 1 : 0;

  // ── helpers de navegação ──────────────────────────────────────────────────
  const goto = (s: Section) => {
    setSection(s);
    if (s === 'dados_pessoais' || s === 'dados_estatisticos') setPerfilOpen(true);
  };

  const navBtn = (key: Section, label: string) => (
    <button
      key={key}
      onClick={() => goto(key)}
      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        section === key
          ? 'bg-amber-500/15 text-amber-400'
          : 'text-white hover:bg-zinc-800/60'
      }`}
    >
      {label}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">

      {/* ══ ASIDE SIDEBAR ════════════════════════════════════════════════════ */}
      <aside className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col sticky top-0 h-screen overflow-y-auto outline-none">

        {/* User card */}
        <div className="p-4 border-b border-zinc-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-sm shrink-0">
              {fullUser?.avatar
                ? <img src={fullUser.avatar} alt={authUser?.nome} className="w-full h-full object-cover rounded-xl" />
                : <span>{authUser ? initials(authUser.nome) : '?'}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{authUser?.nome.split(' ')[0]}</p>
              <p className="text-[10px] text-white/70 truncate">{authUser?.email}</p>
            </div>
          </div>
          {totalAlertas > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
              <span className="text-[10px] text-red-400 font-bold">{totalAlertas} pendente{totalAlertas > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto outline-none">

          {/* ── Perfil (grupo expansível) ── */}
          <div>
            <button
              onClick={() => setPerfilOpen(v => !v)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                (section === 'dados_pessoais' || section === 'dados_estatisticos')
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-white hover:bg-zinc-800/60'
              }`}
            >
              <IcoUser />
              <span className="flex-1 text-left">Perfil</span>
              <IcoChevron open={perfilOpen} />
            </button>
            {perfilOpen && (
              <div className="ml-5 mt-0.5 space-y-0.5 border-l border-zinc-700/60 pl-2">
                {navBtn('dados_pessoais',    'Dados Pessoais')}
                {navBtn('dados_estatisticos','Dados Estatísticos')}
              </div>
            )}
          </div>

          {/* ── Reservas ── */}
          <button
            onClick={() => goto('reservas')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              section === 'reservas' ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-zinc-800/60'
            }`}
          >
            <IcoKey />
            <span className="flex-1 text-left">Reservas</span>
            {alugueres.length > 0 && (
              <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${section === 'reservas' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-white'}`}>
                {alugueres.length}
              </span>
            )}
          </button>

          {/* ── Compras ── */}
          <button
            onClick={() => goto('compras')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              section === 'compras' ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-zinc-800/60'
            }`}
          >
            <IcoCar />
            <span className="flex-1 text-left">Compras</span>
            {compras.length > 0 && (
              <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${section === 'compras' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-white'}`}>
                {compras.length}
              </span>
            )}
          </button>

          {/* ── Pagamentos ── */}
          <button
            onClick={() => goto('pagamentos')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              section === 'pagamentos' ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-zinc-800/60'
            }`}
          >
            <IcoWallet />
            <span className="flex-1 text-left">Pagamentos</span>
            {pagamentosBadge > 0 && (
              <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white">
                {pagamentosBadge}
              </span>
            )}
          </button>

          {/* ── Xitique ── */}
          <button
            onClick={() => goto('xitique')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              section === 'xitique' ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-zinc-800/60'
            }`}
          >
            <IcoTrophy />
            <span className="flex-1 text-left">Xitique</span>
            {xitiqueBadge > 0 && (
              <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center bg-amber-500 text-zinc-950">
                !
              </span>
            )}
          </button>

          {/* ── Histórico ── */}
          <button
            onClick={() => goto('historico')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              section === 'historico' ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-zinc-800/60'
            }`}
          >
            <IcoHistory />
            <span className="flex-1 text-left">Histórico</span>
          </button>

        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <p className="text-[10px] text-white/40 text-center">SOS Motors · A minha conta</p>
        </div>
      </aside>

      {/* ══ CONTENT AREA ═════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-y-auto outline-none">

        {/* Page title bar */}
        <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="text-amber-500">
            {section === 'dados_pessoais'    && <IcoUser />}
            {section === 'dados_estatisticos'&& <IcoBarChart />}
            {section === 'reservas'          && <IcoKey />}
            {section === 'compras'           && <IcoCar />}
            {section === 'pagamentos'        && <IcoWallet />}
            {section === 'xitique'           && <IcoTrophy />}
            {section === 'historico'         && <IcoHistory />}
          </div>
          <h1 className="text-sm font-black text-white uppercase tracking-widest">
            {section === 'dados_pessoais'    && 'Dados Pessoais'}
            {section === 'dados_estatisticos'&& 'Dados Estatísticos'}
            {section === 'reservas'          && 'Reservas'}
            {section === 'compras'           && 'Compras'}
            {section === 'pagamentos'        && 'Pagamentos'}
            {section === 'xitique'           && 'Xitique'}
            {section === 'historico'         && 'Histórico'}
          </h1>
        </div>
        </div>

        <div className="p-6 space-y-4 w-full">

          {/* ══ DADOS PESSOAIS ════════════════════════════════════════════════ */}
          {section === 'dados_pessoais' && (
            <div className="space-y-3">

              {/* Profile Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-xl shrink-0 shadow-lg mb-4">
                    {fullUser?.avatar
                      ? <img src={fullUser.avatar} alt={authUser?.nome} className="w-full h-full object-cover" />
                      : <span>{authUser ? initials(authUser.nome) : '?'}</span>
                    }
                  </div>
                  <h2 className="text-white font-black text-xl leading-tight">
                    {fullUser?.nome ?? authUser?.nome}
                  </h2>
                  {fullUser?.category && (
                    <p className="text-zinc-400 text-sm mt-0.5">
                      {fullUser.category === 'func_publico' ? 'Funcionário Público' :
                       fullUser.category === 'func_privado' ? 'Funcionário Privado' :
                       fullUser.category === 'empreendedor' ? 'Empreendedor' : ''}
                    </p>
                  )}
                </div>
                <div className="border-t border-zinc-800 mx-5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 px-5 py-5">
                  {[
                    { icon: <Mail size={14} />,      value: fullUser?.email ?? authUser?.email },
                    { icon: <Phone size={14} />,     value: fullUser?.telefone },
                    { icon: <MapPin size={14} />,    value: fullUser?.endereco },
                    { icon: <Briefcase size={14} />, value: fullUser?.category === 'func_publico' ? 'Funcionário Público' : fullUser?.category === 'func_privado' ? 'Funcionário Privado' : fullUser?.category === 'empreendedor' ? 'Empreendedor' : undefined },
                    { icon: <Calendar size={14} />,  value: fullUser?.dataCriacao ? `Membro desde ${fmtData(fullUser.dataCriacao.slice(0, 10))}` : undefined },
                  ].filter(f => !!f.value).map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 min-w-0">
                      <span className="text-zinc-500 shrink-0">{f.icon}</span>
                      <span className="text-sm text-white truncate">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado da Conta */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                  <span className="text-amber-400"><IcoShield /></span>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Estado da Conta</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {[
                    {
                      label: 'Estado',
                      badge: fullUser?.status === 'ativo'    ? { text: 'Activo',    cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' } :
                             fullUser?.status === 'suspenso' ? { text: 'Suspenso',  cls: 'bg-red-400/10 text-red-400 border-red-400/20' } :
                             fullUser?.status === 'inativo'  ? { text: 'Inactivo',  cls: 'bg-zinc-700 text-white border-zinc-600' } :
                                                               { text: 'Pendente',  cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
                    },
                    {
                      label: 'Regularidade',
                      badge: fullUser?.regularity === 'regular'      ? { text: 'Regular',      cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' } :
                             fullUser?.regularity === 'inadimplente' ? { text: 'Inadimplente', cls: 'bg-red-400/10 text-red-400 border-red-400/20' } :
                                                                       { text: 'Pendente',      cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
                    },
                    {
                      label: 'Xitique',
                      badge: fullUser?.xitique
                        ? { text: 'Inscrito',     cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' }
                        : { text: 'Não inscrito', cls: 'bg-zinc-700 text-zinc-400 border-zinc-600' },
                    },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-xs text-white">{row.label}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${row.badge.cls}`}>
                        {row.badge.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentos (expansível) */}
              {(() => {
                const allDocs = [
                  { key: 'bi',                   label: 'Bilhete de Identidade (BI)',  value: fullUser?.documentos?.bi  ?? (fullUser?.bi   ? true : undefined) },
                  { key: 'nuit',                  label: 'NUIT',                        value: fullUser?.documentos?.nuit ?? (fullUser?.nuit  ? true : undefined) },
                  { key: 'declaracao_rendimento', label: 'Declaração de Rendimento',    value: fullUser?.documentos?.declaracao_rendimento },
                  { key: 'contrato_trabalho',     label: 'Contrato de Trabalho',        value: fullUser?.documentos?.contrato_trabalho },
                  { key: 'carta_conducao',        label: 'Carta de Condução',           value: fullUser?.documentos?.carta_conducao },
                  { key: 'declaracao_bairro',     label: 'Declaração de Bairro',        value: fullUser?.documentos?.declaracao_bairro },
                ] as { key: string; label: string; value?: string | boolean }[];

                const conhecidos = allDocs.filter(d => d.value !== undefined);
                const entregues  = conhecidos.filter(d => !!d.value).length;
                const emFalta    = conhecidos.filter(d => !d.value).length;
                const hasAnyDoc  = fullUser?.bi || fullUser?.nuit || fullUser?.documentos;

                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSec('docs')}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </span>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Documentos</span>
                        {hasAnyDoc && (
                          <div className="flex items-center gap-1">
                            {entregues > 0 && <span className="text-[10px] bg-emerald-400/15 text-emerald-400 border border-emerald-400/20 rounded-full px-1.5 py-0.5 font-black">{entregues} ok</span>}
                            {emFalta > 0   && <span className="text-[10px] bg-red-400/15 text-red-400 border border-red-400/20 rounded-full px-1.5 py-0.5 font-black">{emFalta} em falta</span>}
                          </div>
                        )}
                      </div>
                      <IcoChevron open={secOpen.has('docs')} />
                    </button>

                    {secOpen.has('docs') && (
                      !hasAnyDoc ? (
                        <div className="px-4 py-5 text-center text-xs text-zinc-500 border-t border-zinc-800">
                          Nenhum documento registado. Contacte o administrador.
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-800/50 border-t border-zinc-800">
                          {conhecidos.map(d => {
                            const presente = !!d.value;
                            return (
                              <div key={d.key} className={`flex items-center justify-between gap-3 px-4 py-3 ${presente ? '' : 'opacity-70'}`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${presente ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                                    {presente
                                      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                      : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    }
                                  </div>
                                  <span className="text-xs text-white truncate">{d.label}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${presente ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                                  {presente ? 'Entregue' : 'Em falta'}
                                </span>
                              </div>
                            );
                          })}
                          {conhecidos.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/30">
                              <span className="text-[10px] text-zinc-400 font-bold">Total registados</span>
                              <span className="text-[10px] text-white font-black">{entregues} / {conhecidos.length}</span>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}

              <div className="flex items-start gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#6b7280"/>
                </svg>
                <p className="text-xs text-white leading-relaxed">
                  Para alterar os seus dados ou credenciais, contacte o administrador da SOS Motors.
                </p>
              </div>
            </div>
          )}

          {/* ══ DADOS ESTATÍSTICOS ════════════════════════════════════════════ */}
          {section === 'dados_estatisticos' && (
            <div className="space-y-4">

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Reservas</div>
                  <div className="text-3xl font-black text-white">{alugueres.length}</div>
                  <div className="text-[10px] text-white mt-0.5">{alugueres.filter(a => a.status === 'concluida').length} concluída{alugueres.filter(a => a.status === 'concluida').length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Compras</div>
                  <div className="text-3xl font-black text-white">{compras.length}</div>
                  <div className="text-[10px] text-white mt-0.5">{compras.filter(c => c.status === 'liquidada').length} liquidada{compras.filter(c => c.status === 'liquidada').length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Total Investido</div>
                  <div className="text-sm font-black text-amber-400 leading-tight mt-1">{totalInvestido > 0 ? fmt(totalInvestido) : '—'}</div>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${
                  membro?.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' :
                  membro?.estado === 'Aceite'   ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-900 border-zinc-800'
                }`}>
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Xitique</div>
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                  <span className="text-amber-400"><IcoBarChart /></span>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Resumo Financeiro</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-white">Gasto em alugueres</span>
                    <span className="text-xs font-black text-white">{totalAlugueresGasto > 0 ? fmt(totalAlugueresGasto) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-white">Total em compras</span>
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Reservas por Estado</span>
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
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
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
            const ativos   = alugueres.filter(r =>  ACTIVE_STATUSES.includes(r.status));
            const inativos = alugueres.filter(r => !ACTIVE_STATUSES.includes(r.status));
            const lista    = showInativos ? inativos : ativos;

            const ReservaRow = ({ r }: { r: Reservation }) => {
              const st        = RES_STATUS[r.status];
              const expanded  = detalheId === r.id;
              const isAtivo   = ACTIVE_STATUSES.includes(r.status);
              const podeCancelar = isAtivo && r.status !== 'ativa' && r.status !== 'devolucao_pendente';
              const podeEstender = r.status === 'ativa';
              const valorRestante = r.valorTotal - r.deposito;

              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* ── Linha principal ── */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 items-center">

                    {/* Carro + datas + estado + obs */}
                    <div className="px-4 py-3 min-w-0">
                      <p className="text-sm font-black text-white truncate">{getVehicleName(r.vehicleId)}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-[10px] text-white/60">Início: <span className="text-white font-bold">{fmtData(r.dataInicio)}</span></span>
                        <span className="text-[10px] text-white/60">Fim: <span className="text-white font-bold">{fmtData(r.dataFim)}</span></span>
                        {r.horaDevolucao && <span className="text-[10px] text-white/60">Dev: <span className="text-white font-bold">{r.horaDevolucao}</span></span>}
                      </div>
                      {r.notas && <p className="text-[10px] text-white/50 mt-0.5 truncate">{r.notas}</p>}
                    </div>

                    {/* Estado */}
                    <div className="px-3 py-3 shrink-0">
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                    </div>

                    {/* Btn: Detalhes */}
                    <button
                      onClick={() => setDetalheId(expanded ? null : r.id)}
                      title="Ver detalhes"
                      className={`px-3 py-3 h-full border-l border-zinc-800 transition-colors ${expanded ? 'text-amber-400 bg-amber-500/10' : 'text-white/50 hover:text-white hover:bg-zinc-800/60'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>

                    {/* Btn: Download */}
                    <button
                      onClick={() => handleDownloadReserva(r)}
                      title="Baixar comprovativo"
                      className="px-3 py-3 h-full border-l border-zinc-800 text-white/50 hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>

                    {/* Btn: Extensão / Cancelar */}
                    <div className="flex border-l border-zinc-800 h-full">
                      {podeEstender && (
                        <button
                          onClick={() => handleExtensao(r)}
                          title="Solicitar extensão"
                          className="px-3 py-3 text-sky-400/70 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>
                        </button>
                      )}
                      {podeCancelar && (
                        <button
                          onClick={() => setCancelConfirm(r.id)}
                          title="Cancelar reserva"
                          className="px-3 py-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </button>
                      )}
                      {!podeEstender && !podeCancelar && <div className="px-3 py-3 w-10" />}
                    </div>
                  </div>

                  {/* ── Painel de detalhes expandido ── */}
                  {expanded && (
                    <div className="border-t border-zinc-800 bg-zinc-950/40 px-4 py-4 space-y-4">
                      {/* Tracker */}
                      <div>
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-2">Estado do Processo</p>
                        <ReservationTracker status={r.status} readonly />
                      </div>
                      {/* Período */}
                      <div className="bg-zinc-800/50 rounded-xl px-4 py-3 space-y-2">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Período</p>
                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                          <div>
                            <p className="text-white/50 uppercase text-[9px] font-bold mb-0.5">Levantamento</p>
                            <p className="font-black text-white">{fmtData(r.dataInicio)}</p>
                            {r.horaLevantamento && <p className="text-white/70">às {r.horaLevantamento}</p>}
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="text-white font-black bg-zinc-700 rounded-full px-2 py-0.5 text-[10px]">{diffDias(r.dataInicio, r.dataFim)} dias</span>
                          </div>
                          <div>
                            <p className="text-white/50 uppercase text-[9px] font-bold mb-0.5">Devolução</p>
                            <p className="font-black text-white">{fmtData(r.dataFim)}</p>
                            {r.horaDevolucao && <p className="text-white/70">às {r.horaDevolucao}</p>}
                          </div>
                        </div>
                        {(r.localLevantamento || r.localDevolucao) && (
                          <div className="pt-2 border-t border-zinc-700 space-y-1 text-xs">
                            {r.localLevantamento && <div className="flex gap-2"><span className="text-white/60 shrink-0">📍</span><span className="text-white">{r.localLevantamento}</span></div>}
                            {r.localDevolucao    && <div className="flex gap-2"><span className="text-white/60 shrink-0">🏁</span><span className="text-white">{r.localDevolucao}</span></div>}
                          </div>
                        )}
                      </div>
                      {/* Valores */}
                      <div className="bg-zinc-800/50 rounded-xl overflow-hidden text-sm">
                        <div className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-white/70">Valor total</span>
                          <span className="font-black text-amber-400">{fmt(r.valorTotal)}</span>
                        </div>
                        {r.deposito > 0 && (
                          <div className="flex justify-between items-center px-4 py-2.5 border-t border-zinc-700/60">
                            <span className="text-white/70">Pago (caução/reserva)</span>
                            <span className="font-bold text-emerald-400">{fmt(r.deposito)}</span>
                          </div>
                        )}
                        {valorRestante > 0 && r.status !== 'concluida' && (
                          <div className="flex justify-between items-center px-4 py-2.5 border-t border-zinc-700/60 bg-zinc-700/30">
                            <span className="text-white font-bold">Valor restante</span>
                            <span className="font-black text-white">{fmt(valorRestante)}</span>
                          </div>
                        )}
                      </div>
                      {/* Acções de detalhe */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleDownloadReserva(r)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Baixar comprovativo
                        </button>
                        {podeEstender && (
                          <button
                            onClick={() => handleExtensao(r)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>
                            Solicitar extensão
                          </button>
                        )}
                        {podeCancelar && (
                          <button
                            onClick={() => setCancelConfirm(r.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            Cancelar reserva
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Modal de confirmação de cancelamento ── */}
                  {cancelConfirm === r.id && (
                    <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-4 space-y-3">
                      <div>
                        <p className="text-sm text-white font-bold mb-0.5">Cancelar reserva?</p>
                        <p className="text-xs text-white/70">Esta acção não pode ser desfeita. A sua reserva de <span className="text-white font-bold">{getVehicleName(r.vehicleId)}</span> será cancelada.</p>
                      </div>
                      <div>
                        <label className="text-xs text-white font-bold block mb-1">Motivo do cancelamento <span className="text-red-400">*</span></label>
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
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Activos</span>
                    <span className="text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">{ativos.length}</span>
                    {inativos.length > 0 && <>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Concluídos/Cancelados</span>
                      <span className="text-[10px] font-black bg-zinc-800 text-white/50 border border-zinc-700 rounded-full px-2 py-0.5">{inativos.length}</span>
                    </>}
                  </div>
                  {inativos.length > 0 && (
                    <button
                      onClick={() => { setShowInativos(v => !v); setDetalheId(null); }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        showInativos
                          ? 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-white/60 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {showInativos ? 'Ver activos' : 'Ver histórico'}
                    </button>
                  )}
                </div>

                {/* Lista */}
                {lista.length === 0 ? (
                  <div className="text-center text-white/50 text-sm py-10 bg-zinc-900 rounded-xl border border-zinc-800">
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
              const lines = [
                '==========================================',
                '  SOS MOTORS — Comprovativo de Compra',
                '==========================================',
                `ID Operação : ${c.id}`,
                `Viatura     : ${veh?.name ?? `#${c.vehicleId}`}`,
                `Marca       : ${veh?.brand ?? '—'}`,
                `Tipo        : ${CAT_LABEL[veh?.cat ?? ''] ?? '—'}`,
                `Matrícula   : ${veh?.matricula ?? '—'}`,
                `Ano         : ${veh?.year ?? '—'}`,
                `Data compra : ${fmtData(c.dataInicio)}`,
                `Estado      : ${st}`,
                `Valor       : ${veh?.price ?? fmt(c.valorTotal)}`,
                `Garantia    : ${gar.ativa ? `Activa até ${fmtData(gar.expira)}` : 'Expirada'}`,
                '==========================================',
                'Gerado pela plataforma SOS Motors',
              ].join('\n');
              const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `compra_${c.id}.txt`; a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="space-y-3">
                {/* Contagem */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Histórico de Compras</span>
                  <span className="text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">{compras.length}</span>
                </div>

                {compras.length === 0 ? (
                  <div className="text-center text-white/50 text-sm py-10 bg-zinc-900 rounded-xl border border-zinc-800">
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
                    { label: 'Seguro Obrigatório',        valor: c.status === 'liquidada' ? 'Disponível' : 'Aguarda liquidação', ok: c.status === 'liquidada' },
                    { label: 'Inspeção Técnica',          valor: (veh?.year ?? 0) >= 2022 ? 'Válida' : 'Verificar renovação', ok: (veh?.year ?? 0) >= 2022 },
                  ];

                  return (
                    <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

                      {/* ── Linha de tabela ── */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-0">
                        <div className="px-4 py-3 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-white">{veh?.name ?? getVehicleName(c.vehicleId)}</p>
                            {veh?.cat && (
                              <span className="text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-white/60 rounded-full px-2 py-0.5 uppercase">
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
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                        </div>

                        <button
                          onClick={() => toggleSec(c.id)}
                          title="Ver detalhes"
                          className={`px-4 py-3 h-full border-l border-zinc-800 transition-colors ${expanded ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-white hover:bg-zinc-800/60'}`}
                        >
                          <IcoChevron open={expanded} />
                        </button>
                      </div>

                      {/* ── Painel expandido ── */}
                      {expanded && (
                        <div className="border-t border-zinc-800 bg-zinc-950/40 px-4 py-4 space-y-4">

                          {/* Garantia */}
                          <div>
                            <p className="text-xs text-amber-400 font-black uppercase tracking-widest mb-2">Garantia</p>
                            <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                              <div className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50 ${gar.ativa ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${gar.ativa ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                <div className="flex-1">
                                  <p className={`text-sm font-black ${gar.ativa ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {gar.ativa ? `Garantia activa — ${gar.mesesRestantes} meses restantes` : 'Garantia expirada'}
                                  </p>
                                  <p className="text-xs text-white mt-0.5">Validade: {fmtData(gar.expira)}</p>
                                </div>
                              </div>
                              {[
                                { label: 'Duração',   val: '2 anos a partir da data de compra' },
                                { label: 'Cobertura', val: 'Motor, transmissão e componentes estruturais' },
                                { label: 'Excluído',  val: 'Desgaste normal, acidentes e modificações' },
                                { label: 'Suporte',   val: '+258 86 884 4283 · info@rentcar.co.mz' },
                              ].map(row => (
                                <div key={row.label} className="flex gap-3 px-4 py-2.5 border-b border-zinc-700/30 last:border-0">
                                  <span className="text-xs text-white font-bold w-24 shrink-0">{row.label}</span>
                                  <span className="text-xs text-white">{row.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Documentos */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-amber-400 font-black uppercase tracking-widest">Documentos do Carro</p>
                              <button
                                onClick={() => downloadComprovativo(c, veh)}
                                className="flex items-center gap-1 text-xs font-bold text-white hover:text-amber-400 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Baixar comprovativo
                              </button>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-700/40">
                              {docs.map(doc => (
                                <div key={doc.label} className="flex items-center gap-3 px-4 py-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black border ${doc.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
                                    {doc.ok ? '✓' : '!'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{doc.label}</p>
                                    <p className={`text-xs ${doc.ok ? 'text-white' : 'text-amber-400'}`}>{doc.valor}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Prestações */}
                          {isParcelada && (
                            <div className="space-y-3">
                              <p className="text-xs text-amber-400 font-black uppercase tracking-widest">Plano de Pagamento</p>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-2 py-3">
                                  <p className="text-[10px] text-white uppercase font-bold mb-1">Pagas</p>
                                  <p className="text-base font-black text-emerald-400">{prestacoesPagas}</p>
                                </div>
                                <div className={`${prestRestantes > 0 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-800 border-zinc-700'} border rounded-xl px-2 py-3`}>
                                  <p className="text-[10px] text-white uppercase font-bold mb-1">Faltam</p>
                                  <p className={`text-base font-black ${prestRestantes > 0 ? 'text-amber-400' : 'text-white'}`}>{prestRestantes}</p>
                                </div>
                                <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-3">
                                  <p className="text-[10px] text-white uppercase font-bold mb-1">Total</p>
                                  <p className="text-base font-black text-white">{totalPrestacoes}</p>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                  <span className="text-white font-bold">{Math.round(progressPct)}% pago</span>
                                  <span className="text-white">{fmt(prestacoes.find(p => !p.paga)?.valor ?? c.deposito)}/mês</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-2 rounded-full ${prestRestantes === 0 ? 'bg-emerald-400' : 'bg-amber-500'}`} style={{ width: `${progressPct}%` }} />
                                </div>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl overflow-hidden text-sm">
                                <div className="flex justify-between items-center px-4 py-2.5">
                                  <span className="text-white">Total já pago</span>
                                  <span className="font-black text-emerald-400">{fmt(totalPago)}</span>
                                </div>
                                {totalEmFalta > 0 && (
                                  <div className="flex justify-between items-center px-4 py-2.5 border-t border-zinc-700/60">
                                    <span className="text-white">Ainda em falta</span>
                                    <span className="font-black text-amber-400">{fmt(totalEmFalta)}</span>
                                  </div>
                                )}
                                {prestRestantes === 0 && (
                                  <div className="text-center py-2 border-t border-zinc-700/60">
                                    <span className="text-emerald-400 font-black text-xs">Viatura totalmente liquidada!</span>
                                  </div>
                                )}
                              </div>
                              {prestacoes.length > 0 && (
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setPrestOpen(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 transition-all"
                                  >
                                    <span className="flex items-center gap-2 text-xs font-black text-white">
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                      Minhas Prestações
                                      <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">{prestacoesPagas}/{totalPrestacoes}</span>
                                    </span>
                                    <IcoChevron open={prestOpen.has(c.id)} />
                                  </button>
                                  {prestOpen.has(c.id) && (
                                    <div className="bg-zinc-800/40 rounded-xl overflow-hidden divide-y divide-zinc-700/40">
                                      {prestacoes.map(p => {
                                        const isProxima = p.numero === proximaNumero;
                                        const hoje2 = new Date().toISOString().split('T')[0];
                                        const emAtraso = !p.paga && p.dataVencimento < hoje2;
                                        return (
                                          <div key={p.numero} className={`flex items-center gap-3 px-4 py-3 ${p.paga ? 'bg-emerald-500/5' : isProxima ? 'bg-amber-500/8' : ''}`}>
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
                                                {isProxima && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Próxima</span>}
                                                {emAtraso  && <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Em atraso</span>}
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

                          {c.deposito > 0 && !isParcelada && (
                            <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm">
                              <p className="text-xs text-amber-400 font-black uppercase tracking-widest mb-1">Pagamento</p>
                              <div className="flex justify-between">
                                <span className="text-white">Valor pago (pronto pagamento)</span>
                                <span className="font-black text-emerald-400">{fmt(c.deposito)}</span>
                              </div>
                            </div>
                          )}

                          {/* Botão cancelar compra — só para estados canceláveis */}
                          {(c.status === 'pendente' || c.status === 'compra_aprovada') && cancelConfirm !== c.id && (
                            <button
                              onClick={() => { setCancelConfirm(c.id); setCancelMotivo(''); }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                              Cancelar compra
                            </button>
                          )}

                          {/* Painel de confirmação cancelamento compra */}
                          {cancelConfirm === c.id && (
                            <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-4 space-y-3">
                              <div>
                                <p className="text-sm text-white font-bold mb-0.5">Cancelar compra?</p>
                                <p className="text-xs text-white/70">Esta acção não pode ser desfeita. O pedido de compra de <span className="text-white font-bold">{veh?.name ?? getVehicleName(c.vehicleId)}</span> será cancelado.</p>
                              </div>
                              <div>
                                <label className="text-xs text-white font-bold block mb-1">Motivo do cancelamento <span className="text-red-400">*</span></label>
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
                      )}
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

            // ── Histórico de pagamentos (todos os eventos pagos) ─────────────
            type PagEvt = { label: string; sub: string; valor: number; data: string; tipo: 'aluguer' | 'compra' | 'xitique' | 'divida' };
            const historico: PagEvt[] = [];
            alugueres.filter(a => a.status === 'concluida').forEach(a => {
              historico.push({ label: getVehicleName(a.vehicleId), sub: 'Aluguer concluído', valor: a.valorTotal, data: a.dataFim, tipo: 'aluguer' });
            });
            compras.forEach(c => {
              (c.prestacoes ?? []).filter(p => p.paga && p.dataPagamento).forEach(p => {
                historico.push({ label: getVehicleName(c.vehicleId), sub: `Prestação ${p.numero}`, valor: p.valorPago ?? p.valor, data: p.dataPagamento!, tipo: 'compra' });
              });
            });
            if (membro) {
              (membro.mesesPagos as number[]).forEach(mes => {
                const reg = (membro.pagamentos as Record<number, { data: string; metodo?: string }>)?.[mes];
                historico.push({ label: grupoDoUser?.nome ?? 'Xitique', sub: `Quota mês ${mes}`, valor: quotaMT, data: reg?.data ?? '', tipo: 'xitique' });
              });
            }
            historico.sort((a, b) => b.data.localeCompare(a.data));

            const tipoCls: Record<PagEvt['tipo'], string> = {
              aluguer: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
              compra:  'bg-purple-400/10 text-purple-400 border-purple-400/20',
              xitique: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
              divida:  'bg-red-400/10 text-red-400 border-red-400/20',
            };
            const tipoLabel: Record<PagEvt['tipo'], string> = {
              aluguer: 'Aluguer', compra: 'Compra', xitique: 'Xitique', divida: 'Dívida',
            };

            return (
              <div className="space-y-4">

                {/* ── KPI cards ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Total Pago */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Total Pago</div>
                    <div className="text-lg font-black text-emerald-400">{totalPago > 0 ? fmt(totalPago) : '—'}</div>
                    <div className="mt-1.5 space-y-0.5">
                      {totalPagoAlugueres > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-white/60">Alugueres</span><span className="text-[10px] text-white font-bold">{fmt(totalPagoAlugueres)}</span></div>}
                      {totalPagoCompras   > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-white/60">Compras</span><span className="text-[10px] text-white font-bold">{fmt(totalPagoCompras)}</span></div>}
                      {totalPagoXitique   > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-white/60">Xitique</span><span className="text-[10px] text-white font-bold">{fmt(totalPagoXitique)}</span></div>}
                    </div>
                  </div>

                  {/* Total em Dívida */}
                  <div className={`rounded-2xl p-4 border ${totalDivida > 0 ? 'bg-red-500/8 border-red-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Total em Dívida</div>
                    <div className={`text-lg font-black ${totalDivida > 0 ? 'text-red-400' : 'text-white'}`}>{totalDivida > 0 ? fmt(totalDivida) : '—'}</div>
                    {totalDivida > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {totalDividaCompras > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-white/60">Prestações</span><span className="text-[10px] text-white font-bold">{fmt(totalDividaCompras)}</span></div>}
                        {totalDividaOutras  > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-white/60">Outras</span><span className="text-[10px] text-white font-bold">{fmt(totalDividaOutras)}</span></div>}
                      </div>
                    )}
                    {totalDivida === 0 && <div className="text-[10px] text-emerald-400 mt-1">Sem dívidas em aberto</div>}
                  </div>

                  {/* Próxima Prestação */}
                  <div className={`rounded-2xl p-4 border ${proximaPrestacao ? 'bg-amber-500/8 border-amber-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Próxima Prestação</div>
                    {proximaPrestacao ? (
                      <>
                        <div className="text-lg font-black text-amber-400">{fmt(proximaPrestacao.valor)}</div>
                        <div className="text-[10px] text-white mt-0.5 truncate">{proximaPrestacao.veiculo}</div>
                        <div className="text-[10px] text-white">Vence: {fmtData(proximaPrestacao.data)}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-black text-white">—</div>
                        <div className="text-[10px] text-white mt-0.5">Sem prestações pendentes</div>
                      </>
                    )}
                  </div>

                  {/* Prestações Pagas */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Prestações Pagas</div>
                    <div className="text-lg font-black text-white">
                      {totalPrestacoesPagas}
                      {totalPrestacoesTotais > 0 && <span className="text-sm text-white/60 font-bold"> / {totalPrestacoesTotais}</span>}
                    </div>
                    {viaturasLiquidadas > 0 && (
                      <div className="text-[10px] text-emerald-400 mt-1">{viaturasLiquidadas} viatura{viaturasLiquidadas > 1 ? 's' : ''} liquidada{viaturasLiquidadas > 1 ? 's' : ''}</div>
                    )}
                    {totalPrestacoesTotais === 0 && <div className="text-[10px] text-white mt-1">Sem planos de prestação</div>}
                  </div>
                </div>

                {/* ── Gráfico: Evolução de pagamentos ───────────────────────── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="text-amber-400"><IcoBarChart /></span>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Evolução de Pagamentos</span>
                    <span className="text-[10px] text-white ml-auto">Últimos 12 meses</span>
                  </div>
                  <div className="px-4 pt-4 pb-3">
                    {mesesEvol.every(m => m.valor === 0) ? (
                      <div className="flex flex-col items-center justify-center h-24 gap-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="9" width="4" height="12"/><rect x="10" y="5" width="4" height="16"/><rect x="17" y="1" width="4" height="20"/></svg>
                        <span className="text-xs text-white">Sem dados de pagamento nos últimos 12 meses</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-end gap-1 h-24">
                          {mesesEvol.map((m, i) => {
                            const pct = maxEvol > 0 ? (m.valor / maxEvol) * 100 : 0;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                {m.valor > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[9px] text-white font-bold whitespace-nowrap -translate-y-6 mx-auto w-fit">
                                      {fmt(m.valor)}
                                    </div>
                                  </div>
                                )}
                                <div className="w-full flex flex-col justify-end" style={{ height: '76px' }}>
                                  {m.valor > 0 ? (
                                    <div
                                      className={`w-full rounded-t transition-all ${m.isNow ? 'bg-amber-500' : 'bg-zinc-700 group-hover:bg-zinc-600'}`}
                                      style={{ height: `${Math.max(pct, 6)}%` }}
                                    />
                                  ) : (
                                    <div className="w-full h-0.5 bg-zinc-800/60 rounded mt-auto" />
                                  )}
                                </div>
                                <span className={`text-[8px] font-bold leading-none ${m.isNow ? 'text-amber-400' : 'text-white/50'}`}>{m.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800/60">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                            <span className="text-[10px] text-white">Mês actual</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-700" />
                            <span className="text-[10px] text-white">Meses anteriores</span>
                          </div>
                          <span className="ml-auto text-[10px] text-white">Total 12m: <span className="text-white font-black">{fmt(mesesEvol.reduce((s, m) => s + m.valor, 0))}</span></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Gráfico: Prestação mensal por viatura ─────────────────── */}
                {prestMensais.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Prestação Mensal</span>
                      <span className="text-[10px] text-white ml-auto">Por viatura</span>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {prestMensais.map((p, i) => {
                        const progPct = p.total > 0 ? (p.pagas / p.total) * 100 : 0;
                        return (
                          <div key={i} className="px-4 py-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate">{p.nome}</p>
                                <p className="text-[10px] text-white mt-0.5">
                                  {p.pagas}/{p.total} prestações
                                  {p.data && ` · Próxima: ${fmtData(p.data)}`}
                                </p>
                              </div>
                              <span className="text-sm font-black text-amber-400 shrink-0 ml-3">
                                {fmt(p.valor)}<span className="text-[10px] text-white font-bold">/mês</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progPct}%` }} />
                              </div>
                              <span className="text-[10px] text-white font-bold shrink-0 tabular-nums">{Math.round(progPct)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Dívidas em aberto ─────────────────────────────────────── */}
                {minhasDividas.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Dívidas em Aberto</span>
                      <span className="text-[10px] text-white font-bold ml-auto">{minhasDividas.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {minhasDividas.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{d.descricao}</p>
                            <p className="text-xs text-white mt-0.5">
                              Em aberto: <span className="text-red-400 font-black">{fmt(d.valorTotal - d.valorPago)}</span>
                              {d.dataVencimento ? ` · Vence ${d.dataVencimento}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 bg-red-400/10 text-red-400 border-red-400/20">
                            Em aberto
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Prestações pendentes ───────────────────────────────────── */}
                {prestacoesPendentes.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Prestações Pendentes</span>
                      <span className="text-[10px] text-white font-bold ml-auto">{prestacoesPendentes.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {prestacoesPendentes.map(c => {
                        const restam = (c.totalPrestacoes ?? 0) - (c.prestacoesPagas ?? 0);
                        const proximaPrest = c.prestacoes?.find(p => !p.paga);
                        return (
                          <div key={c.id} className="px-4 py-3.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{getVehicleName(c.vehicleId)}</p>
                                <p className="text-xs text-white mt-0.5">
                                  {restam} prestação{restam > 1 ? 'ões' : ''} em falta
                                  {proximaPrest?.dataVencimento ? ` · Próxima: ${fmtData(proximaPrest.dataVencimento)}` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-amber-400">{fmt(proximaPrest?.valor ?? c.deposito)}</p>
                                <p className="text-[10px] text-white">por mês</p>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {Array.from({ length: c.totalPrestacoes ?? 0 }).map((_, i) => (
                                <div key={i} className={`flex-1 h-1 rounded-full ${i < (c.prestacoesPagas ?? 0) ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Histórico de pagamentos ────────────────────────────────── */}
                {historico.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                      <IcoHistory />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Histórico de Pagamentos</span>
                      <span className="text-[10px] text-white font-bold ml-auto">{historico.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-800/50 max-h-72 overflow-y-auto">
                      {historico.map((ev, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${ev.tipo === 'aluguer' ? 'bg-blue-400' : ev.tipo === 'compra' ? 'bg-purple-400' : ev.tipo === 'xitique' ? 'bg-amber-400' : 'bg-red-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{ev.label}</p>
                            <p className="text-[10px] text-white">{ev.sub}{ev.data ? ` · ${ev.data.length === 10 ? fmtData(ev.data) : ev.data}` : ''}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-emerald-400">{fmt(ev.valor)}</p>
                            <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${tipoCls[ev.tipo]}`}>{tipoLabel[ev.tipo]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-800/30">
                      <span className="text-[10px] text-white font-bold">Total do histórico</span>
                      <span className="text-xs font-black text-emerald-400">{fmt(historico.reduce((s, e) => s + e.valor, 0))}</span>
                    </div>
                  </div>
                )}

                {/* ── Estado vazio ───────────────────────────────────────────── */}
                {totalPago === 0 && totalDivida === 0 && historico.length === 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <div className="text-emerald-400 text-2xl mb-2">✅</div>
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
                        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                          <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">{s.label}</div>
                          <div className="text-sm font-black text-white leading-tight">{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {dataInicio && (
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span className="text-[10px] text-zinc-400">Início do ciclo:</span>
                        <span className="text-[10px] font-black text-amber-400">{fmtData(dataInicio)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {membro && (
                <div className={`rounded-2xl border p-5 space-y-4 ${membro.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' : membro.estado === 'Aceite' ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-900 border-zinc-800'}`}>
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
                  <div>
                    <div className="flex justify-between text-[10px] text-white mb-1.5">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
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
                              <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">{mes}</span>
                              <div>
                                <span className="text-xs text-white">Mês {mes}</span>
                                {ganhou && <p className="text-[10px] text-emerald-400 font-black">🏆 Contemplado</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pagou
                                ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Pago</span>
                                : <span className="text-[10px] font-bold text-white bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">Pendente</span>
                              }
                              {ganhou && sorteio && <span className="text-xs text-amber-400 font-black">{fmt(sorteio.valorPremio)}</span>}
                            </div>
                          </div>
                          {pagou && registo && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 py-1.5 bg-zinc-900/60 border-t border-zinc-700/40">
                              <span className="text-[10px] text-zinc-400">Via <span className="text-white font-bold">{registo.metodo}</span></span>
                              {registo.referencia && <span className="text-[10px] text-zinc-400">Ref: <span className="text-white font-mono">{registo.referencia}</span></span>}
                              <span className="text-[10px] text-zinc-400">{registo.data}</span>
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Sorteios do Grupo</h3>
                  <div className="space-y-2">
                    {[...sorteios].reverse().map(s => (
                      <div key={s.mes} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${s.vencedor === membro?.nome ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-zinc-800/50'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">{s.mes}</span>
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
                <div className="relative bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
                  {/* glow decorativo */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />

                  <div className="relative p-6 flex flex-col items-center text-center gap-4">
                    {/* Ícone */}
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl shadow-lg">
                      🏆
                    </div>

                    {/* Texto */}
                    <div className="space-y-1.5">
                      <h3 className="text-white font-black text-base">Ainda não participa no Xitique</h3>
                      <p className="text-white text-sm leading-relaxed max-w-xs mx-auto">
                        O Xitique é uma poupança colectiva mensal. Cada membro contribui com uma quota e um sortudo recebe o prémio acumulado.
                      </p>
                    </div>

                    {/* Benefícios rápidos */}
                    <div className="w-full grid grid-cols-3 gap-2 text-center">
                      {[
                        { emoji: '💰', label: 'Poupança colectiva' },
                        { emoji: '🎲', label: 'Sorteio mensal' },
                        { emoji: '🤝', label: 'Grupo de confiança' },
                      ].map(b => (
                        <div key={b.label} className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-2 py-3">
                          <div className="text-lg mb-1">{b.emoji}</div>
                          <p className="text-[10px] text-white font-semibold leading-tight">{b.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => setShowXitiqueModal(true)}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                    >
                      🏆 Participar no Xitique
                    </button>
                    <p className="text-[10px] text-white/70 leading-relaxed">
                      A sua inscrição fica sujeita a validação pelo administrador.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ HISTÓRICO ═════════════════════════════════════════════════════ */}
          {section === 'historico' && (
            <div className="space-y-2">
              {fullUser?.status === 'suspenso' && fullUser.motivoSuspensao && (
                <div className="flex gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-2">
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#f87171"/></svg>
                  <div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Conta suspensa</p>
                    <p className="text-sm text-red-300 mt-0.5 leading-relaxed">{fullUser.motivoSuspensao}</p>
                  </div>
                </div>
              )}

              {userRes.length === 0 && !membro && !inscricaoPendente && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                  <p className="text-white text-sm">Ainda não tem actividade registada.</p>
                  <p className="text-zinc-400 text-xs mt-1 opacity-60">As suas reservas, compras e xitique aparecem aqui.</p>
                </div>
              )}

              {alugueres.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Alugueres</span>
                    <span className="text-[10px] text-zinc-500 font-bold ml-auto">{alugueres.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {alugueres.map(r => {
                      const st = RES_STATUS[r.status];
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-800/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{getVehicleName(r.vehicleId)}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">{r.dataInicio} → {r.dataFim}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-amber-400 font-black">{fmt(r.valorTotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {compras.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Compras</span>
                    <span className="text-[10px] text-zinc-500 font-bold ml-auto">{compras.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {compras.map(c => {
                      const st = RES_STATUS[c.status];
                      const isParcelada = (c.totalPrestacoes ?? 0) > 0;
                      const pagas = c.prestacoesPagas ?? 0;
                      const total = c.totalPrestacoes ?? 0;
                      const restam = total - pagas;
                      return (
                        <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-800/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{getVehicleName(c.vehicleId)}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {isParcelada
                                ? restam > 0 ? `${pagas}/${total} prestações · faltam ${restam}` : 'Liquidado'
                                : `Pronto pagamento · ${fmtData(c.dataInicio)}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                            {isParcelada && <span className="text-xs text-amber-400 font-black">{fmt(c.deposito)}/mês</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(membro || inscricaoPendente) && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Xitique</span>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {membro && (
                      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">{membro.estado === 'Sorteado' ? 'Contemplado 🏆' : membro.estado === 'Aceite' ? 'Pagamento confirmado' : 'Pagamento pendente'}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Mês {mesAtual} de {numMembros} · Prémio {fmt(premioMT)}</p>
                        </div>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${membro.estado === 'Sorteado' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : membro.estado === 'Aceite' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-zinc-800 text-white border-zinc-700'}`}>
                          {membro.estado === 'Sorteado' ? 'Contemplado' : membro.estado === 'Aceite' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    )}
                    {!membro && inscricaoPendente && (
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">Inscrição em análise</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Aguarda validação pelo administrador.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── Modal de inscrição no Xitique ── */}
      {showXitiqueModal && (
        <XitiqueModal onClose={() => setShowXitiqueModal(false)} />
      )}
    </div>
  );
}
