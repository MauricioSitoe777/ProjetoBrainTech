import { useState, useMemo } from 'react';
import { useXitique } from '../context/XitiqueContext';
import { useAuth } from '../context/AuthContext';
import { AdminNav } from '../components/AdminNav';
import type { EstadoGrupo, EstadoMembroXitique, InscricaoXitique } from '../types/xitique';

function gerarSenha(): string {
  return 'Xitique' + Math.floor(1000 + Math.random() * 9000);
}

interface Credencial {
  nome: string;
  utilizador: string; // número de telemóvel
  email: string;
  senha: string;
}

type Tab = 'grupo' | 'espera' | 'clientes';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-PT').format(n) + ' MT';

const estadoStyle: Record<EstadoGrupo, string> = {
  Aberto:      'bg-zinc-700/60 text-white border-zinc-600',
  EmAndamento: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Concluido:   'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

const estadoLabel: Record<EstadoGrupo, string> = {
  Aberto:      'Aberto',
  EmAndamento: 'Em Andamento',
  Concluido:   'Concluído',
};

const estadoMembroStyle: Record<EstadoMembroXitique, string> = {
  Pendente: 'bg-zinc-900 border-zinc-800',
  Aceite: 'bg-amber-400/5 border-amber-400/20',
  Sorteado: 'bg-emerald-400/5 border-emerald-400/20',
};

const estadoMembroText: Record<EstadoMembroXitique, { label: string; description: string; className: string }> = {
  Pendente: {
    label: 'Pendente',
    description: 'O cliente enviou o código da transação e o administrador está a conferir o extrato.',
    className: 'text-white',
  },
  Aceite: {
    label: 'Aceite',
    description: 'O administrador confirmou o dinheiro. Vaga garantida e grupo quase pronto.',
    className: 'text-amber-400',
  },
  Sorteado: {
    label: 'Sorteado',
    description: 'O mês dele chegou e ele ganhou a viatura.',
    className: 'text-emerald-400',
  },
};

export function XitiquePage({ onExit }: { onExit?: () => void }) {
  const {
    membros, sorteios, estadoGrupo, mesAtual,
    quotaMT, premioMT, numMembros,
    addMembro, removeMembro,
    confirmarPagamento, realizarSorteio, reiniciarGrupo,
    inscricoes, aprovarInscricao, rejeitarInscricao,
  } = useXitique();

  const { allUsers, addUser, updateUser } = useAuth();

  const [tab, setTab] = useState<Tab>('grupo');
  const [novoNome, setNovoNome] = useState('');
  const [vencedorFlash, setVencedorFlash] = useState<string | null>(null);
  const [confirmReinicio, setConfirmReinicio] = useState(false);
  const [credencial, setCredencial] = useState<Credencial | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const pendentes = inscricoes.filter(i => i.status === 'aguarda_validacao');

  const membrosElegiveis  = membros.filter(m => m.estado !== 'Sorteado');
  // Todos os membros (incluindo sorteados) devem confirmar o pagamento mensal
  const todosPagaram      = membros.length === numMembros && membros.every(m => m.pagamentoMes === true);
  const totalPagoMes      = membros.filter(m => m.pagamentoMes).length * quotaMT;
  const membrosRestantes  = membrosElegiveis.length;
  const porConfirmar      = membros.filter(m => !m.pagamentoMes).length;

  const xitiqueUsers = useMemo(() => allUsers.filter(u => u.xitique), [allUsers]);

  const handleAddMembro = () => {
    if (!novoNome.trim()) return;
    addMembro(novoNome);
    setNovoNome('');
  };

  const handleSortear = () => {
    const nome = realizarSorteio();
    if (nome) {
      setVencedorFlash(nome);
      setTimeout(() => setVencedorFlash(null), 5000);
    }
  };

  const copiar = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  const copiarTudo = (c: Credencial) => {
    const msg =
      `🔑 Acesso Xitique — SOS Motors\n` +
      `Nome: ${c.nome}\n` +
      `Utilizador: ${c.utilizador}\n` +
      `Email de login: ${c.email}\n` +
      `Senha temporária: ${c.senha}\n\n` +
      `Aceda em: ${window.location.origin}`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiado('tudo');
      setTimeout(() => setCopiado(null), 2500);
    });
  };

  const handleAprovar = (insc: InscricaoXitique) => {
    const senha = gerarSenha();
    const utilizador = insc.telefone.replace(/\D/g, '').replace(/^258/, '');

    // Cria ou actualiza o utilizador e captura o seu ID para ligar ao membro
    const existente = allUsers.find(u => u.email === insc.email);
    let userId: string;
    if (existente) {
      updateUser(existente.id, { password: senha, status: 'ativo', xitique: true });
      userId = existente.id;
    } else {
      const novoUser = addUser({
        nome:        insc.nome,
        email:       insc.email,
        telefone:    insc.telefone,
        role:        'cliente',
        status:      'ativo',
        regularity:  'regular',
        restriction: 'nenhuma',
        password:    senha,
        xitique:     true,
      });
      userId = novoUser.id;
    }

    aprovarInscricao(insc.id, userId);
    setCredencial({ nome: insc.nome, utilizador, email: insc.email, senha });
  };

  const handleReiniciar = () => {
    reiniciarGrupo();
    setConfirmReinicio(false);
    setVencedorFlash(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <AdminNav subtitle="Xitique" onExit={onExit} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header de estado ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Grupo Xitique</h1>
            <p className="text-white text-sm mt-1">
              {numMembros} membros · {fmt(quotaMT)}/mês · Prémio {fmt(premioMT)}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${estadoStyle[estadoGrupo]}`}>
              {estadoLabel[estadoGrupo]}
            </span>
            {estadoGrupo === 'EmAndamento' && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-white">
                Mês {mesAtual} / {numMembros}
              </span>
            )}
            {estadoGrupo === 'Concluido' && (
              <button
                onClick={() => setConfirmReinicio(true)}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition"
              >
                Reiniciar Grupo
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {([
            { key: 'grupo',    label: 'Grupo' },
            { key: 'espera',   label: `Lista de Espera${pendentes.length > 0 ? ` (${pendentes.length})` : ''}` },
            { key: 'clientes', label: `Clientes Xitique${xitiqueUsers.length > 0 ? ` (${xitiqueUsers.length})` : ''}` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-white hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Lista de Espera ── */}
        {tab === 'espera' && (
          <div className="space-y-3">

            {/* Aviso: grupo cheio — ninguém mais pode ser aceite */}
            {(membros.length >= numMembros || estadoGrupo !== 'Aberto') && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.8" fill="#f87171"/>
                </svg>
                <div>
                  <p className="text-red-400 font-black text-sm uppercase tracking-wide">
                    Grupo Completo — {numMembros}/{numMembros} membros
                  </p>
                  <p className="text-white text-xs mt-1 leading-relaxed">
                    O grupo já atingiu o limite de {numMembros} membros. Novas inscrições não podem ser aprovadas para este ciclo.
                    {estadoGrupo === 'Concluido'
                      ? ' O ciclo foi concluído — reinicie o grupo para abrir novas vagas.'
                      : ' Aguarde a conclusão do ciclo actual para iniciar um novo grupo.'}
                  </p>
                </div>
              </div>
            )}

            {inscricoes.length === 0 && (
              <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhuma inscrição recebida ainda.
              </div>
            )}
            {inscricoes.map(insc => (
              <div
                key={insc.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl border transition ${
                  insc.status === 'aprovado'  ? 'bg-emerald-400/5 border-emerald-400/20' :
                  insc.status === 'rejeitado' ? 'bg-zinc-800/30 border-zinc-700/50 opacity-60' :
                  'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{insc.nome}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      insc.status === 'aprovado'  ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                      insc.status === 'rejeitado' ? 'bg-zinc-700 text-white border-zinc-600' :
                      'bg-amber-400/10 text-amber-400 border-amber-400/20'
                    }`}>
                      {insc.status === 'aguarda_validacao' ? 'Pendente' :
                       insc.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  </div>
                  <div className="text-xs text-white">{insc.telefone} · {insc.email}</div>
                  <div className="text-[10px] text-white">{insc.dataCriacao}</div>
                </div>
                {insc.status === 'aguarda_validacao' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAprovar(insc)}
                      disabled={membros.length >= numMembros || estadoGrupo !== 'Aberto'}
                      title={membros.length >= numMembros || estadoGrupo !== 'Aberto' ? 'Grupo cheio — não é possível aceitar mais membros' : ''}
                      className="text-xs font-bold px-3 py-2 rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20 disabled:hover:bg-emerald-400/10"
                    >
                      ✓ Aprovar
                    </button>
                    <button
                      onClick={() => rejeitarInscricao(insc.id)}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition"
                    >
                      ✗ Rejeitar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Grupo ── */}
        {tab === 'grupo' && <>

        {/* ── Métricas rápidas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Membros',         value: `${membros.length} / ${numMembros}` },
            { label: 'Pagamentos mês',  value: `${membros.filter(m => m.pagamentoMes).length} / ${membros.length}` },
            { label: 'Total arrecadado', value: fmt(totalPagoMes) },
            { label: 'Ainda por sortear', value: String(membrosRestantes) },
          ].map(m => (
            <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-white mb-1">{m.label}</div>
              <div className="text-lg font-black text-white">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Coluna esquerda: Membros ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-base uppercase tracking-wider">Membros</h2>
              <span className="text-xs text-white">
                {membros.length} / {numMembros}
              </span>
            </div>

            {/* Formulário adicionar membro — desativado quando grupo cheio ou em andamento */}
            {estadoGrupo === 'Aberto' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMembro()}
                  placeholder={membros.length >= numMembros ? 'Grupo completo — 10 membros atingido' : 'Nome do membro…'}
                  disabled={membros.length >= numMembros}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleAddMembro}
                  disabled={!novoNome.trim() || membros.length >= numMembros}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Adicionar
                </button>
              </div>
            )}

            {/* Lista de membros */}
            <div className="space-y-2">
              {membros.length === 0 && (
                <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-2xl border border-zinc-800">
                  Nenhum membro adicionado ainda.
                </div>
              )}
              {membros.map((m, i) => {
                const estado = estadoMembroText[m.estado];

                return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition ${estadoMembroStyle[m.estado]}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{m.nome}</div>
                      <div className={`text-xs mt-0.5 ${estado.className}`} title={estado.description}>
                        {estado.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {estadoGrupo === 'EmAndamento' && !m.pagamentoMes && (
                      <button
                        onClick={() => confirmarPagamento(m.id)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-400/20 hover:bg-amber-500/20 transition"
                      >
                        Confirmar {fmt(quotaMT)}
                      </button>
                    )}
                    {estadoGrupo === 'EmAndamento' && m.pagamentoMes && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Pago
                      </span>
                    )}
                    {estadoGrupo === 'Aberto' && (
                      <button
                        onClick={() => removeMembro(m.id)}
                        className="text-white hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* ── Coluna direita: Sorteio + Histórico ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Botão Sortear */}
            {estadoGrupo === 'EmAndamento' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-4">
                <div className="text-xs text-white uppercase tracking-widest font-bold">Sorteio do Mês {mesAtual}</div>
                <div className="text-3xl font-black text-white">{fmt(premioMT)}</div>
                <p className="text-xs text-white">
                  {todosPagaram
                    ? `${membrosRestantes} membro${membrosRestantes !== 1 ? 's' : ''} elegível${membrosRestantes !== 1 ? 'is' : ''} para o sorteio`
                    : `Aguarda confirmação de ${porConfirmar} pagamento(s) — incluindo sorteados`}
                </p>
                <button
                  onClick={handleSortear}
                  disabled={!todosPagaram}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition ${
                    todosPagaram
                      ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.98]'
                      : 'bg-zinc-800 text-white cursor-not-allowed'
                  }`}
                >
                  Realizar Sorteio
                </button>
              </div>
            )}

            {/* Flash do vencedor */}
            {vencedorFlash && (
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-5 text-center animate-pulse">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Contemplado</div>
                <div className="text-xl font-black text-white">{vencedorFlash}</div>
                <div className="text-sm text-emerald-400 mt-1">{fmt(premioMT)}</div>
              </div>
            )}

            {/* Histórico */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-white font-black text-sm uppercase tracking-wider mb-3">Histórico de Sorteios</h3>
              {sorteios.length === 0 ? (
                <p className="text-white text-xs text-center py-4">Nenhum sorteio realizado.</p>
              ) : (
                <div className="space-y-2">
                  {[...sorteios].reverse().map((s) => (
                    <div key={s.mes} className="flex items-center justify-between gap-2 bg-zinc-800/50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                          {s.mes}
                        </span>
                        <span className="text-sm text-white font-semibold truncate">{s.vencedor}</span>
                      </div>
                      <span className="text-xs text-amber-400 font-bold shrink-0">{fmt(s.valorPremio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info ciclo */}
            {estadoGrupo === 'Concluido' && (
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-4 text-center">
                <div className="text-emerald-400 font-black text-sm uppercase tracking-wider mb-1">Ciclo Concluído</div>
                <p className="text-white text-xs">
                  Todos os {numMembros} membros foram contemplados.<br />
                  Total distribuído: {fmt(premioMT * numMembros)}.
                </p>
              </div>
            )}
          </div>
        </div>
        </> }

        {/* ── Tab: Clientes Xitique (vista de admin) ── */}
        {tab === 'clientes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-base uppercase tracking-wider">Clientes Xitique</h2>
              <span className="text-xs text-white">{xitiqueUsers.length} cliente(s) registado(s)</span>
            </div>

            {xitiqueUsers.length === 0 && (
              <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
                Nenhum cliente Xitique registado. Aprove inscrições na aba Lista de Espera.
              </div>
            )}

            {xitiqueUsers.map(u => {
              const membro = membros.find(m =>
                (u.id && m.userId === u.id) ||
                m.nome.toLowerCase().trim() === u.nome.toLowerCase().trim()
              );
              const inscricao = inscricoes.find(i => i.email === u.email);
              const sorteioGanho = membro?.estado === 'Sorteado'
                ? sorteios.find(s => s.vencedor === membro.nome)
                : null;

              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border p-5 space-y-3 transition ${
                    membro?.estado === 'Sorteado' ? 'bg-emerald-400/5 border-emerald-400/20' :
                    membro?.estado === 'Aceite'   ? 'bg-amber-400/5 border-amber-400/20' :
                    'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  {/* Cabeçalho do cliente */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">{u.nome}</span>
                        {membro && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            membro.estado === 'Sorteado' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                            membro.estado === 'Aceite'   ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                            'bg-zinc-700 text-white border-zinc-600'
                          }`}>
                            {membro.estado}
                          </span>
                        )}
                        {!membro && inscricao?.status === 'aprovado' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-zinc-700 text-white border-zinc-600">
                            Sem grupo activo
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.status === 'ativo' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                          u.status === 'suspenso' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
                          'bg-zinc-700 text-white border-zinc-600'
                        }`}>
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-xs text-white mt-0.5">{u.telefone} · {u.email}</div>
                    </div>
                    {membro && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white uppercase tracking-wider">Meses pagos</div>
                        <div className="text-lg font-black text-amber-400">{membro.mesesPagos.length} <span className="text-white text-sm font-semibold">/ {numMembros}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Bolhas de meses — só se for membro */}
                  {membro && (
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: numMembros }, (_, i) => i + 1).map(mes => {
                        const pagou = membro.mesesPagos.includes(mes);
                        const ganhou = sorteios.find(s => s.mes === mes)?.vencedor === membro.nome;
                        return (
                          <span
                            key={mes}
                            title={pagou ? (ganhou ? `Mês ${mes} — Sorteado` : `Mês ${mes} — Pago`) : `Mês ${mes} — Pendente`}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                              ganhou
                                ? 'bg-emerald-400 text-zinc-950 border-emerald-400'
                                : pagou
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-400/30'
                                  : mes <= mesAtual
                                    ? 'bg-red-400/10 text-red-400 border-red-400/20'
                                    : 'bg-zinc-800 text-zinc-600 border-zinc-700'
                            }`}
                          >
                            {mes}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Card sorteio ganho */}
                  {sorteioGanho && (
                    <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400">🏆 Contemplado — Mês {sorteioGanho.mes}</span>
                      <span className="text-sm font-black text-amber-400">{fmt(sorteioGanho.valorPremio)}</span>
                    </div>
                  )}

                  {/* Rodapé: total pago */}
                  {membro && (
                    <div className="flex justify-between text-xs border-t border-zinc-800/60 pt-2.5">
                      <span className="text-white">Total pago ao grupo</span>
                      <span className="text-white font-black">{fmt(membro.mesesPagos.length * quotaMT)}</span>
                    </div>
                  )}

                  {/* Sem membro — mostrar info de inscrição */}
                  {!membro && (
                    <div className="text-xs text-white pt-1">
                      Conta criada mas ainda não integrado em nenhum grupo activo.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Modal de Credenciais ── */}
      {credencial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setCredencial(null)} />
          <div
            className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            {/* Brilho verde */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Acesso Criado</div>
                  <div className="text-white font-black text-sm">{credencial.nome}</div>
                </div>
              </div>
              <button
                onClick={() => setCredencial(null)}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:text-white transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-3">
              {/* Aviso */}
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="2" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.8" fill="#d8a020"/>
                </svg>
                <p className="text-xs text-amber-300 leading-relaxed">
                  Copie estes dados e envie ao cliente via <strong>WhatsApp ou SMS</strong>.
                </p>
              </div>

              {/* Linha: Utilizador */}
              {[
                { chave: 'utilizador', label: 'Utilizador (Telemóvel)', valor: credencial.utilizador },
                { chave: 'email',      label: 'Email de login',         valor: credencial.email },
                { chave: 'senha',      label: 'Senha Temporária',       valor: credencial.senha },
              ].map(row => (
                <div key={row.chave} className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                  <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">{row.label}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-black text-sm ${row.chave === 'senha' ? 'text-amber-400 tracking-wider' : 'text-white'}`}>
                      {row.valor}
                    </span>
                    <button
                      onClick={() => copiar(row.valor, row.chave)}
                      className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                        copiado === row.chave
                          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                          : 'bg-zinc-700 text-white hover:bg-zinc-600'
                      }`}
                    >
                      {copiado === row.chave ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Copiar tudo */}
              <button
                onClick={() => copiarTudo(credencial)}
                className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition ${
                  copiado === 'tudo'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20'
                    : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                }`}
              >
                {copiado === 'tudo' ? '✓ Mensagem Copiada!' : '📋 Copiar Mensagem Completa'}
              </button>

              <button
                onClick={() => setCredencial(null)}
                className="w-full py-2.5 rounded-2xl bg-zinc-800 text-white text-sm font-bold hover:bg-zinc-700 hover:text-white transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reinício */}
      {confirmReinicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmReinicio(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="text-white font-black text-lg mb-2">Reiniciar Grupo?</h3>
            <p className="text-white text-sm mb-5">
              Todo o histórico e membros serão eliminados. Esta acção é irreversível.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReinicio(false)}
                className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReiniciar}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-400 transition"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
