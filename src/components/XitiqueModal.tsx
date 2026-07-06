import { useRef, useState, useMemo } from 'react';
import { useXitique } from '../context/XitiqueContext';
import { useAuth } from '../context/AuthContext';
import type { GrupoXitique } from '../types/xitique';

type Step = 'grupoSelect' | 'form' | 'otp' | 'sucesso';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';

function gerarOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function XitiqueModal({ onClose }: { onClose: () => void }) {
  const { grupos, adicionarInscricao } = useXitique();
  const { user: authUser, allUsers } = useAuth();

  const fullUser = useMemo(() =>
    authUser ? allUsers.find(u => u.id === authUser.id) : null,
    [authUser, allUsers]
  );

  const telefoneInicial = fullUser?.telefone?.replace(/^\+258\s?/, '').replace(/\D/g, '') ?? '';

  // Available groups: Aberto and not full
  const gruposAbertos = grupos.filter(g => g.estadoGrupo === 'Aberto' && g.membros.length < g.maxMembros);

  const [step,     setStep]     = useState<Step>('grupoSelect');
  const [grupoId,  setGrupoId]  = useState('');
  const [nome,     setNome]     = useState(fullUser?.nome ?? '');
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [email,    setEmail]    = useState(fullUser?.email ?? '');
  const [erro,     setErro]     = useState('');

  const [otpGerado]  = useState(gerarOTP);
  const [digits,   setDigits]   = useState(['', '', '', '', '', '']);
  const inputRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const [otpErro,  setOtpErro]  = useState('');

  const grupoSelecionado: GrupoXitique | undefined = grupos.find(g => g.id === grupoId);

  const handleSelecionarGrupo = (id: string) => {
    setGrupoId(id);
    setStep(fullUser ? 'otp' : 'form');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setErro('Insira o nome completo.'); return; }
    if (!/^\d{8,9}$/.test(telefone.replace(/\s/g, ''))) { setErro('Número inválido — insira 8 ou 9 dígitos sem o prefixo +258.'); return; }
    if (!email.includes('@') || !email.includes('.')) { setErro('Endereço de email inválido.'); return; }
    setErro('');
    setStep('otp');
  };

  const handleDigit = (index: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setOtpErro('');
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...digits];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submitInscricao = () => {
    adicionarInscricao({ nome, telefone: `+258 ${telefone}`, email, grupoId });
    setStep('sucesso');
  };

  const handleVerificar = () => {
    const code = digits.join('');
    if (code.length < 6) { setOtpErro('Introduza os 6 dígitos do código.'); return; }
    if (code !== otpGerado) { setOtpErro('Código incorrecto. Verifique e tente novamente.'); return; }
    submitInscricao();
  };

  const stepIndex = ['grupoSelect', 'form', 'otp', 'sucesso'].indexOf(step);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-amber-500/8 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-800">
          <div>
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-0.5">Xitique · SOS Motors</div>
            <h2 className="text-white font-black text-lg">
              {step === 'grupoSelect' && 'Escolha o seu Grupo'}
              {step === 'form'        && 'Os seus Dados'}
              {step === 'otp'        && (fullUser ? `Olá, ${nome.split(' ')[0]}!` : 'Verificação por SMS')}
              {step === 'sucesso'     && 'Inscrição Recebida!'}
            </h2>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-2 mr-8">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-6 bg-amber-500' : i < stepIndex ? 'w-3 bg-emerald-400' : 'w-3 bg-zinc-700'
              }`} />
            ))}
          </div>
          <button onClick={onClose} className="absolute right-5 top-5 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:text-white transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="relative px-6 py-6">

          {/* ── PASSO 0: Selecção de Grupo ── */}
          {step === 'grupoSelect' && (
            <div className="space-y-4">
              {gruposAbertos.length === 0 ? (
                <div className="text-center py-8 px-2 space-y-6">
                  <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl animate-pulse">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-xl uppercase tracking-tight">Sem vagas disponíveis</h3>
                    <p className="text-white text-sm leading-relaxed">Todos os grupos estão em andamento ou concluídos. Novos grupos são abertos regularmente.</p>
                  </div>
                  <button onClick={onClose} className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-zinc-700 transition">
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-white text-sm leading-relaxed">
                    Seleccione o grupo em que deseja participar. Cada grupo tem a sua quota e número de membros.
                  </p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {gruposAbertos.map(g => {
                      const vagasLivres = g.maxMembros - g.membros.length;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelecionarGrupo(g.id)}
                          className="w-full text-left rounded-2xl bg-zinc-800/60 border border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800 transition-all p-4 group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white font-black text-sm group-hover:text-amber-400 transition-colors">{g.nome}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                <span className="text-xs text-zinc-400">
                                  <span className="text-amber-400 font-bold">{fmt(g.quotaMT)}</span> / mês
                                </span>
                                <span className="text-xs text-zinc-400">
                                  Prémio <span className="text-white font-bold">{fmt(g.premioMT)}</span>
                                </span>
                                <span className="text-xs text-zinc-400">
                                  <span className="text-white font-bold">{g.maxMembros}</span> membros
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                                vagasLivres <= 2
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {vagasLivres} vaga{vagasLivres !== 1 ? 's' : ''}
                              </div>
                              <div className="mt-2">
                                <div className="h-1.5 w-24 bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${(g.membros.length / g.maxMembros) * 100}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-0.5 text-right">{g.membros.length}/{g.maxMembros}</p>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── PASSO 1: Formulário ── */}
          {step === 'form' && (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {grupoSelecionado && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="text-xs text-amber-400 font-bold">{grupoSelecionado.nome}</span>
                  <span className="text-xs text-zinc-500">· {fmt(grupoSelecionado.quotaMT)}/mês</span>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">Aviso Importante</p>
                <p className="text-white text-[11px] leading-tight font-medium italic">
                  O pagamento <span className="text-white font-bold">não é feito na aplicação</span>. Submeta o interesse e o administrador entrará em contacto para os dados de pagamento.
                </p>
              </div>

              <div>
                <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Nome Completo</label>
                <input type="text" value={nome} onChange={e => { setNome(e.target.value); setErro(''); }} placeholder="Ex: Ana Joaquim Sitoe"
                  className="w-full rounded-xl bg-zinc-950/60 border border-zinc-700 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 transition" />
              </div>

              <div>
                <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Número M-Pesa</label>
                <div className="flex items-center rounded-xl bg-zinc-950/60 border border-zinc-700 focus-within:border-amber-500 transition overflow-hidden">
                  <span className="pl-4 pr-2 text-sm text-white font-bold shrink-0 select-none">+258</span>
                  <input type="tel" value={telefone} onChange={e => { setTelefone(e.target.value.replace(/\D/g, '')); setErro(''); }} placeholder="84 123 4567" maxLength={9}
                    className="flex-1 bg-transparent pr-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="text-white text-xs font-bold uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }} placeholder="exemplo@email.com"
                  className="w-full rounded-xl bg-zinc-950/60 border border-zinc-700 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 transition" />
              </div>

              {erro && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{erro}</div>}

              <button type="submit" className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-black uppercase tracking-widest text-sm hover:bg-amber-400 active:scale-[0.98] transition">
                Continuar →
              </button>
              <button type="button" onClick={() => setStep('grupoSelect')} className="w-full py-2 text-xs text-white hover:text-white transition">
                ← Mudar de grupo
              </button>
            </form>
          )}

          {/* ── PASSO 2a: Confirmação directa (autenticado) ── */}
          {step === 'otp' && fullUser && (
            <div className="space-y-5">
              {grupoSelecionado && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="text-xs text-amber-400 font-bold">{grupoSelecionado.nome}</span>
                  <span className="text-xs text-zinc-500">· {fmt(grupoSelecionado.quotaMT)}/mês · prémio {fmt(grupoSelecionado.premioMT)}</span>
                </div>
              )}
              <div className="bg-emerald-400/8 border border-emerald-400/20 rounded-xl px-4 py-4 space-y-2">
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2">Dados da sua conta</p>
                {[{ label: 'Nome', value: nome }, { label: 'Telemóvel', value: telefone ? `+258 ${telefone}` : '—' }, { label: 'Email', value: email }].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-zinc-400">{r.label}</span>
                    <span className="text-white font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-white text-sm leading-relaxed">A sua identidade já foi verificada. Confirme para submeter a inscrição.</p>
              <button onClick={submitInscricao} className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-black uppercase tracking-widest text-sm hover:bg-amber-400 active:scale-[0.98] transition">
                Confirmar Inscrição
              </button>
              <button type="button" onClick={() => setStep('grupoSelect')} className="w-full py-2 text-xs text-white hover:text-white transition">
                ← Mudar de grupo
              </button>
            </div>
          )}

          {/* ── PASSO 2b: OTP (não autenticado) ── */}
          {step === 'otp' && !fullUser && (
            <div className="space-y-5">
              <p className="text-white text-sm leading-relaxed">
                Código de verificação enviado para <span className="text-white font-bold">+258 {telefone}</span>.
              </p>
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="2" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="#d8a020"/>
                </svg>
                <span className="text-xs text-amber-300 leading-relaxed">
                  Modo demo — código de teste: <span className="font-black text-amber-400 tracking-[0.2em]">{otpGerado}</span>
                </span>
              </div>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                    className={`w-11 h-14 rounded-xl text-center text-xl font-black text-white bg-zinc-950/60 border outline-none transition ${d ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-700 focus:border-amber-500'}`} />
                ))}
              </div>
              {otpErro && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{otpErro}</div>}
              <button onClick={handleVerificar} className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-black uppercase tracking-widest text-sm hover:bg-amber-400 active:scale-[0.98] transition">
                Verificar Código
              </button>
              <button type="button" onClick={() => { setDigits(['','','','','','']); setOtpErro(''); setStep('form'); }} className="w-full py-2 text-xs text-white hover:text-white transition">
                ← Corrigir dados
              </button>
            </div>
          )}

          {/* ── PASSO 3: Sucesso ── */}
          {step === 'sucesso' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-xl mb-2">Inscrição enviada!</h3>
                {grupoSelecionado && (
                  <p className="text-amber-400 text-xs font-bold mb-2">{grupoSelecionado.nome} · {fmt(grupoSelecionado.quotaMT)}/mês</p>
                )}
                <p className="text-white text-sm leading-relaxed">
                  Os seus dados foram registados. O administrador irá validar e confirmar a sua entrada no grupo.
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 text-left space-y-2">
                {[{ label: 'Nome', value: nome }, { label: 'Telemóvel', value: `+258 ${telefone}` }, { label: 'Email', value: email }].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-4">
                    <span className="text-white text-xs shrink-0">{row.label}</span>
                    <span className="text-white text-sm font-semibold truncate">{row.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
