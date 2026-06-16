import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useXitique } from '../context/XitiqueContext';
import { useFinance } from '../context/FinanceContext';
import { VEHICLES } from '../data/constants';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationBell } from '../components/NotificationBell';
import { ReservationTracker } from '../components/ReservationTracker';
import type { ReservationStatus } from '../types/reservation';

type Tab = 'resumo' | 'aluguer' | 'compra' | 'xitique';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MT';

const RES_STATUS: Record<ReservationStatus, { label: string; cls: string }> = {
  // Aluguer
  pendente:            { label: 'Aguarda Pagamento',      cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada:          { label: 'Reserva Confirmada',     cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pronta_levantamento: { label: 'Pronta p/ Levantamento', cls: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  ativa:               { label: 'Aluguer Ativo',          cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  devolucao_pendente:  { label: 'Devolução Pendente',     cls: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  concluida:           { label: 'Concluído',              cls: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada:           { label: 'Cancelado',              cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  // Compra
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

export function ClientProfilePage({ onExit }: { onExit?: () => void }) {
  const { user: authUser, logout, allUsers } = useAuth();
  const { reservations } = useReservations();
  const { grupos, inscricoes } = useXitique();
  const { dividas } = useFinance();

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

  // Encontra o grupo e membro do utilizador
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
    .filter(c => ['ativa', 'confirmada', 'concluida'].includes(c.status))
    .reduce((s, c) => {
      const v = VEHICLES.find(veh => veh.id === c.vehicleId);
      return s + (v ? parseInt(v.price.replace(/\D/g, ''), 10) : c.valorTotal);
    }, 0);

  const totalInvestido = totalAlugueresGasto + totalComprasGasto;

  // ── Tabs disponíveis ───────────────────────────────────────────────────────
  const availableTabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'resumo', label: 'Resumo' },
    ...(alugueres.length > 0 ? [{ key: 'aluguer' as Tab, label: 'Aluguer', badge: alugueres.length }] : []),
    ...(compras.length > 0   ? [{ key: 'compra'  as Tab, label: 'Compra',  badge: compras.length  }] : []),
    ...((membro || inscricaoPendente) ? [{ key: 'xitique' as Tab, label: 'Xitique' }] : []),
  ];

  const [tab, setTab] = useState<Tab>('resumo');
  const [prestOpen, setPrestOpen] = useState<Set<string>>(new Set());

  const getVehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name ?? `Viatura #${id}`;
  const getVehicle     = (id: number) => VEHICLES.find(v => v.id === id);

  const totalAlertas =
    prestacoesPendentes.length +
    minhasDividas.length +
    (membro?.estado === 'Pendente' ? 1 : 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 hover:text-amber-400 transition shrink-0"
                title="Voltar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            )}
            <BrandLogo className="h-10 w-auto max-w-[130px] shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white hidden sm:block">{authUser?.nome}</span>
            <div className="w-px h-4 bg-zinc-800" />
            <NotificationBell />
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={logout} className="text-white hover:text-amber-400 transition text-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Perfil header ── */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-base shrink-0">
            {authUser ? initials(authUser.nome) : '?'}
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">
              Olá, {authUser?.nome.split(' ')[0]}!
            </h1>
            <p className="text-xs text-white mt-0.5">{authUser?.email}</p>
          </div>
          {totalAlertas > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs text-red-400 font-bold">{totalAlertas} pendente{totalAlertas > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Alugueres</div>
            <div className="text-xl font-black text-white">{alugueres.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Compras</div>
            <div className="text-xl font-black text-white">{compras.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Total Investido</div>
            <div className="text-sm font-black text-amber-400 leading-tight">{totalInvestido > 0 ? fmt(totalInvestido) : '—'}</div>
          </div>
          <div className={`rounded-2xl p-3 text-center border ${
            membro?.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' :
            membro?.estado === 'Aceite'   ? 'bg-amber-400/10 border-amber-400/20' :
                                            'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">Xitique</div>
            <div className={`text-sm font-black leading-tight ${
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

        {/* ── Alertas ── */}
        {totalAlertas > 0 && (
          <div className="space-y-2">
            {membro?.estado === 'Pendente' && (
              <div className="flex items-center gap-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-amber-400">Pagamento Xitique Pendente</p>
                  <p className="text-xs text-white mt-0.5">
                    Efectue o pagamento de {fmt(quotaMT)} via M-Pesa — Mês {mesAtual}.
                  </p>
                </div>
              </div>
            )}
            {prestacoesPendentes.map(c => {
              const restam = (c.totalPrestacoes ?? 0) - (c.prestacoesPagas ?? 0);
              return (
                <div key={c.id} className="flex items-center gap-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-amber-400">Prestação Pendente — {getVehicleName(c.vehicleId)}</p>
                    <p className="text-xs text-white mt-0.5">
                      {restam} prestação{restam > 1 ? 'ões' : ''} em falta · {fmt(c.deposito)}/mês
                    </p>
                  </div>
                </div>
              );
            })}
            {minhasDividas.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-red-400">Dívida — {d.descricao}</p>
                  <p className="text-xs text-white mt-0.5">
                    Em aberto: {fmt(d.valorTotal - d.valorPago)}
                    {d.dataVencimento ? ` · Vence em ${d.dataVencimento}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-zinc-800 bg-black rounded-xl px-2">
          {availableTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
              {t.badge !== undefined && (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  tab === t.key ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-white'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB: RESUMO ══════════════════════════════════════════════════════ */}
        {tab === 'resumo' && (
          <div className="space-y-2">

            {/* Conta suspensa */}
            {(() => {
              const fullUser = allUsers.find(u => u.id === authUser?.id);
              return fullUser?.status === 'suspenso' && fullUser.motivoSuspensao ? (
                <div className="flex gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-2">
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#f87171"/>
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Conta suspensa</p>
                    <p className="text-sm text-red-300 mt-0.5 leading-relaxed">{fullUser.motivoSuspensao}</p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Estado vazio */}
            {userRes.length === 0 && !membro && !inscricaoPendente && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <p className="text-white text-sm">Ainda não tem actividade registada.</p>
                <p className="text-white text-xs mt-1 opacity-60">As suas reservas, compras e xitique aparecem aqui.</p>
              </div>
            )}

            {/* ── Secção: Alugueres ── */}
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
                          <p className="text-xs text-white mt-0.5">{r.dataInicio} → {r.dataFim}</p>
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

            {/* ── Secção: Compras ── */}
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
                          <p className="text-xs text-white mt-0.5">
                            {isParcelada
                              ? restam > 0 ? `${pagas}/${total} prestações · faltam ${restam}` : 'Liquidado'
                              : `Pronto pagamento · ${fmtData(c.dataInicio)}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                          {isParcelada && (
                            <span className="text-xs text-amber-400 font-black">{fmt(c.deposito)}/mês</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Secção: Xitique ── */}
            {(membro || inscricaoPendente) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-800/40">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Xitique</span>
                </div>
                <div className="divide-y divide-zinc-800">
                  {/* Estado do membro */}
                  {membro && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {membro.estado === 'Sorteado' ? 'Contemplado 🏆' :
                           membro.estado === 'Aceite'   ? 'Pagamento confirmado' :
                                                          'Pagamento pendente'}
                        </p>
                        <p className="text-xs text-white mt-0.5">Mês {mesAtual} de {numMembros} · Prémio {fmt(premioMT)}</p>
                      </div>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${
                        membro.estado === 'Sorteado' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                        membro.estado === 'Aceite'   ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                                                       'bg-zinc-800 text-white border-zinc-700'
                      }`}>
                        {membro.estado === 'Sorteado' ? 'Contemplado' : membro.estado === 'Aceite' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  )}
                  {/* Prémio ganho */}
                  {sorteioGanho && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-400/5">
                      <p className="text-xs font-bold text-emerald-400">🏆 Sorteio do Mês {sorteioGanho.mes}</p>
                      <span className="text-sm font-black text-emerald-400">{fmt(sorteioGanho.valorPremio)}</span>
                    </div>
                  )}
                  {/* Meses pagos */}
                  {membro && membro.mesesPagos.length > 0 && (
                    <div className="px-4 py-3.5">
                      <p className="text-xs text-white mb-2">{membro.mesesPagos.length} mês{membro.mesesPagos.length !== 1 ? 'es' : ''} pago{membro.mesesPagos.length !== 1 ? 's' : ''} · Total {fmt(membro.mesesPagos.length * quotaMT)}</p>
                      <div className="flex gap-1">
                        {Array.from({ length: numMembros }).map((_, i) => {
                          const mes = i + 1;
                          const s = sorteios.find(s => s.mes === mes);
                          const ganhou = s?.vencedor === membro.nome;
                          const pagou = membro.mesesPagos.includes(mes);
                          return (
                            <div key={i} className={`flex-1 h-1.5 rounded-full ${
                              ganhou ? 'bg-emerald-400' : s ? 'bg-amber-500' : pagou ? 'bg-amber-400/40' : 'bg-zinc-700'
                            }`} />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Inscrição pendente */}
                  {!membro && inscricaoPendente && (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">Inscrição em análise</p>
                        <p className="text-xs text-white mt-0.5">Aguarda validação pelo administrador.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══ TAB: ALUGUER ═════════════════════════════════════════════════════ */}
        {tab === 'aluguer' && (
          <div className="space-y-3">
            {alugueres.length === 0 ? (
              <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhum aluguer registado.
              </div>
            ) : (
              alugueres.map(r => {
                const st = RES_STATUS[r.status];
                const dias = diffDias(r.dataInicio, r.dataFim);
                const valorRestante = r.valorTotal - r.deposito;
                return (
                  <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">

                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-white">{getVehicleName(r.vehicleId)}</p>
                        <span className={`inline-block mt-1 text-[10px] border rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                    </div>

                    {/* Período */}
                    <div className="bg-zinc-800/60 rounded-xl px-4 py-3 space-y-2">
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Período do Aluguer</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-center">
                          <p className="text-[10px] text-white uppercase font-bold mb-0.5">Levantamento</p>
                          <p className="font-black text-white">{fmtData(r.dataInicio)}</p>
                          {r.horaLevantamento && <p className="text-xs text-white">às {r.horaLevantamento}</p>}
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-white font-black bg-zinc-700 rounded-full px-2 py-0.5">{dias} dia{dias > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-white uppercase font-bold mb-0.5">Devolução</p>
                          <p className="font-black text-white">{fmtData(r.dataFim)}</p>
                          {r.horaDevolucao && <p className="text-xs text-white">às {r.horaDevolucao}</p>}
                        </div>
                      </div>
                      {(r.localLevantamento || r.localDevolucao) && (
                        <div className="pt-2 border-t border-zinc-700 space-y-1 text-xs">
                          {r.localLevantamento && (
                            <div className="flex gap-2">
                              <span className="text-white shrink-0">📍 Onde levanta:</span>
                              <span className="text-white font-bold">{r.localLevantamento}</span>
                            </div>
                          )}
                          {r.localDevolucao && (
                            <div className="flex gap-2">
                              <span className="text-white shrink-0">🏁 Onde devolve:</span>
                              <span className="text-white font-bold">{r.localDevolucao}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tracking do processo */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Estado do Processo</p>
                      <ReservationTracker status={r.status} readonly />
                    </div>

                    {/* Valores */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Valores do Aluguer</p>
                      <div className="bg-zinc-800/60 rounded-xl overflow-hidden text-sm">
                        <div className="flex justify-between items-center px-4 py-3">
                          <span className="text-zinc-300">💰 Valor total do aluguer</span>
                          <span className="font-black text-amber-400">{fmt(r.valorTotal)}</span>
                        </div>
                        {r.deposito > 0 && (
                          <>
                            <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-700/60">
                              <span className="text-zinc-300">✅ Valor já pago (caução/reserva)</span>
                              <span className="font-bold text-emerald-400">{fmt(r.deposito)}</span>
                            </div>
                            {valorRestante > 0 && r.status !== 'concluida' && (
                              <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-700/60 bg-zinc-700/30">
                                <span className="text-white font-bold">📌 Valor restante a pagar</span>
                                <span className="font-black text-white">{fmt(valorRestante)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ TAB: COMPRA ══════════════════════════════════════════════════════ */}
        {tab === 'compra' && (
          <div className="space-y-3">
            {compras.length === 0 ? (
              <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhuma compra registada.
              </div>
            ) : (
              compras.map(c => {
                const st = RES_STATUS[c.status];
                const veh = getVehicle(c.vehicleId);
                const isParcelada = (c.totalPrestacoes ?? 0) > 0;
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

                return (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">

                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-white">{getVehicleName(c.vehicleId)}</p>
                        <p className="text-xs text-white mt-0.5">Comprado em {fmtData(c.dataInicio)}</p>
                      </div>
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 font-bold shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>

                    {/* Preço da viatura */}
                    {veh?.price && (
                      <div className="bg-zinc-800/60 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Preço da Viatura</p>
                        <p className="text-xl font-black text-white">{veh.price}</p>
                      </div>
                    )}

                    {isParcelada && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Como está a pagar</p>

                        {/* Resumo em cards */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-2 py-3">
                            <p className="text-[9px] text-white uppercase font-bold mb-1">Já pagou</p>
                            <p className="text-sm font-black text-emerald-400">{prestacoesPagas}</p>
                            <p className="text-[9px] text-white">prestação{prestacoesPagas !== 1 ? 'ões' : ''}</p>
                          </div>
                          <div className={`${prestRestantes > 0 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-zinc-800 border-zinc-700'} border rounded-xl px-2 py-3`}>
                            <p className="text-[9px] text-white uppercase font-bold mb-1">Faltam</p>
                            <p className={`text-sm font-black ${prestRestantes > 0 ? 'text-amber-400' : 'text-white'}`}>{prestRestantes}</p>
                            <p className="text-[9px] text-white">prestação{prestRestantes !== 1 ? 'ões' : ''}</p>
                          </div>
                          <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-3">
                            <p className="text-[9px] text-white uppercase font-bold mb-1">Total</p>
                            <p className="text-sm font-black text-white">{totalPrestacoes}</p>
                            <p className="text-[9px] text-white">meses</p>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-white font-bold">{Math.round(progressPct)}% pago</span>
                            <span className="text-white">{fmt(prestacoes.find(p => !p.paga)?.valor ?? c.deposito)}/mês</span>
                          </div>
                          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all ${prestRestantes === 0 ? 'bg-emerald-400' : 'bg-amber-500'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex gap-1 mt-2">
                            {Array.from({ length: totalPrestacoes }).map((_, i) => (
                              <div
                                key={i}
                                title={`Prestação ${i + 1}: ${i < prestacoesPagas ? 'Paga' : 'Pendente'}`}
                                className={`flex-1 h-1 rounded-full ${i < prestacoesPagas ? 'bg-amber-500' : 'bg-zinc-700'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Totais */}
                        <div className="bg-zinc-800/60 rounded-xl overflow-hidden text-sm">
                          <div className="flex justify-between items-center px-4 py-2.5">
                            <span className="text-zinc-300">✅ Total já pago</span>
                            <span className="font-black text-emerald-400">{fmt(totalPago)}</span>
                          </div>
                          {totalEmFalta > 0 && (
                            <div className="flex justify-between items-center px-4 py-2.5 border-t border-zinc-700/60 bg-zinc-700/20">
                              <span className="text-white font-bold">📌 Valor ainda em falta</span>
                              <span className="font-black text-amber-400">{fmt(totalEmFalta)}</span>
                            </div>
                          )}
                          {prestRestantes === 0 && (
                            <div className="text-center py-2 border-t border-zinc-700/60">
                              <span className="text-emerald-400 font-black text-xs">🎉 Viatura totalmente liquidada!</span>
                            </div>
                          )}
                        </div>

                        {/* Histórico detalhado de prestações — toggle */}
                        {prestacoes.length > 0 && (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setPrestOpen(prev => {
                                const next = new Set(prev);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                return next;
                              })}
                              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all group"
                            >
                              <span className="flex items-center gap-2 text-xs font-black text-white">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                Minhas Prestações
                                <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-bold">
                                  {prestacoesPagas}/{totalPrestacoes}
                                </span>
                              </span>
                              <svg
                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className={`text-zinc-400 group-hover:text-white transition-all duration-200 ${prestOpen.has(c.id) ? 'rotate-180' : ''}`}
                              >
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>

                            {prestOpen.has(c.id) && (
                            <div className="bg-zinc-800/40 rounded-xl overflow-hidden divide-y divide-zinc-700/40">
                            <p className="hidden text-[10px] text-amber-400 font-black uppercase tracking-widest">Histórico de Prestações</p>
                            <div className="bg-zinc-800/40 rounded-xl overflow-hidden divide-y divide-zinc-700/40">
                              {prestacoes.map(p => {
                                const isProxima = p.numero === proximaNumero;
                                const hoje = new Date().toISOString().split('T')[0];
                                const emAtraso = !p.paga && p.dataVencimento < hoje;
                                return (
                                  <div key={p.numero} className={`flex items-center gap-3 px-4 py-2.5 ${
                                    p.paga      ? 'bg-emerald-500/5'
                                    : isProxima ? 'bg-amber-500/8'
                                    : ''
                                  }`}>
                                    {/* Ícone / número */}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border ${
                                      p.paga      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : isProxima ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                      : emAtraso  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                    }`}>
                                      {p.paga ? '✓' : p.numero}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-bold ${p.paga ? 'text-emerald-300' : isProxima ? 'text-amber-300' : 'text-zinc-500'}`}>
                                        Prestação {p.numero}
                                        {isProxima && <span className="ml-1.5 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-black">Próxima</span>}
                                        {emAtraso && <span className="ml-1.5 text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-black">Em atraso</span>}
                                      </p>
                                      <p className="text-[10px] text-zinc-500 tabular-nums">
                                        {p.paga && p.dataPagamento
                                          ? `Pago a ${fmtData(p.dataPagamento)}`
                                          : `Vence a ${fmtData(p.dataVencimento)}`}
                                      </p>
                                    </div>

                                    {/* Valor */}
                                    <div className="text-right shrink-0">
                                      {p.paga ? (
                                        <>
                                          <p className="text-xs font-black text-emerald-400">{fmt(p.valorPago ?? p.valor)}</p>
                                          {p.valorPago && p.valorPago !== p.valor && (
                                            <p className="text-[9px] text-zinc-500 line-through tabular-nums">{fmt(p.valor)}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className={`text-xs font-bold tabular-nums ${isProxima ? 'text-amber-400' : 'text-zinc-500'}`}>
                                          {fmt(p.valor)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                      </div>
                    )}

                    {c.deposito > 0 && !isParcelada && (
                      <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Pagamento</p>
                        <div className="flex justify-between">
                          <span className="text-white">💰 Valor pago (pronto pagamento)</span>
                          <span className="font-black text-emerald-400">{fmt(c.deposito)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ TAB: XITIQUE ═════════════════════════════════════════════════════ */}
        {tab === 'xitique' && (
          <div className="space-y-4">

            {/* Estado do grupo */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Estado',       value: estadoGrupo === 'EmAndamento' ? 'Em Andamento' : estadoGrupo },
                { label: 'Mês Actual',   value: `${mesAtual} / ${numMembros}` },
                { label: 'Prémio Mensal',value: fmt(premioMT) },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">{s.label}</div>
                  <div className="text-sm font-black text-white leading-tight">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Card estado do membro */}
            {membro && (
              <div className={`rounded-2xl border p-5 space-y-4 ${
                membro.estado === 'Sorteado' ? 'bg-emerald-400/10 border-emerald-400/20' :
                membro.estado === 'Aceite'   ? 'bg-amber-400/10 border-amber-400/20'     :
                                               'bg-zinc-900 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      membro.estado === 'Sorteado' ? 'bg-emerald-400' :
                      membro.estado === 'Aceite'   ? 'bg-amber-400 animate-pulse' :
                                                     'bg-zinc-500 animate-pulse'
                    }`} />
                    <span className={`text-sm font-black uppercase tracking-wide ${
                      membro.estado === 'Sorteado' ? 'text-emerald-400' :
                      membro.estado === 'Aceite'   ? 'text-amber-400'   : 'text-white'
                    }`}>
                      {membro.estado === 'Pendente' ? 'Pagamento Pendente'
                        : membro.estado === 'Aceite' ? 'Pagamento Confirmado'
                        : 'Contemplado 🎉'}
                    </span>
                  </div>
                  <span className="text-xs text-white">Mês {mesAtual}</span>
                </div>
                <p className="text-xs text-white leading-relaxed">
                  {membro.estado === 'Pendente' &&
                    `Efectue o pagamento de ${fmt(quotaMT)} via M-Pesa e aguarde a confirmação do administrador.`}
                  {membro.estado === 'Aceite' &&
                    `O seu pagamento de ${fmt(quotaMT)} foi confirmado. Está elegível para o sorteio deste mês.`}
                  {membro.estado === 'Sorteado' &&
                    `Parabéns! Foi contemplado e irá receber ${fmt(premioMT)}. O administrador entrará em contacto.`}
                </p>

                {/* Barra de progresso do ciclo */}
                <div>
                  <div className="flex justify-between text-[10px] text-white mb-1.5">
                    <span>Progresso do Ciclo</span>
                    <span>{sorteios.length} / {numMembros} sorteios</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: numMembros }).map((_, i) => {
                      const s = sorteios[i];
                      const ganhou = s?.vencedor === membro.nome;
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full ${
                            ganhou  ? 'bg-emerald-400' :
                            s       ? 'bg-amber-500' :
                                      'bg-zinc-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {sorteioGanho && (
                  <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 text-center">
                    <div className="text-emerald-400 font-black text-sm">🏆 Sorteio do Mês {sorteioGanho.mes}</div>
                    <div className="text-white font-black text-2xl mt-1">{fmt(sorteioGanho.valorPremio)}</div>
                    <div className="text-xs text-white mt-1">O administrador irá contactá-lo para a entrega.</div>
                  </div>
                )}
              </div>
            )}

            {/* Inscrição pendente (ainda não aprovada) */}
            {!membro && inscricaoPendente && (
              <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-black text-sm uppercase tracking-wide">Inscrição em Análise</span>
                </div>
                <p className="text-xs text-white leading-relaxed">
                  A sua inscrição foi recebida e está a aguardar validação pelo administrador.
                </p>
              </div>
            )}

            {/* ── O Meu Histórico de Pagamentos ── */}
            {membro && (membro.mesesPagos.length > 0 || sorteios.length > 0) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">O Meu Histórico</h3>
                <div className="space-y-2">
                  {Array.from({ length: Math.max(sorteios.length, membro.mesesPagos.length, mesAtual - 1) }, (_, i) => i + 1).map(mes => {
                    const sorteio = sorteios.find(s => s.mes === mes);
                    const pagou   = membro.mesesPagos.includes(mes);
                    const ganhou  = sorteio?.vencedor === membro.nome;
                    return (
                      <div key={mes} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
                        ganhou ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-zinc-800/50'
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                            {mes}
                          </span>
                          <div>
                            <span className="text-xs text-white">Mês {mes}</span>
                            {ganhou && <p className="text-[10px] text-emerald-400 font-black">🏆 Contemplado</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pagou ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Pago</span>
                          ) : (
                            <span className="text-[10px] font-bold text-white bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">Pendente</span>
                          )}
                          {ganhou && sorteio && (
                            <span className="text-xs text-amber-400 font-black">{fmt(sorteio.valorPremio)}</span>
                          )}
                        </div>
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

            {/* Histórico geral de sorteios */}
            {sorteios.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Sorteios do Grupo</h3>
                <div className="space-y-2">
                  {[...sorteios].reverse().map(s => (
                    <div key={s.mes} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
                      s.vencedor === membro?.nome ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-zinc-800/50'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                          {s.mes}
                        </span>
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-white text-sm">Ainda não está associado ao grupo Xitique.</p>
                <p className="text-white text-xs">Contacte o administrador para mais informações.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-white text-xs pb-4">
          SOS Motors · A minha conta
        </div>
      </div>
    </div>
  );
}
