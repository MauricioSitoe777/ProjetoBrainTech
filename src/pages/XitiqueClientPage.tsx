import { useAuth } from '../context/AuthContext';
import { useXitique } from '../context/XitiqueContext';
import { BrandLogo } from '../components/BrandLogo';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';

export function XitiqueClientPage({ onExit, embedded }: { onExit?: () => void; embedded?: boolean }) {
  const { user: authUser, logout, allUsers } = useAuth();
  const { grupos, inscricoes } = useXitique();

  const fullUser = allUsers.find(u => u.id === authUser?.id);

  // Encontra o grupo e membro do utilizador
  let grupoDoUser = null;
  let membroDoUser = null;
  for (const g of grupos) {
    const m = g.membros.find(m =>
      (authUser?.id && m.userId === authUser.id) ||
      m.nome.toLowerCase().trim() === authUser?.nome?.toLowerCase().trim()
    );
    if (m) { grupoDoUser = g; membroDoUser = m; break; }
  }

  const matchUser = (i: { email: string; telefone: string }) =>
    i.email === fullUser?.email ||
    (!!fullUser?.telefone && i.telefone.replace(/\D/g, '').endsWith(fullUser.telefone.replace(/\D/g, '').slice(-8)));

  // Inscrição ainda aguarda validação manual (legado)
  const inscricaoPendente = !membroDoUser
    ? inscricoes.find(i => i.status === 'aguarda_validacao' && matchUser(i))
    : undefined;

  // Inscrição rejeitada (grupo cheio ou outro motivo)
  const inscricaoRejeitada = !membroDoUser && !inscricaoPendente
    ? inscricoes.find(i => i.status === 'rejeitado' && matchUser(i))
    : undefined;

  // Grupo da inscrição pendente/rejeitada
  const grupoPendente = inscricaoPendente
    ? grupos.find(g => g.id === inscricaoPendente.grupoId)
    : inscricaoRejeitada
      ? grupos.find(g => g.id === inscricaoRejeitada.grupoId)
      : null;

  const membro       = membroDoUser;
  const grupo        = grupoDoUser;
  const sorteios     = grupo?.sorteios ?? [];
  const estadoGrupo  = grupo?.estadoGrupo ?? 'Aberto';
  const mesAtual     = grupo?.mesAtual ?? 1;
  const quotaMT      = grupo?.quotaMT ?? 0;
  const premioMT     = grupo?.premioMT ?? 0;
  const numMembros   = grupo?.maxMembros ?? 0;

  const sorteioGanho = membro?.estado === 'Sorteado'
    ? sorteios.find(s => s.vencedor === membro.nome)
    : null;

  const estadoCores = {
    Pendente: { bg: 'bg-zinc-800 border-zinc-700',             dot: 'bg-zinc-400',    text: 'text-white'       },
    Aceite:   { bg: 'bg-amber-400/10 border-amber-400/20',     dot: 'bg-amber-400',   text: 'text-amber-400'   },
    Sorteado: { bg: 'bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  };

  const cores = membro ? estadoCores[membro.estado] : null;

  // Calcula mês/ano real de cada posição a partir da data de início do grupo
  const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MESES_ABR  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const getDataMes = (mesNum: number, abreviado = false): string | null => {
    if (!grupo?.dataInicio) return null;
    const d = new Date(grupo.dataInicio + 'T00:00:00');
    d.setMonth(d.getMonth() + mesNum - 1);
    return abreviado
      ? `${MESES_ABR[d.getMonth()]} ${d.getFullYear()}`
      : `${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`;
  };

  return (
    <div className={embedded ? 'text-white' : 'min-h-screen bg-zinc-950 text-white'}>

      {!embedded && (
        <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-auto max-w-[130px] shrink-0" />
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">Xitique</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white hidden sm:block">{authUser?.nome}</span>
              {onExit && (
                <button onClick={onExit} className="text-white hover:text-white text-sm font-medium transition">
                  Voltar
                </button>
              )}
              <div className="w-px h-4 bg-zinc-800" />
              <button onClick={logout} className="text-white hover:text-amber-400 transition text-sm">Sair</button>
            </div>
          </div>
        </nav>
      )}

      <div className={embedded ? 'space-y-5' : 'max-w-2xl mx-auto px-4 py-8 space-y-5'}>

        <div>
          <h1 className="text-2xl font-black text-white">
            Olá, {authUser?.nome?.split(' ')[0]}!
          </h1>
          <p className="text-white text-sm mt-1">
            Aqui pode acompanhar o estado da sua participação no Xitique.
          </p>
        </div>

        {/* Info do grupo (quando é membro) */}
        {grupo && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/20 rounded-2xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-400 font-bold">{grupo.nome}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-white">{numMembros} membros · {fmt(quotaMT)}/mês</span>
          </div>
        )}

        {/* Estado do Grupo */}
        {grupo && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Estado', value: estadoGrupo === 'EmAndamento' ? 'Em Andamento' : estadoGrupo === 'Concluido' ? 'Concluído' : 'Aberto' },
                estadoGrupo === 'Aberto'
                  ? { label: 'Membros', value: `${grupo.membros.length} / ${numMembros}` }
                  : { label: 'Mês Actual', value: `${mesAtual} / ${numMembros}` },
                { label: 'Prémio Mensal', value: fmt(premioMT) },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-3 text-center">
                  <div className="text-[9px] text-white uppercase font-bold tracking-wider mb-1">{s.label}</div>
                  <div className="text-sm font-black text-white leading-tight">{s.value}</div>
                </div>
              ))}
            </div>
            {grupo.dataInicio && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/20 rounded-xl px-4 py-2.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="text-[10px] text-zinc-400">Início do ciclo:</span>
                <span className="text-[10px] font-black text-amber-400">{(() => { const [y,m,d] = grupo.dataInicio!.split('-'); const ms=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${d} ${ms[parseInt(m,10)-1]} ${y}`; })()}</span>
              </div>
            )}
          </div>
        )}

        {/* Caso 1: É membro */}
        {membro && cores && (
          <div className={`rounded-2xl border p-5 space-y-4 ${
            estadoGrupo === 'Aberto' && membro.estado === 'Pendente'
              ? 'bg-zinc-900 border-zinc-800'
              : cores.bg
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  estadoGrupo === 'Aberto' && membro.estado === 'Pendente' ? 'bg-zinc-500' : cores.dot
                } ${estadoGrupo === 'Aberto' && membro.estado === 'Pendente' ? '' : membro.estado !== 'Sorteado' ? 'animate-pulse' : ''}`} />
                <span className={`text-sm font-black uppercase tracking-wide ${
                  estadoGrupo === 'Aberto' && membro.estado === 'Pendente' ? 'text-white' : cores.text
                }`}>
                  {membro.estado === 'Sorteado' ? 'Contemplado 🎉'
                    : membro.estado === 'Aceite' ? 'Pagamento Confirmado'
                    : estadoGrupo === 'Aberto' ? 'Inscrito no Grupo'
                    : 'Pagamento Pendente'}
                </span>
              </div>
              {estadoGrupo === 'EmAndamento' && (
                <span className="text-xs text-white">Mês {mesAtual}</span>
              )}
            </div>

            <p className="text-xs text-white leading-relaxed">
              {membro.estado === 'Pendente' && estadoGrupo === 'Aberto' &&
                `O grupo ainda está a aguardar os restantes ${numMembros - grupo!.membros.length} membros. O ciclo inicia quando o grupo estiver completo.`}
              {membro.estado === 'Pendente' && estadoGrupo === 'EmAndamento' &&
                `Efectue o pagamento de ${fmt(quotaMT)} e aguarde a confirmação do administrador.`}
              {membro.estado === 'Aceite' &&
                `O seu pagamento de ${fmt(quotaMT)} foi confirmado.`}
              {membro.estado === 'Sorteado' &&
                `Parabéns! Foi contemplado e irá receber ${fmt(premioMT)}. O administrador entrará em contacto.`}
            </p>

            {membro.estado === 'Pendente' && estadoGrupo === 'EmAndamento' && (
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


            {/* Progresso visual do ciclo */}
            <div>
              <div className="flex justify-between text-[10px] text-white mb-1.5">
                <span>Progresso do Ciclo</span>
                <span>{sorteios.length} / {numMembros} entregas realizadas</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: numMembros }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full ${
                    i < sorteios.length
                      ? sorteios[i].vencedor === membro.nome ? 'bg-emerald-400' : 'bg-amber-500'
                      : 'bg-zinc-700'
                  }`} />
                ))}
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

        {/* Caso 2a: Inscrição pendente (legado — validação manual) */}
        {!membro && inscricaoPendente && (
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 font-black text-sm uppercase tracking-wide">Inscrição em Análise</span>
            </div>
            <p className="text-xs text-white leading-relaxed">
              A sua inscrição foi recebida e está a aguardar validação pelo administrador.
              Assim que for confirmada, será adicionado ao grupo.
            </p>
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white">Nome</span>
                <span className="text-white font-semibold">{inscricaoPendente.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Telemóvel</span>
                <span className="text-white">{inscricaoPendente.telefone}</span>
              </div>
              {grupoPendente && (
                <div className="flex justify-between">
                  <span className="text-white">Grupo</span>
                  <span className="text-amber-400 font-bold">{grupoPendente.nome}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white">Estado</span>
                <span className="text-amber-400 font-bold">Em análise</span>
              </div>
            </div>
          </div>
        )}

        {/* Caso 2b: Inscrição rejeitada (grupo cheio) */}
        {!membro && inscricaoRejeitada && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div>
                <span className="text-red-400 font-black text-sm uppercase tracking-wide block">Inscrição Recusada</span>
                {grupoPendente && (
                  <span className="text-xs text-zinc-400">{grupoPendente.nome}</span>
                )}
              </div>
            </div>

            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Motivo</p>
              <p className="text-sm text-white font-semibold leading-relaxed">
                {inscricaoRejeitada.motivoRejeicao ?? 'O grupo atingiu o número máximo de membros.'}
              </p>
            </div>

            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">O que fazer?</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Aguarde a abertura de um novo grupo ou contacte o administrador para verificar se existe alguma alternativa disponível.
              </p>
            </div>
          </div>
        )}

        {/* Caso 3: Sem qualquer inscrição */}
        {!membro && !inscricaoPendente && !inscricaoRejeitada && (
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#71717a"/>
              </svg>
            </div>
            <p className="text-white text-sm">Ainda não está associado a nenhum grupo activo.</p>
            <p className="text-white text-xs">Contacte o administrador para mais informações.</p>
          </div>
        )}

        {/* Sequência do ciclo — sempre visível quando o grupo está Em Andamento ou Concluído */}
        {membro && estadoGrupo !== 'Aberto' && (
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-black text-sm uppercase tracking-wider">Sequência de Entregas</h3>

            {/* Ainda sem sequência gerada */}
            {(!grupo?.sequencia || grupo.sequencia.length === 0) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <span className="text-lg shrink-0 mt-0.5">⏳</span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  O sorteio inicial ainda não foi realizado. Assim que o administrador gerar a sequência, poderá ver aqui a ordem e a data aproximada em que irá receber o prémio.
                </p>
              </div>
            )}

            {/* Sequência já gerada */}
            {grupo?.sequencia && grupo.sequencia.length > 0 && (() => {
              const seqIdx      = grupo.sequencia!.findIndex(id => id === membro.id);
              const meuMes      = seqIdx >= 0 ? seqIdx + 1 : 0;
              const jáRecebeu   = membro.estado === 'Sorteado';
              const esteEuMes   = meuMes > 0 && meuMes === mesAtual && estadoGrupo === 'EmAndamento';
              const futuraMinha = meuMes > 0 && !jáRecebeu;
              const dataRecebi  = meuMes > 0 ? getDataMes(meuMes) : null;
              return (
                <>
                  {/* Banner da vez do cliente */}
                  {futuraMinha && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      esteEuMes
                        ? 'bg-amber-400/15 border-amber-400/40'
                        : 'bg-zinc-800/60 border-zinc-700'
                    }`}>
                      <span className="text-2xl shrink-0">{esteEuMes ? '🏆' : '📅'}</span>
                      <div className="space-y-0.5">
                        <div className={`text-sm font-black ${esteEuMes ? 'text-amber-400' : 'text-white'}`}>
                          {esteEuMes
                            ? 'Este mês é o seu!'
                            : dataRecebi
                              ? `Você recebe em ${dataRecebi}`
                              : `Você recebe no Mês ${meuMes}`}
                        </div>
                        <div className="text-xs text-zinc-400">
                          Prémio: <span className="text-amber-400 font-bold">{fmt(premioMT)}</span>
                          {!esteEuMes && <span className="ml-2">· Posição {meuMes} de {numMembros}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista completa */}
                  <div className="space-y-1">
                    {grupo.sequencia!.map((memId, idx) => {
                      const m         = grupo.membros.find(m => m.id === memId);
                      const mesNum    = idx + 1;
                      const feito     = sorteios.some(s => s.mes === mesNum);
                      const atual     = mesNum === mesAtual && estadoGrupo === 'EmAndamento';
                      const euSou     = memId === membro.id;
                      const dataAprox = getDataMes(mesNum, true);
                      return (
                        <div key={memId} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                          euSou && !feito ? 'border-amber-400/30 bg-amber-400/5'    :
                          feito           ? 'border-transparent opacity-40'          :
                          atual           ? 'border-amber-500/20 bg-amber-500/5'    :
                          'border-transparent'
                        }`}>
                          {/* Número do mês */}
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            feito ? 'bg-zinc-700 text-zinc-500'      :
                            atual ? 'bg-amber-500 text-zinc-950'     :
                            'bg-zinc-800 border border-zinc-700 text-zinc-400'
                          }`}>{mesNum}</span>

                          {/* Nome */}
                          <span className={`text-sm flex-1 min-w-0 truncate ${
                            euSou && !feito ? 'font-black text-amber-400' :
                            feito           ? 'text-zinc-500'             :
                            atual           ? 'text-white font-semibold'  :
                            'text-zinc-300'
                          }`}>
                            {euSou ? `${m?.nome ?? 'Você'} (você)` : (m?.nome ?? '—')}
                          </span>

                          {/* Data aproximada (apenas pendentes) */}
                          {dataAprox && !feito && (
                            <span className={`text-[10px] shrink-0 ${
                              euSou ? 'text-amber-400/70 font-bold' : 'text-zinc-600'
                            }`}>{dataAprox}</span>
                          )}

                          {/* Estado */}
                          {feito  && <span className="text-[10px] text-emerald-400 font-bold shrink-0">✓ entregue</span>}
                          {atual && !feito && <span className="text-[10px] text-amber-400 font-bold shrink-0 animate-pulse">← este mês</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Histórico do cliente */}
        {membro && (sorteios.length > 0 || membro.mesesPagos.length > 0) && (
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-3">O Meu Histórico</h3>
            <div className="space-y-2">
              {Array.from({ length: Math.max(sorteios.length, membro.mesesPagos.length, mesAtual - 1) }, (_, i) => i + 1).map(mes => {
                const sorteio = sorteios.find(s => s.mes === mes);
                const pagou   = membro.mesesPagos.includes(mes);
                const ganhou  = sorteio?.vencedor === membro.nome;
                const registo = membro.pagamentos?.[mes];
                return (
                  <div key={mes} className={`rounded-xl overflow-hidden border ${
                    ganhou ? 'border-emerald-400/20' : 'border-transparent'
                  }`}>
                    <div className={`flex items-center justify-between gap-2 px-3 py-2.5 ${
                      ganhou ? 'bg-emerald-400/10' : 'bg-zinc-800/50'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">{mes}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-zinc-400">Mês {mes}</span>
                          {ganhou && <span className="text-xs text-emerald-400 font-black">🏆 Sorteado</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pagou ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Pago</span>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">Pendente</span>
                        )}
                        {ganhou && sorteio && (
                          <span className="text-xs text-amber-400 font-black">{fmt(sorteio.valorPremio)}</span>
                        )}
                      </div>
                    </div>
                    {pagou && registo && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 py-1.5 bg-zinc-900/60 border-t border-zinc-700/40">
                        <span className="text-[10px] text-zinc-400">
                          Via <span className="text-white font-bold">{registo.metodo}</span>
                        </span>
                        {registo.referencia && (
                          <span className="text-[10px] text-zinc-400">
                            Ref: <span className="text-white font-mono">{registo.referencia}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">{registo.data}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-xs">
              <span className="text-zinc-400">Total pago</span>
              <span className="text-white font-black">{fmt(membro.mesesPagos.length * quotaMT)}</span>
            </div>
          </div>
        )}

        {/* Histórico geral de sorteios do grupo */}
        {membro && sorteios.length > 0 && (
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-4">
            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-3">Entregas do {grupo?.nome}</h3>
            <div className="space-y-2">
              {[...sorteios].reverse().map(s => (
                <div key={s.mes} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
                  s.vencedor === membro?.nome ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-zinc-800/50'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">{s.mes}</span>
                    <span className={`text-sm font-semibold truncate ${
                      s.vencedor === membro?.nome ? 'text-emerald-400 font-black' : 'text-white'
                    }`}>
                      {s.vencedor === membro?.nome ? `${s.vencedor} (você)` : s.vencedor}
                    </span>
                  </div>
                  <span className="text-xs text-amber-400 font-bold shrink-0">{fmt(s.valorPremio)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {grupo && (
          <div className="text-center text-white text-xs pb-4">
            Quota mensal: {fmt(quotaMT)} · {grupo.nome} · {numMembros} membros · SOS Motors
          </div>
        )}
      </div>
    </div>
  );
}
