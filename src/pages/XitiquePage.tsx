import { useState, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useXitique } from '../context/XitiqueContext';
import { useAuth } from '../context/AuthContext';
import type { EstadoGrupo, EstadoMembroXitique, InscricaoXitique, GrupoXitique } from '../types/xitique';

function gerarSenha(): string {
  return 'Xitique' + Math.floor(1000 + Math.random() * 9000);
}

interface Credencial {
  nome: string;
  utilizador: string;
  email: string;
  senha: string;
}

type Tab = 'grupo' | 'espera' | 'clientes';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MT';

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
  Aceite:   'bg-amber-400/5 border-amber-400/20',
  Sorteado: 'bg-emerald-400/5 border-emerald-400/20',
};

const estadoMembroText: Record<EstadoMembroXitique, { label: string; className: string }> = {
  Pendente: { label: 'Pendente', className: 'text-white' },
  Aceite:   { label: 'Aceite',   className: 'text-amber-400' },
  Sorteado: { label: 'Sorteado', className: 'text-emerald-400' },
};

// ── Painel de gestão de um grupo ─────────────────────────────────────────────
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtDataPt(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d} ${MESES_PT[parseInt(m, 10) - 1]} ${y}`;
}

function GrupoPanel({ grupo, onBack }: { grupo: GrupoXitique; onBack: () => void }) {
  const { addMembro, removeMembro, confirmarPagamento, realizarSorteio, reiniciarGrupo, definirDataInicio, inscricoes, aprovarInscricao, rejeitarInscricao } = useXitique();
  const { allUsers, addUser, updateUser } = useAuth();

  const [tab,           setTab]           = useState<Tab>('grupo');
  const [novoNome,      setNovoNome]      = useState('');
  const [vencedorFlash, setVencedorFlash] = useState<string | null>(null);
  const [confirmRein,   setConfirmRein]   = useState(false);
  const [credencial,    setCredencial]    = useState<Credencial | null>(null);
  const [copiado,       setCopiado]       = useState<string | null>(null);
  const [docPanelUser,  setDocPanelUser]  = useState<string | null>(null);
  const [docOp,         setDocOp]         = useState<'aluguer' | 'compra'>('aluguer');
  const [confirmando,   setConfirmando]   = useState<string | null>(null);
  const [metodoTemp,    setMetodoTemp]    = useState('');
  const [refTemp,       setRefTemp]       = useState('');
  const [editandoData,  setEditandoData]  = useState(false);
  const [dataTemp,      setDataTemp]      = useState(grupo.dataInicio ?? '');

  const { membros, sorteios, estadoGrupo, mesAtual, quotaMT, premioMT, maxMembros } = grupo;

  const inscricoesGrupo = inscricoes.filter(i => i.grupoId === grupo.id);
  const pendentes        = inscricoesGrupo.filter(i => i.status === 'aguarda_validacao');
  const membrosElegiveis = membros.filter(m => m.estado !== 'Sorteado');
  const todosPagaram     = membros.length === maxMembros && membros.every(m => m.pagamentoMes);
  const totalPagoMes     = membros.filter(m => m.pagamentoMes).length * quotaMT;
  const membrosRestantes = membrosElegiveis.length;
  const porConfirmar     = membros.filter(m => !m.pagamentoMes).length;

  const xitiqueUsers = useMemo(() => allUsers.filter(u => u.xitique), [allUsers]);

  const handleAddMembro = () => {
    if (!novoNome.trim()) return;
    addMembro(grupo.id, novoNome);
    setNovoNome('');
  };

  const handleSortear = () => {
    const nome = realizarSorteio(grupo.id);
    if (nome) { setVencedorFlash(nome); setTimeout(() => setVencedorFlash(null), 5000); }
  };

  const fallbackCopy = (texto: string) => {
    const el = document.createElement('textarea');
    el.value = texto; el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
  };

  const copiar = (texto: string, chave: string) => {
    navigator.clipboard?.writeText(texto).catch(() => fallbackCopy(texto)) ?? fallbackCopy(texto);
    setCopiado(chave); setTimeout(() => setCopiado(null), 2000);
  };

  const copiarTudo = (c: Credencial) => {
    const msg = `🔑 Acesso Xitique — SOS Motors\nNome: ${c.nome}\nUtilizador: ${c.utilizador}\nEmail de login: ${c.email}\nSenha temporária: ${c.senha}\n\nAceda em: ${window.location.origin}`;
    navigator.clipboard?.writeText(msg).catch(() => fallbackCopy(msg)) ?? fallbackCopy(msg);
    setCopiado('tudo'); setTimeout(() => setCopiado(null), 2500);
  };

  const handleAprovar = (insc: InscricaoXitique) => {
    const existente = allUsers.find(u => u.email === insc.email || u.telefone === insc.telefone);
    if (existente) {
      // Utilizador já tem conta — apenas marcar como xitique e aprovar
      updateUser(existente.id, { status: 'ativo', xitique: true });
      aprovarInscricao(insc.id, existente.id);
      // Sem modal de credenciais — já tem acesso
    } else {
      // Novo utilizador — criar conta e mostrar credenciais
      const senha = gerarSenha();
      const utilizador = insc.telefone.replace(/\D/g, '').replace(/^258/, '');
      const novoUser = addUser({ nome: insc.nome, email: insc.email, telefone: insc.telefone, role: 'cliente', status: 'ativo', regularity: 'regular', restriction: 'nenhuma', password: senha, mustChangePassword: true, xitique: true });
      aprovarInscricao(insc.id, novoUser.id);
      setCredencial({ nome: insc.nome, utilizador, email: insc.email, senha });
    }
  };

  const grupoCompleto = membros.length >= maxMembros || estadoGrupo !== 'Aberto';

  return (
    <div className="space-y-6">
      {/* Header do grupo */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white hover:text-white text-xs font-bold transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Grupos
          </button>
          <span className="text-zinc-700">·</span>
          <div>
            <h1 className="text-2xl font-black text-white">{grupo.nome}</h1>
            <p className="text-white text-sm mt-0.5">{maxMembros} membros · {fmt(quotaMT)}/mês · Prémio {fmt(premioMT)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${estadoStyle[estadoGrupo]}`}>{estadoLabel[estadoGrupo]}</span>
          {estadoGrupo === 'EmAndamento' && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-white">Mês {mesAtual} / {maxMembros}</span>
          )}
          {/* Data de início */}
          {!editandoData && (
            <button
              onClick={() => { setDataTemp(grupo.dataInicio ?? ''); setEditandoData(true); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-white hover:border-amber-500/50 hover:text-amber-400 transition"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {grupo.dataInicio ? fmtDataPt(grupo.dataInicio) : 'Definir data início'}
            </button>
          )}
          {editandoData && (
            <div className="flex items-center gap-2">
              <input type="date" value={dataTemp} onChange={e => setDataTemp(e.target.value)}
                className="text-xs bg-zinc-800 border border-amber-500/50 rounded-lg px-3 py-1.5 text-white outline-none [color-scheme:dark]" />
              <button
                onClick={() => { if (dataTemp) definirDataInicio(grupo.id, dataTemp); setEditandoData(false); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition"
              >Guardar</button>
              <button onClick={() => setEditandoData(false)} className="text-xs text-white hover:text-white transition">✕</button>
            </div>
          )}
          {estadoGrupo === 'Concluido' && (
            <button onClick={() => setConfirmRein(true)} className="text-xs font-bold px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition">
              Reiniciar Grupo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {([
          { key: 'grupo',    label: 'Grupo',                                                                                         urgent: false },
          { key: 'espera',   label: `Lista de Espera${pendentes.length > 0 ? ` (${pendentes.length})` : ''}`,                       urgent: pendentes.length > 0 },
          { key: 'clientes', label: `Clientes${xitiqueUsers.length > 0 ? ` (${xitiqueUsers.length})` : ''}`,                        urgent: false },
        ] as { key: Tab; label: string; urgent: boolean }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition ${
              tab === t.key
                ? 'border-amber-500 text-amber-400'
                : t.urgent
                ? 'border-transparent text-red-400 animate-pulse hover:text-red-300'
                : 'border-transparent text-white hover:text-white'
            }`}>
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

      {/* TAB: Lista de Espera */}
      {tab === 'espera' && (
        <div className="space-y-3">
          {grupoCompleto && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#f87171"/></svg>
              <div>
                <p className="text-red-400 font-black text-sm uppercase tracking-wide">Grupo Completo — {maxMembros}/{maxMembros} membros</p>
                <p className="text-white text-xs mt-1 leading-relaxed">O grupo já atingiu o limite. Novas inscrições não podem ser aprovadas para este ciclo.</p>
              </div>
            </div>
          )}
          {inscricoesGrupo.length === 0 && (
            <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">Nenhuma inscrição recebida para este grupo.</div>
          )}
          {inscricoesGrupo.map(insc => (
            <div key={insc.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl border transition ${
              insc.status === 'aprovado' ? 'bg-emerald-400/5 border-emerald-400/20' : insc.status === 'rejeitado' ? 'bg-zinc-800/30 border-zinc-700/50 opacity-60' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{insc.nome}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    insc.status === 'aprovado' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                    insc.status === 'rejeitado' ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                  }`}>
                    {insc.status === 'aguarda_validacao' ? 'Pendente' : insc.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                  </span>
                </div>
                <div className="text-xs text-white">{insc.telefone} · {insc.email}</div>
                <div className="text-[10px] text-white">{insc.dataCriacao}</div>
              </div>
              {insc.status === 'aguarda_validacao' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleAprovar(insc)} disabled={grupoCompleto}
                    className="text-xs font-bold px-3 py-2 rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20">
                    ✓ Aprovar
                  </button>
                  <button onClick={() => rejeitarInscricao(insc.id)}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition">
                    ✗ Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB: Grupo */}
      {tab === 'grupo' && <>

        {/* Alerta: grupo completo sem data de início definida */}
        {membros.length >= maxMembros && !grupo.dataInicio && (
          <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 animate-pulse"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#fbbf24"/></svg>
            <div className="flex-1 min-w-0">
              <p className="text-amber-400 font-black text-sm uppercase tracking-wide">Grupo Completo — Defina a Data de Início</p>
              <p className="text-white text-xs mt-1 leading-relaxed">
                O grupo atingiu {maxMembros}/{maxMembros} membros. Defina a data de início do ciclo para que os membros saibam quando efectuar o primeiro pagamento.
              </p>
              <button
                onClick={() => { setDataTemp(''); setEditandoData(true); }}
                className="mt-3 text-xs font-black px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 transition"
              >
                Definir Data de Início
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Membros',          value: `${membros.length} / ${maxMembros}` },
            { label: 'Pagamentos mês',   value: `${membros.filter(m => m.pagamentoMes).length} / ${membros.length}` },
            { label: 'Total arrecadado', value: fmt(totalPagoMes) },
            { label: 'Ainda p/ sortear', value: String(membrosRestantes) },
          ].map(m => (
            <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-white mb-1">{m.label}</div>
              <div className="text-lg font-black text-white">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Membros */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-base uppercase tracking-wider">Membros</h2>
              <span className="text-xs text-white">{membros.length} / {maxMembros}</span>
            </div>
            {estadoGrupo === 'Aberto' && (
              <div className="flex gap-2">
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMembro()}
                  placeholder={membros.length >= maxMembros ? 'Grupo completo' : 'Nome do membro…'}
                  disabled={membros.length >= maxMembros}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-white outline-none focus:border-amber-500 transition disabled:opacity-40 disabled:cursor-not-allowed" />
                <button onClick={handleAddMembro} disabled={!novoNome.trim() || membros.length >= maxMembros}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Adicionar
                </button>
              </div>
            )}
            <div className="space-y-2">
              {membros.length === 0 && (
                <div className="text-center text-white text-sm py-10 bg-zinc-900 rounded-2xl border border-zinc-800">Nenhum membro adicionado ainda.</div>
              )}
              {membros.map((m, i) => {
                const estado = estadoMembroText[m.estado];
                const isConfirmando = confirmando === m.id;
                const registoPago = m.pagamentos?.[mesAtual];
                return (
                  <div key={m.id} className={`rounded-2xl border transition ${estadoMembroStyle[m.estado]}`}>
                    {/* ── Linha principal ── */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{m.nome}</div>
                          <div className={`text-xs mt-0.5 ${estado.className}`}>{estado.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {estadoGrupo === 'EmAndamento' && !m.pagamentoMes && !isConfirmando && (
                          <button
                            onClick={() => { setConfirmando(m.id); setMetodoTemp(''); setRefTemp(''); }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-400/20 hover:bg-amber-500/20 transition">
                            Confirmar {fmt(quotaMT)}
                          </button>
                        )}
                        {estadoGrupo === 'EmAndamento' && !m.pagamentoMes && isConfirmando && (
                          <button onClick={() => setConfirmando(null)} className="text-xs text-white hover:text-white transition px-2 py-1 rounded-lg hover:bg-zinc-700">
                            Cancelar
                          </button>
                        )}
                        {estadoGrupo === 'EmAndamento' && m.pagamentoMes && (
                          <div className="text-right">
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Pago
                            </span>
                            {registoPago && (
                              <span className="text-[10px] text-white block mt-0.5">{registoPago.metodo}</span>
                            )}
                          </div>
                        )}
                        {estadoGrupo === 'Aberto' && (
                          <button onClick={() => removeMembro(grupo.id, m.id)} className="text-white hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Formulário de confirmação de pagamento ── */}
                    {isConfirmando && (
                      <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 space-y-3">
                        <p className="text-[10px] text-white uppercase font-black tracking-widest pt-1">Forma de Pagamento</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['M-Pesa', 'e-Mola', 'Transferência', 'Numerário', 'Outro'].map(op => (
                            <button key={op} onClick={() => setMetodoTemp(op)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                                metodoTemp === op
                                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                                  : 'bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500'
                              }`}>{op}</button>
                          ))}
                        </div>
                        <div>
                          <p className="text-[10px] text-white uppercase font-black tracking-widest mb-1.5">
                            Referência <span className="text-white font-medium normal-case">(opcional)</span>
                          </p>
                          <input
                            value={refTemp}
                            onChange={e => setRefTemp(e.target.value)}
                            placeholder="N.º transação, ref. bancária…"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white outline-none focus:border-amber-500 transition"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!metodoTemp) return;
                            confirmarPagamento(grupo.id, m.id, metodoTemp, refTemp.trim() || undefined);
                            setConfirmando(null); setMetodoTemp(''); setRefTemp('');
                          }}
                          disabled={!metodoTemp}
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Confirmar Pagamento
                        </button>
                      </div>
                    )}

                    {/* ── Detalhe do pagamento já registado ── */}
                    {registoPago && m.pagamentoMes && (
                      <div className="px-4 pb-3 border-t border-zinc-800/40 pt-2 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span className="text-[10px] text-white">Método: <span className="text-white font-bold">{registoPago.metodo}</span></span>
                        {registoPago.referencia && <span className="text-[10px] text-white">Ref: <span className="text-white font-mono">{registoPago.referencia}</span></span>}
                        <span className="text-[10px] text-white">Data: <span className="text-white">{registoPago.data}</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sorteio + Histórico */}
          <div className="lg:col-span-2 space-y-4">
            {estadoGrupo === 'EmAndamento' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-4">
                <div className="text-xs text-white uppercase tracking-widest font-bold">Sorteio do Mês {mesAtual}</div>
                <div className="text-3xl font-black text-white">{fmt(premioMT)}</div>
                <p className="text-xs text-white">
                  {todosPagaram ? `${membrosRestantes} membro${membrosRestantes !== 1 ? 's' : ''} elegível${membrosRestantes !== 1 ? 'is' : ''}` : `Aguarda ${porConfirmar} pagamento(s)`}
                </p>
                <button onClick={handleSortear} disabled={!todosPagaram}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition ${todosPagaram ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.98]' : 'bg-zinc-800 text-white cursor-not-allowed'}`}>
                  Realizar Sorteio
                </button>
              </div>
            )}
            {vencedorFlash && (
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-5 text-center animate-pulse">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Contemplado</div>
                <div className="text-xl font-black text-white">{vencedorFlash}</div>
                <div className="text-sm text-emerald-400 mt-1">{fmt(premioMT)}</div>
              </div>
            )}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-white font-black text-sm uppercase tracking-wider mb-3">Histórico de Sorteios</h3>
              {sorteios.length === 0 ? (
                <p className="text-white text-xs text-center py-4">Nenhum sorteio realizado.</p>
              ) : (
                <div className="space-y-2">
                  {[...sorteios].reverse().map(s => (
                    <div key={s.mes} className="flex items-center justify-between gap-2 bg-zinc-800/50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">{s.mes}</span>
                        <span className="text-sm text-white font-semibold truncate">{s.vencedor}</span>
                      </div>
                      <span className="text-xs text-amber-400 font-bold shrink-0">{fmt(s.valorPremio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {estadoGrupo === 'Concluido' && (
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-4 text-center">
                <div className="text-emerald-400 font-black text-sm uppercase tracking-wider mb-1">Ciclo Concluído</div>
                <p className="text-white text-xs">Total distribuído: {fmt(premioMT * maxMembros)}.</p>
              </div>
            )}
          </div>
        </div>
      </>}

      {/* TAB: Clientes Xitique */}
      {tab === 'clientes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-black text-base uppercase tracking-wider">Clientes Xitique</h2>
            <span className="text-xs text-white">{xitiqueUsers.length} registado(s)</span>
          </div>
          {xitiqueUsers.length === 0 && (
            <div className="text-center text-white text-sm py-12 bg-zinc-900 rounded-2xl border border-zinc-800">Nenhum cliente Xitique registado.</div>
          )}
          {xitiqueUsers.map(u => {
            const membro = membros.find(m => (u.id && m.userId === u.id) || m.nome.toLowerCase().trim() === u.nome.toLowerCase().trim());
            const sorteioGanho = membro?.estado === 'Sorteado' ? sorteios.find(s => s.vencedor === membro.nome) : null;
            return (
              <div key={u.id} className={`rounded-2xl border p-5 space-y-3 transition ${
                membro?.estado === 'Sorteado' ? 'bg-emerald-400/5 border-emerald-400/20' :
                membro?.estado === 'Aceite'   ? 'bg-amber-400/5 border-amber-400/20' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">{u.nome}</span>
                      {membro && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          membro.estado === 'Sorteado' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                          membro.estado === 'Aceite'   ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-zinc-700 text-white border-zinc-600'
                        }`}>{membro.estado}</span>
                      )}
                    </div>
                    <div className="text-xs text-white mt-0.5">{u.telefone} · {u.email}</div>
                  </div>
                  {membro && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-white uppercase tracking-wider">Meses pagos</div>
                      <div className="text-lg font-black text-amber-400">{membro.mesesPagos.length} <span className="text-white text-sm font-semibold">/ {maxMembros}</span></div>
                    </div>
                  )}
                </div>
                {membro && (
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: maxMembros }, (_, i) => i + 1).map(mes => {
                      const pagou  = membro.mesesPagos.includes(mes);
                      const ganhou = sorteios.find(s => s.mes === mes)?.vencedor === membro.nome;
                      return (
                        <span key={mes} title={pagou ? (ganhou ? `Mês ${mes} — Sorteado` : `Mês ${mes} — Pago`) : `Mês ${mes} — Pendente`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            ganhou ? 'bg-emerald-400 text-zinc-950 border-emerald-400' :
                            pagou  ? 'bg-amber-500/20 text-amber-400 border-amber-400/30' :
                            mes <= mesAtual ? 'bg-red-400/10 text-red-400 border-red-400/20' : 'bg-zinc-800 text-white border-zinc-700'
                          }`}>{mes}</span>
                      );
                    })}
                  </div>
                )}
                {sorteioGanho && (
                  <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400">🏆 Contemplado — Mês {sorteioGanho.mes}</span>
                    <span className="text-sm font-black text-amber-400">{fmt(sorteioGanho.valorPremio)}</span>
                  </div>
                )}
                {membro && (
                  <div className="flex justify-between text-xs border-t border-zinc-800/60 pt-2.5">
                    <span className="text-white">Total pago ao grupo</span>
                    <span className="text-white font-black">{fmt(membro.mesesPagos.length * quotaMT)}</span>
                  </div>
                )}

                {/* ── Documentos para Operação ── */}
                {(() => {
                  const isDocOpen = docPanelUser === u.id;
                  const docs = u.documentos ?? {};

                  const docsAluguer = [
                    { key: 'bi' as const,            label: 'Bilhete de Identidade (BI)' },
                    { key: 'carta_conducao' as const, label: 'Carta de Condução' },
                  ];

                  const docsCompra = [
                    { key: 'bi' as const,                     label: 'Bilhete de Identidade (BI)' },
                    { key: 'nuit' as const,                   label: 'NUIT' },
                    { key: 'declaracao_rendimento' as const,   label: 'Declaração de Rendimento' },
                    ...(!u.category || u.category === 'func_publico' || u.category === 'func_privado'
                      ? [{ key: 'contrato_trabalho' as const,  label: 'Contrato de Trabalho' }]
                      : []),
                    ...(!u.category || u.category === 'empreendedor'
                      ? [{ key: 'declaracao_bairro' as const,  label: 'Declaração de Bairro' }]
                      : []),
                  ];

                  const docList = docOp === 'aluguer' ? docsAluguer : docsCompra;
                  const complete = docList.filter(d => !!u.documentos?.[d.key]).length;
                  const total    = docList.length;
                  const allOk   = complete === total;

                  const categoryLabel =
                    u.category === 'func_publico'  ? 'Funcionário Público'  :
                    u.category === 'func_privado'   ? 'Funcionário Privado'  :
                    u.category === 'empreendedor'   ? 'Empreendedor'         : null;

                  return (
                    <div className="border-t border-zinc-800/60 pt-2.5">
                      <button
                        onClick={() => setDocPanelUser(isDocOpen ? null : u.id)}
                        className="w-full flex items-center justify-between gap-2 text-xs transition"
                      >
                        <span className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={12} strokeWidth={2.5} className="text-amber-500" />
                          Documentos para Operação
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                            allOk
                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                              : complete > 0
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                              : 'bg-red-400/10 text-red-400 border-red-400/20'
                          }`}>{complete}/{total}</span>
                          {isDocOpen
                            ? <ChevronUp size={13} className="text-white" />
                            : <ChevronDown size={13} className="text-white" />}
                        </div>
                      </button>

                      {isDocOpen && (
                        <div className="mt-3 space-y-3">
                          {/* Operation type tabs */}
                          <div className="flex gap-1 bg-zinc-800/60 p-1 rounded-xl">
                            {(['aluguer', 'compra'] as const).map(op => (
                              <button
                                key={op}
                                onClick={() => setDocOp(op)}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition ${
                                  docOp === op ? 'bg-amber-500 text-zinc-950' : 'text-white hover:text-white'
                                }`}
                              >{op}</button>
                            ))}
                          </div>

                          {categoryLabel && (
                            <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">
                              Perfil: {categoryLabel}
                            </div>
                          )}

                          {/* Document checklist */}
                          <div className="space-y-1.5">
                            {docList.map(doc => {
                              const hasDoc = !!u.documentos?.[doc.key];
                              return (
                                <button
                                  key={doc.key}
                                  onClick={() => updateUser(u.id, {
                                    documentos: { ...docs, [doc.key]: !hasDoc },
                                  })}
                                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition text-left ${
                                    hasDoc
                                      ? 'bg-emerald-400/5 border-emerald-400/20 hover:bg-emerald-400/10'
                                      : 'bg-zinc-800/50 border-zinc-700 hover:border-amber-500/30'
                                  }`}
                                >
                                  <span className="text-xs font-bold text-white">{doc.label}</span>
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                                    hasDoc ? 'bg-emerald-400 border-emerald-400' : 'bg-zinc-800 border-zinc-600'
                                  }`}>
                                    {hasDoc && (
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Status summary */}
                          {allOk ? (
                            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2 flex items-center gap-2">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              <span className="text-xs text-emerald-400 font-black">Documentação completa — pode prosseguir para {docOp}.</span>
                            </div>
                          ) : (
                            <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-3 py-2 text-xs text-red-400 font-bold">
                              Faltam {total - complete} documento(s) obrigatório(s) para {docOp}.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Credenciais */}
      {credencial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setCredencial(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Acesso Criado</div>
                  <div className="text-white font-black text-sm">{credencial.nome}</div>
                </div>
              </div>
              <button onClick={() => setCredencial(null)} className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:text-white transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#d8a020"/></svg>
                <p className="text-xs text-amber-300 leading-relaxed">Copie estes dados e envie ao cliente via <strong>WhatsApp ou SMS</strong>.</p>
              </div>
              {[
                { chave: 'utilizador', label: 'Utilizador (Telemóvel)', valor: credencial.utilizador },
                { chave: 'email',      label: 'Email de login',         valor: credencial.email },
                { chave: 'senha',      label: 'Senha Temporária',       valor: credencial.senha },
              ].map(row => (
                <div key={row.chave} className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                  <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-1">{row.label}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-black text-sm ${row.chave === 'senha' ? 'text-amber-400 tracking-wider' : 'text-white'}`}>{row.valor}</span>
                    <button onClick={() => copiar(row.valor, row.chave)}
                      className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition ${copiado === row.chave ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-zinc-700 text-white hover:bg-zinc-600'}`}>
                      {copiado === row.chave ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => copiarTudo(credencial)}
                className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition ${copiado === 'tudo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}>
                {copiado === 'tudo' ? '✓ Mensagem Copiada!' : '📋 Copiar Mensagem Completa'}
              </button>
              <button onClick={() => setCredencial(null)} className="w-full py-2.5 rounded-2xl bg-zinc-800 text-white text-sm font-bold hover:bg-zinc-700 transition">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reinício */}
      {confirmRein && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmRein(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="text-white font-black text-lg mb-2">Reiniciar "{grupo.nome}"?</h3>
            <p className="text-white text-sm mb-5">Todo o histórico e membros serão eliminados. Esta acção é irreversível.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRein(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition">Cancelar</button>
              <button onClick={() => { reiniciarGrupo(grupo.id); setConfirmRein(false); setVencedorFlash(null); }}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-400 transition">Reiniciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal criar grupo ─────────────────────────────────────────────────────────
function CriarGrupoModal({ onClose, onCriar }: { onClose: () => void; onCriar: (nome: string, max: number, quota: number, dataInicio?: string) => void }) {
  const [nome,       setNome]       = useState('');
  const [max,        setMax]        = useState(10);
  const [quota,      setQuota]      = useState(30000);
  const [quotaStr,   setQuotaStr]   = useState('30.000');
  const [dataInicio, setDataInicio] = useState('');

  const handleQuotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) { setQuotaStr(''); setQuota(0); return; }
    const num = parseInt(digits, 10);
    setQuota(num);
    setQuotaStr(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="text-white font-black text-lg">Novo Grupo Xitique</h3>

        <div>
          <label className="text-xs text-white font-bold uppercase tracking-wider block mb-1.5">Nome do Grupo</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Grupo B"
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-sm text-white placeholder:text-white outline-none focus:border-amber-500 transition" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white font-bold uppercase tracking-wider block mb-1.5">Nº Membros</label>
            <input type="number" min={2} max={50} value={max} onChange={e => { const v = Number(e.target.value); setMax(v); setQuota(q => q); }}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-sm text-white outline-none focus:border-amber-500 transition" />
          </div>
          <div>
            <label className="text-xs text-white font-bold uppercase tracking-wider block mb-1.5">Quota (MT/mês)</label>
            <div className="relative">
              <input
                inputMode="numeric"
                value={quotaStr}
                onChange={handleQuotaChange}
                placeholder="Ex: 30.000"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 pl-4 pr-10 py-3 text-sm text-white placeholder:text-white outline-none focus:border-amber-500 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400 pointer-events-none">MT</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-xs text-white">
          Prémio mensal: <span className="text-amber-400 font-black">{Math.round(max * quota).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} MT</span>
        </div>

        <div>
          <label className="text-xs text-white font-bold uppercase tracking-wider block mb-1.5">Data de Início (opcional)</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-sm text-white outline-none focus:border-amber-500 transition [color-scheme:dark]" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition">Cancelar</button>
          <button
            onClick={() => { if (quota <= 0) return; onCriar(nome, max, quota, dataInicio || undefined); onClose(); }}
            disabled={quota <= 0}
            className="flex-1 py-3 rounded-2xl bg-amber-500 text-zinc-950 font-black hover:bg-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Criar Grupo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function XitiquePage({ onExit }: { onExit?: () => void }) {
  const { grupos, inscricoes, criarGrupo } = useXitique();
  const [grupoSelId,   setGrupoSelId]   = useState<string | null>(null);
  const [showCriar,    setShowCriar]    = useState(false);

  const grupoSel = grupos.find(g => g.id === grupoSelId) ?? null;
  const totalPendentes = inscricoes.filter(i => i.status === 'aguarda_validacao').length;

  if (grupoSel) {
    return (
      <div className="bg-zinc-950">
        <div className="w-full px-5 sm:px-8 py-8 space-y-8">
          <GrupoPanel grupo={grupoSel} onBack={() => setGrupoSelId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950">
      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Grupos Xitique</h1>
            <p className="text-white text-sm mt-1">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {totalPendentes > 0 ? `${totalPendentes} inscrição(ões) pendente(s)` : 'sem inscrições pendentes'}</p>
          </div>
          <button onClick={() => setShowCriar(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Grupo
          </button>
        </div>

        {/* Lista de grupos */}
        {grupos.length === 0 ? (
          <div className="text-center text-white text-sm py-16 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed space-y-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p>Nenhum grupo criado. Comece por criar o primeiro grupo.</p>
            <button onClick={() => setShowCriar(true)} className="px-6 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm hover:bg-amber-400 transition">
              Criar Primeiro Grupo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grupos.map(g => {
              const pct = g.maxMembros > 0 ? (g.membros.length / g.maxMembros) * 100 : 0;
              const pendentesGrupo = inscricoes.filter(i => i.grupoId === g.id && i.status === 'aguarda_validacao').length;
              return (
                <button key={g.id} onClick={() => setGrupoSelId(g.id)}
                  className="text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 transition-all hover:bg-zinc-800/60 group space-y-4">

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-black text-base group-hover:text-amber-400 transition-colors">{g.nome}</p>
                      <span className={`mt-1 inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${estadoStyle[g.estadoGrupo]}`}>
                        {estadoLabel[g.estadoGrupo]}
                        {g.estadoGrupo === 'EmAndamento' && ` · Mês ${g.mesAtual}/${g.maxMembros}`}
                      </span>
                    </div>
                    {pendentesGrupo > 0 && (
                      <span className="bg-amber-500 text-zinc-950 text-[10px] font-black rounded-full px-2 py-0.5 shrink-0">
                        {pendentesGrupo} pendente{pendentesGrupo !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">Membros</span>
                      <span className="text-white font-bold">{g.membros.length} / {g.maxMembros}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${g.estadoGrupo === 'Concluido' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-zinc-800/60 rounded-xl px-3 py-2">
                      <p className="text-white mb-0.5">Quota</p>
                      <p className="text-amber-400 font-black">{fmt(g.quotaMT)}</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-xl px-3 py-2">
                      <p className="text-white mb-0.5">Prémio</p>
                      <p className="text-white font-black">{fmt(g.premioMT)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white pt-1 border-t border-zinc-800">
                    <span>{g.sorteios.length} sorteio{g.sorteios.length !== 1 ? 's' : ''} realizados</span>
                    <span className="group-hover:text-amber-400 font-bold transition-colors">Gerir →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCriar && <CriarGrupoModal onClose={() => setShowCriar(false)} onCriar={criarGrupo} />}
    </div>
  );
}
