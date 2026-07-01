import { useState } from 'react';
import type { User } from '../types/user';
import { useReservations } from '../context/ReservationsContext';
import { VEHICLES, CATEGORY_LABEL, DOC_LABEL } from '../data/constants';
import { useAuth } from '../context/AuthContext';

interface UserProfileContentProps {
  user: User;
  showRole?: boolean;
}

const STATUS_RESERVA: Record<string, { label: string; cls: string; dot: string }> = {
  pendente:  { label: 'Ag. Pagamento', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20', dot: 'bg-amber-400' },
  confirmada:{ label: 'Confirmada', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20',       dot: 'bg-blue-400' },
  ativa:     { label: 'Ativa',      cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400' },
  concluida: { label: 'Concluída',  cls: 'bg-zinc-700 text-white border-zinc-600',                dot: 'bg-zinc-400' },
  cancelada: { label: 'Cancelada',  cls: 'bg-red-400/10 text-red-400 border-red-400/20',          dot: 'bg-red-400' },
};

const ROLE_LABEL  = { admin: 'Administrador', cliente: 'Cliente' };
const REG_LABEL   = { regular: 'Regular', pendente: 'Pendente', inadimplente: 'Inadimplente' };
const REST_LABEL  = { nenhuma: 'Nenhuma', blacklisted: 'Lista Negra' };
const STATUS_LABEL = { ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso', pendente: 'Pendente' };

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
}

// H8 — ícone simples reutilizável
function FieldIcon({ path, size = 13 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500">
      <path d={path} />
    </svg>
  );
}

export function UserProfileContent({ user, showRole = true }: UserProfileContentProps) {
  const { reservations, deleteReservation } = useReservations();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [showPass, setShowPass]         = useState(false);
  const [copiado, setCopiado]           = useState<string | null>(null);
  // H3/H5 — confirmação antes de acção destrutiva
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fallbackCopy = (texto: string) => {
    const el = document.createElement('textarea');
    el.value = texto;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const copiar = (texto: string, chave: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).catch(() => fallbackCopy(texto));
    } else {
      fallbackCopy(texto);
    }
    setCopiado(chave);
    setTimeout(() => setCopiado(null), 2000);
  };

  const userReservations = reservations.filter(r => r.userId === user.id);
  const alugueres = userReservations.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return !v || v.mode === 'aluguer';
  });
  const compras = userReservations.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return v?.mode === 'compra';
  });

  const totalAlugueresGasto = alugueres
    .filter(a => a.status === 'concluida')
    .reduce((s, a) => s + a.valorTotal, 0);

  const totalComprasGasto = compras
    .filter(c => ['concluida','confirmada','ativa'].includes(c.status))
    .reduce((s, c) => {
      const v = VEHICLES.find(veh => veh.id === c.vehicleId);
      const originalPrice = v ? parseInt(v.price.replace(/\D/g, ''), 10) : c.valorTotal;
      const isInstallment = (c.notas || '')?.includes('prestações');
      return s + (isInstallment ? originalPrice : c.valorTotal);
    }, 0);

  const totalGasto = totalAlugueresGasto + totalComprasGasto;
  const getVehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;

  const isSuspended = user.status === 'suspenso';
  const isBlacklisted = user.restriction === 'blacklisted';

  return (
    <div className="space-y-6">

      {/* ── H1: estado crítico em destaque imediato ─────────────────────── */}
      {isSuspended && (
        <div className="flex gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3">
          <svg className="shrink-0 mt-0.5 text-red-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/>
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Conta Suspensa</p>
            {user.motivoSuspensao && (isAdmin || authUser?.id === user.id) && (
              <p className="text-sm text-red-300 mt-0.5 leading-relaxed">{user.motivoSuspensao}</p>
            )}
          </div>
        </div>
      )}

      {isBlacklisted && (
        <div className="flex gap-3 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
          <svg className="shrink-0 mt-0.5 text-red-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Lista Negra — acesso restrito</p>
        </div>
      )}

      {/* ── Cabeçalho do perfil ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
          isSuspended ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
          'bg-amber-500/10 border border-amber-500/20 text-amber-500'
        }`}>
          {initials(user.nome)}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white leading-tight">{user.nome}</h2>
          <p className="text-sm text-white mt-0.5 truncate">{user.email}</p>
          {showRole && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {/* H6 — badges com significado explícito */}
              <span className="text-[10px] bg-zinc-800 text-white px-2 py-0.5 rounded-md border border-zinc-700 font-semibold">
                {ROLE_LABEL[user.role]}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                user.status === 'ativo'    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                user.status === 'suspenso' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                             'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {STATUS_LABEL[user.status] ?? user.status}
              </span>
              {user.regularity && user.regularity !== 'regular' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                  user.regularity === 'pendente'     ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                       'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {REG_LABEL[user.regularity]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Alugueres',      value: alugueres.length,                         color: 'text-white' },
          { label: 'Compras',        value: compras.length,                            color: 'text-white' },
          { label: 'Total investido',value: `${Math.round(totalGasto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} MT`, color: 'text-amber-400', small: true },
        ].map(k => (
          <div key={k.label} className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 text-center">
            <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">{k.label}</p>
            <p className={`font-black leading-tight ${k.small ? 'text-sm' : 'text-2xl'} ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Informações do utilizador ────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Informações</p>
        {/* H6 — ícone + label para reconhecimento imediato do campo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
          {[
            { icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', label: 'Telefone', value: user.telefone || '—' },
            { icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM1 7l11 8 11-8', label: 'Categoria', value: user.category ? CATEGORY_LABEL[user.category] : 'Não definida' },
            { icon: 'M10 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5m-4 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1m-6 0h6', label: 'BI', value: user.bi || '—' },
            { icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', label: 'NUIT', value: user.nuit || '—' },
            { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z', label: 'Membro desde', value: fmtDate(user.dataCriacao) },
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Restrição', value: REST_LABEL[user.restriction || 'nenhuma'] },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <FieldIcon path={item.icon} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-white uppercase font-bold tracking-wider">{item.label}</p>
                <p className="text-sm text-white mt-0.5 truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Documentos ──────────────────────────────────────────────────── */}
      {user.documentos && Object.keys(user.documentos).length > 0 && (
        <div>
          <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Documentos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(user.documentos) as [string, string | boolean][]).map(([key, raw]) => {
              const exists = Boolean(raw);
              return (
              <div key={key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${
                exists
                  ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400'
                  : 'bg-zinc-800/30 border-zinc-800 text-zinc-500'
              }`}>
                {/* H6 — ícone comunica estado sem depender só de cor */}
                {exists ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                )}
                <span className="font-semibold">{DOC_LABEL[key] || key}</span>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Credenciais (admin only) ─────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Credenciais de Acesso</p>
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Confidencial</span>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl overflow-hidden divide-y divide-zinc-700/60">
            {/* Email */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-0.5">Email</p>
                <p className="text-sm text-white font-medium truncate">{user.email}</p>
              </div>
              {/* H1 — feedback textual "Copiado!" em vez de só ✓ */}
              <button
                onClick={() => copiar(user.email, 'email')}
                title="Copiar email"
                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  copiado === 'email'
                    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {copiado === 'email' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            {/* Telefone */}
            {user.telefone && (
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-0.5">Telemóvel</p>
                  <p className="text-sm text-white font-medium">{user.telefone}</p>
                </div>
                <button
                  onClick={() => copiar(user.telefone, 'tel')}
                  title="Copiar número"
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    copiado === 'tel'
                      ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                      : 'bg-zinc-700 text-white hover:bg-zinc-600'
                  }`}
                >
                  {copiado === 'tel' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            )}
            {/* Senha */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-0.5">Senha</p>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black tracking-widest ${user.password ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {showPass ? (user.password || '123') : '••••••••'}
                  </span>
                  {!user.password && (
                    <span className="text-[9px] text-zinc-500 font-bold uppercase bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">padrão</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* H4/H7 — título descritivo em todos os botões de ícone */}
                <button
                  onClick={() => setShowPass(v => !v)}
                  title={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  className={`p-1.5 rounded-lg transition ${showPass ? 'text-amber-400 bg-amber-400/10' : 'text-white hover:text-white hover:bg-zinc-700'}`}
                >
                  {showPass ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
                <button
                  onClick={() => copiar(user.password || '123', 'pass')}
                  title="Copiar senha"
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    copiado === 'pass'
                      ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                      : 'bg-zinc-700 text-white hover:bg-zinc-600'
                  }`}
                >
                  {copiado === 'pass' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Histórico de transações ──────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">
          Histórico de Transações
          {userReservations.length > 0 && (
            <span className="ml-2 text-zinc-500 font-bold normal-case tracking-normal text-[10px]">
              {userReservations.length} registo{userReservations.length !== 1 ? 's' : ''}
            </span>
          )}
        </p>

        {userReservations.length === 0 ? (
          /* H9 — estado vazio informativo */
          <div className="flex flex-col items-center py-10 text-center bg-zinc-900 rounded-xl border border-zinc-800">
            <svg className="text-zinc-700 mb-3" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
            </svg>
            <p className="text-sm text-white font-semibold">Sem transações</p>
            <p className="text-xs text-zinc-500 mt-1">Os alugueres e compras deste utilizador aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userReservations.map(a => {
              const vehicle = VEHICLES.find(v => v.id === a.vehicleId);
              const isPurchase = vehicle?.mode === 'compra';
              const st = STATUS_RESERVA[a.status] ?? { label: a.status, cls: 'bg-zinc-800 text-zinc-400 border-zinc-700', dot: 'bg-zinc-500' };
              const isInstallment = (a.notas || '')?.includes('prestações');

              return (
                <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* H6 — badge de tipo + nome da viatura juntos */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          isPurchase
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                        }`}>
                          {isPurchase ? 'Compra' : 'Aluguer'}
                        </span>
                        <p className="text-sm font-bold text-white truncate">{getVehicleName(a.vehicleId)}</p>
                      </div>

                      {/* Detalhe */}
                      <p className="text-xs text-white mt-1">
                        {isPurchase
                          ? `Adquirido em ${fmtDate(a.dataInicio)}${vehicle ? ` · ${vehicle.price}` : ''}`
                          : `${fmtDate(a.dataInicio)} → ${fmtDate(a.dataFim)}`}
                      </p>

                      {isPurchase && (a.totalPrestacoes ?? 0) > 0 && (
                        <p className="text-[10px] text-amber-400 font-semibold mt-1">
                          {a.prestacoesPagas ?? 0}/{a.totalPrestacoes} prestações pagas · restam {(a.totalPrestacoes ?? 0) - (a.prestacoesPagas ?? 0)}
                        </p>
                      )}
                      {!isPurchase && a.localLevantamento && (
                        <p className="text-[10px] text-white mt-1">
                          📍 {a.localLevantamento} → 🏁 {a.localDevolucao}
                        </p>
                      )}
                    </div>

                    {/* Direita: estado + valor + acção */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* H1 — ponto de cor + label de estado */}
                      <span className={`text-[10px] border rounded-md px-2 py-0.5 font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                      <p className="text-sm font-black text-white">
                        {isPurchase && isInstallment
                          ? `${Math.round(a.deposito).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} MT/mês`
                          : `${Math.round(a.valorTotal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} MT`}
                      </p>
                      {isAdmin && (
                        /* H3/H5 — pede confirmação antes de eliminar */
                        <button
                          onClick={() => setConfirmDelete(a.id)}
                          title="Eliminar registo"
                          aria-label="Eliminar registo"
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── H3/H5: Modal de confirmação de eliminação ────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-black text-sm">Eliminar registo?</p>
                <p className="text-xs text-white mt-0.5">Esta acção é permanente e não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {/* H3 — saída de emergência clara */}
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { deleteReservation(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg py-2.5 text-sm font-bold transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
