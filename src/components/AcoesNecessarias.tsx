import { useMemo } from 'react';
import { useReservations } from '../context/ReservationsContext';
import { useFinance } from '../context/FinanceContext';
import { useVehicles } from '../context/VehiclesContext';
import { useXitique } from '../context/XitiqueContext';
import { useUsers } from '../context/UsersContext';
import { VEHICLES } from '../data/constants';
import { useRoute } from '../hooks/useRoute';

const compraIds = new Set(VEHICLES.filter(v => v.mode === 'compra').map(v => v.id));

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

export function AcoesNecessarias() {
  const { reservations, blocks } = useReservations();
  const { dividas } = useFinance();
  const { vehicles } = useVehicles();
  const { inscricoes, membros } = useXitique();
  const { users } = useUsers();
  const { navigate } = useRoute();

  const acoes = useMemo((): Acao[] => {
    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const items: Acao[] = [];

    // ── ALTA ────────────────────────────────────────────────────────────────

    // Devoluções pendentes — admin tem de registar viatura recebida
    const devolucaoPendente = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'devolucao_pendente'
    ).length;
    if (devolucaoPendente > 0)
      items.push({ label: `${p(devolucaoPendente, 'devolução', 'devoluções')} pendente${devolucaoPendente > 1 ? 's' : ''} — aguarda viatura recebida`, route: '/admin/aluguer', urgency: 'alta' });

    // Alugueres em atraso — activos mas data já passou (sem marcar devolução)
    const emAtraso = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'ativa' && r.dataFim < today
    ).length;
    if (emAtraso > 0)
      items.push({ label: `${p(emAtraso, 'aluguer')} em atraso — viatura${emAtraso > 1 ? 's' : ''} não devolvida${emAtraso > 1 ? 's' : ''}`, route: '/admin/aluguer', urgency: 'alta' });

    // Reservas aluguer a aguardar confirmação
    const pendentes = reservations.filter(r => r.status === 'pendente' && !compraIds.has(r.vehicleId)).length;
    if (pendentes > 0)
      items.push({ label: `${p(pendentes, 'reserva')} aguarda${pendentes === 1 ? '' : 'm'} confirmação`, route: '/admin/aluguer', urgency: 'alta' });

    // Clientes a devolver hoje (activos com dataFim hoje, ainda não marcados)
    const devolvemHoje = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'ativa' && r.dataFim === today
    ).length;
    if (devolvemHoje > 0)
      items.push({ label: `${p(devolvemHoje, 'cliente')} devolve${devolvemHoje === 1 ? '' : 'm'} hoje`, route: '/admin/aluguer', urgency: 'alta' });

    // Compras com prestação em atraso (status directo)
    const compraAtraso = reservations.filter(r => compraIds.has(r.vehicleId) && r.status === 'prestacao_atraso').length;
    if (compraAtraso > 0)
      items.push({ label: `${p(compraAtraso, 'compra')} com prestação em atraso — regularizar urgente`, route: '/admin/compra', urgency: 'alta' });

    // Dívidas vencidas — com maior atraso em dias
    const dividasVencidas = dividas.filter(d => d.dataVencimento && d.dataVencimento < today && d.status !== 'quitado');
    if (dividasVencidas.length > 0) {
      const maxAtraso = dividasVencidas.reduce((max, d) => {
        const dias = Math.floor((Date.now() - new Date(d.dataVencimento!).getTime()) / 86_400_000);
        return dias > max ? dias : max;
      }, 0);
      items.push({ label: `${p(dividasVencidas.length, 'prestação', 'prestações')} atrasada${dividasVencidas.length > 1 ? 's' : ''} (maior atraso: ${maxAtraso} dias)`, route: '/admin/financas', urgency: 'alta' });
    }

    // ── MÉDIA ────────────────────────────────────────────────────────────────

    // Viaturas prontas para levantamento aguardam cliente
    const prontasLevantamento = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'pronta_levantamento'
    ).length;
    if (prontasLevantamento > 0)
      items.push({ label: `${p(prontasLevantamento, 'viatura')} pronta${prontasLevantamento > 1 ? 's' : ''} para levantamento`, route: '/admin/aluguer', urgency: 'media' });

    // Alugueres confirmados que começam hoje mas ainda não marcados como prontos
    const iniciaHoje = reservations.filter(r =>
      !compraIds.has(r.vehicleId) && r.status === 'confirmada' && r.dataInicio === today
    ).length;
    if (iniciaHoje > 0)
      items.push({ label: `${p(iniciaHoje, 'aluguer')} começa${iniciaHoje === 1 ? '' : 'm'} hoje — marcar viatura como pronta`, route: '/admin/aluguer', urgency: 'media' });

    // Prestações/dívidas que vencem amanhã
    const vencemAmanha = dividas.filter(d => d.dataVencimento === tomorrow && d.status !== 'quitado').length;
    if (vencemAmanha > 0)
      items.push({ label: `${p(vencemAmanha, 'prestação', 'prestações')} vence${vencemAmanha === 1 ? '' : 'm'} amanhã`, route: '/admin/financas', urgency: 'media' });

    // Vendas (compra) pendentes por concluir
    const vendasPendentes = reservations.filter(r => compraIds.has(r.vehicleId) && r.status === 'pendente').length;
    if (vendasPendentes > 0)
      items.push({ label: `${p(vendasPendentes, 'venda')} pendente${vendasPendentes > 1 ? 's' : ''} por concluir`, route: '/admin/compra', urgency: 'media' });

    // Compras actualmente em regime de prestações
    const comprasPrestacoes = reservations.filter(r =>
      compraIds.has(r.vehicleId) && r.status === 'em_prestacao'
    ).length;
    if (comprasPrestacoes > 0)
      items.push({ label: `${p(comprasPrestacoes, 'compra')} em regime de prestações`, route: '/admin/compra', urgency: 'media' });

    // Inscrições Xitique por aprovar
    const inscricoesPendentes = inscricoes.filter(i => i.status === 'aguarda_validacao').length;
    if (inscricoesPendentes > 0)
      items.push({ label: `${p(inscricoesPendentes, 'inscrição', 'inscrições')} no Xitique aguarda${inscricoesPendentes === 1 ? '' : 'm'} aprovação`, route: '/admin/xitique', urgency: 'media' });

    // ── INFO ────────────────────────────────────────────────────────────────

    // Membros Xitique sem pagamento no mês corrente
    const semPagamento = membros.filter(m => m.estado === 'Aceite' && !m.pagamentoMes).length;
    if (semPagamento > 0)
      items.push({ label: `${p(semPagamento, 'membro')} Xitique sem pagamento no mês`, route: '/admin/xitique', urgency: 'info' });

    // Utilizadores com conta pendente de activação
    const usersPendentes = users.filter(u => u.status === 'pendente').length;
    if (usersPendentes > 0)
      items.push({ label: `${p(usersPendentes, 'utilizador')} com conta pendente de activação`, route: '/admin', urgency: 'info' });

    // Viaturas em manutenção (bloqueios activos hoje)
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
  }, [reservations, dividas, blocks, vehicles, inscricoes, membros, users]);

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

  const altaCount  = acoes.filter(a => a.urgency === 'alta').length;
  const badgeStyle = altaCount > 0
    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-black text-sm uppercase tracking-wider">Ações Necessárias</h2>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${badgeStyle}`}>
          {acoes.length} item{acoes.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {acoes.map((a, i) => {
          const s = U[a.urgency];
          return (
            <button
              key={i}
              onClick={() => navigate(a.route)}
              className={`w-full flex items-center gap-4 px-5 py-3 transition-colors ${s.bg} text-left group`}
            >
              <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />
              <span className="text-sm shrink-0">{s.icon}</span>
              <span className={`text-sm font-semibold flex-1 ${s.text}`}>{a.label}</span>
              <svg className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
