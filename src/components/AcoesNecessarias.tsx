import { useMemo, useState } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useFinance } from '../context/FinanceContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useUsers } from '../context/UsersContext';
import { useGuests } from '../context/GuestsContext';
import { VEHICLES } from '../data/constants';
import { useRoute } from '../hooks/useRoute';

const compraIds = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));

const STORAGE_KEY = 'rentcar:acoes:dismissed';

type Urgency = 'alta' | 'media' | 'info';
interface Acao { label: string; route: string; urgency: Urgency }

const U = {
  alta:  { bar: 'bg-red-500',   icon: '🔴', text: 'text-red-400',   bg: 'hover:bg-red-500/5' },
  media: { bar: 'bg-amber-400', icon: '🟡', text: 'text-amber-400', bg: 'hover:bg-amber-500/5' },
  info:  { bar: 'bg-blue-500',  icon: '🔵', text: 'text-blue-400',  bg: 'hover:bg-blue-500/5' },
};

function p(n: number, s: string, pl?: string) {
  return `${n} ${n === 1 ? s : (pl ?? s + 's')}`;
}

function loadDismissed(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return new Set(saved ? JSON.parse(saved) : []);
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function AcoesNecessarias() {
  const { reservations, blocks } = useReservations();
  const { dividas } = useFinance();
  const { vehicles } = useVehicles();
  const { inscricoes, membros } = useXitique();
  const { users } = useUsers();
  const { guests } = useGuests();
  const { navigate } = useRoute();

  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showHidden, setShowHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const dismiss = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(label);
      saveDismissed(next);
      return next;
    });
  };

  const restore = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => {
      const next = new Set(prev);
      next.delete(label);
      saveDismissed(next);
      return next;
    });
  };

  const acoes = useMemo((): Acao[] => {
    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const items: Acao[] = [];

    // ── ALTA ──────────────────────────────────────────────────────────────────
    const devolucaoPendente = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'devolucao_pendente'
    ).length;
    if (devolucaoPendente > 0)
      items.push({ label: `${p(devolucaoPendente, 'devolução', 'devoluções')} pendente${devolucaoPendente > 1 ? 's' : ''} — aguarda viatura recebida`, route: '/admin/aluguer', urgency: 'alta' });

    const emAtraso = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'ativa' && r.dataFim < today
    ).length;
    if (emAtraso > 0)
      items.push({ label: `${p(emAtraso, 'aluguer')} em atraso — viatura${emAtraso > 1 ? 's' : ''} não devolvida${emAtraso > 1 ? 's' : ''}`, route: '/admin/aluguer', urgency: 'alta' });

    const pendentes = reservations.filter(r => r.status === 'pendente' && !compraIds.has(r.vehicleId)).length;
    if (pendentes > 0)
      items.push({ label: `${p(pendentes, 'reserva')} aguarda${pendentes === 1 ? '' : 'm'} confirmação`, route: '/admin/aluguer', urgency: 'alta' });

    const devolvemHoje = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'ativa' && r.dataFim === today
    ).length;
    if (devolvemHoje > 0)
      items.push({ label: `${p(devolvemHoje, 'cliente')} devolve${devolvemHoje === 1 ? '' : 'm'} hoje`, route: '/admin/aluguer', urgency: 'alta' });

    const compraAtraso = reservations.filter(r => compraIds.has(r.vehicleId) && r.status === 'prestacao_atraso').length;
    if (compraAtraso > 0)
      items.push({ label: `${p(compraAtraso, 'compra')} com prestação em atraso — regularizar urgente`, route: '/admin/compra', urgency: 'alta' });

    const dividasVencidas = dividas.filter(d => d.dataVencimento && d.dataVencimento < today && d.status !== 'quitado');
    if (dividasVencidas.length > 0) {
      const maxAtraso = dividasVencidas.reduce((max, d) => {
        const dias = Math.floor((Date.now() - new Date(d.dataVencimento!).getTime()) / 86_400_000);
        return dias > max ? dias : max;
      }, 0);
      items.push({ label: `${p(dividasVencidas.length, 'prestação', 'prestações')} atrasada${dividasVencidas.length > 1 ? 's' : ''} (maior atraso: ${maxAtraso} dias)`, route: '/admin/financas', urgency: 'alta' });
    }

    // ── MÉDIA ─────────────────────────────────────────────────────────────────
    const prontasLevantamento = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'pronta_levantamento'
    ).length;
    if (prontasLevantamento > 0)
      items.push({ label: `${p(prontasLevantamento, 'viatura')} pronta${prontasLevantamento > 1 ? 's' : ''} para levantamento`, route: '/admin/aluguer', urgency: 'media' });

    const iniciaHoje = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'confirmada' && r.dataInicio === today
    ).length;
    if (iniciaHoje > 0)
      items.push({ label: `${p(iniciaHoje, 'aluguer')} começa${iniciaHoje === 1 ? '' : 'm'} hoje — marcar viatura como pronta`, route: '/admin/aluguer', urgency: 'media' });

    const vencemAmanha = dividas.filter(d => d.dataVencimento === tomorrow && d.status !== 'quitado').length;
    if (vencemAmanha > 0)
      items.push({ label: `${p(vencemAmanha, 'prestação', 'prestações')} vence${vencemAmanha === 1 ? '' : 'm'} amanhã`, route: '/admin/financas', urgency: 'media' });

    const vendasPendentes = reservations.filter(r => compraIds.has(r.vehicleId) && r.status === 'pendente').length;
    if (vendasPendentes > 0)
      items.push({ label: `${p(vendasPendentes, 'venda')} pendente${vendasPendentes > 1 ? 's' : ''} por concluir`, route: '/admin/compra', urgency: 'media' });

    const comprasPrestacoes = reservations.filter(r =>
      compraIds.has(r.vehicleId) && r.status === 'em_prestacao'
    ).length;
    if (comprasPrestacoes > 0)
      items.push({ label: `${p(comprasPrestacoes, 'compra')} em regime de prestações`, route: '/admin/compra', urgency: 'media' });

    const inscricoesPendentes = inscricoes.filter(i => i.status === 'aguarda_validacao').length;
    if (inscricoesPendentes > 0)
      items.push({ label: `${p(inscricoesPendentes, 'inscrição', 'inscrições')} no Xitique aguarda${inscricoesPendentes === 1 ? '' : 'm'} aprovação`, route: '/admin/xitique', urgency: 'media' });

    // ── INFO ──────────────────────────────────────────────────────────────────
    const semPagamento = membros.filter(m => m.estado === 'Aceite' && !m.pagamentoMes).length;
    if (semPagamento > 0)
      items.push({ label: `${p(semPagamento, 'membro')} Xitique sem pagamento no mês`, route: '/admin/xitique', urgency: 'info' });

    const usersPendentes = users.filter(u => u.status === 'pendente').length;
    if (usersPendentes > 0)
      items.push({ label: `${p(usersPendentes, 'utilizador')} com conta pendente de activação`, route: '/admin', urgency: 'info' });

    const visitantesPendentes = guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length;
    if (visitantesPendentes > 0)
      items.push({ label: `${p(visitantesPendentes, 'visitante')} aguarda${visitantesPendentes === 1 ? '' : 'm'} validação de documentos`, route: '/admin', urgency: visitantesPendentes > 2 ? 'media' : 'info' });

    const manutencaoIds = new Set<number>();
    blocks
      .filter(b => b.motivo === 'manutencao' && b.dataInicio <= today && b.dataFim >= today)
      .forEach(b => {
        if (b.vehicleId !== null) manutencaoIds.add(b.vehicleId);
        else vehicles.forEach(v => manutencaoIds.add(v.id));
      });
    if (manutencaoIds.size > 0)
      items.push({ label: `${p(manutencaoIds.size, 'viatura')} em manutenção`, route: '/admin/veiculos', urgency: 'info' });

    return items;
  }, [reservations, dividas, blocks, vehicles, inscricoes, membros, users, guests]);

  const visible = acoes.filter(a => !dismissed.has(a.label));
  const hidden  = acoes.filter(a => dismissed.has(a.label));

  if (acoes.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3">
        <span className="text-lg">✅</span>
        <div>
          <p className="text-white font-black text-sm uppercase tracking-wider">Ações Necessárias</p>
          <p className="text-emerald-400 text-xs mt-0.5">Tudo em ordem — sem acções pendentes.</p>
        </div>
      </div>
    );
  }

  const altaCount  = visible.filter(a => a.urgency === 'alta').length;
  const badgeStyle = altaCount > 0
    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20';

  const Row = ({ a, isDismissed }: { a: Acao; isDismissed: boolean }) => {
    const s = U[a.urgency];
    return (
      <div className={`flex items-center gap-3 px-5 py-3 transition-colors group ${isDismissed ? 'opacity-40' : s.bg}`}>
        <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />
        <span className="text-sm shrink-0">{s.icon}</span>
        <button
          onClick={() => !isDismissed && navigate(a.route)}
          className={`text-sm font-semibold flex-1 text-left ${isDismissed ? 'text-zinc-500 line-through' : `${s.text} hover:underline underline-offset-2`}`}
          disabled={isDismissed}
        >
          {a.label}
        </button>
        {isDismissed ? (
          <button
            onClick={(e) => restore(a.label, e)}
            title="Tornar visível"
            className="shrink-0 p-1 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => dismiss(a.label, e)}
              title="Omitir"
              className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/60 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <svg className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" onClick={() => navigate(a.route)}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-black text-sm uppercase tracking-wider">Ações Necessárias</h2>
        <div className="flex items-center gap-2">
          {hidden.length > 0 && !collapsed && (
            <button
              onClick={() => setShowHidden(p => !p)}
              className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                showHidden
                  ? 'bg-zinc-700 text-white border-zinc-600'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              {hidden.length} oculta{hidden.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => setCollapsed(p => !p)}
            className={`flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full border transition-colors ${badgeStyle} hover:brightness-125`}
          >
            {visible.length} item{visible.length !== 1 ? 's' : ''}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="divide-y divide-zinc-800/50">
            {visible.map((a, i) => <Row key={i} a={a} isDismissed={false} />)}
            {showHidden && hidden.map((a, i) => <Row key={`h-${i}`} a={a} isDismissed={true} />)}
          </div>

          {visible.length === 0 && hidden.length > 0 && (
            <div className="px-5 py-4 text-center text-xs text-zinc-500">
              Todas as ações estão ocultas. Clique em <span className="text-zinc-300 font-bold">{hidden.length} oculta{hidden.length > 1 ? 's' : ''}</span> para as ver.
            </div>
          )}
        </>
      )}
    </div>
  );
}
