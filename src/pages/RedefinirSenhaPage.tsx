import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

type Estado = 'validando' | 'form' | 'token_invalido' | 'sucesso';

export function RedefinirSenhaPage({ token, onVoltar }: { token: string; onVoltar: () => void }) {
  const { validarTokenReset, redefinirSenha } = useAuth();
  const [estado,    setEstado]    = useState<Estado>('validando');
  const [senha,     setSenha]     = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showS1,    setShowS1]    = useState(false);
  const [showS2,    setShowS2]    = useState(false);
  const [erro,      setErro]      = useState('');

  useEffect(() => {
    const userId = validarTokenReset(token);
    setEstado(userId ? 'form' : 'token_invalido');
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha.length < 6) {
      setErro('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As palavras-passe não coincidem.');
      return;
    }

    const ok = redefinirSenha(token, senha);
    if (ok) setEstado('sucesso');
    else     setErro('O link de recuperação expirou. Solicite um novo.');
  };

  const reqOk = (r: RegExp) => r.test(senha);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-400/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center">
          <BrandLogo className="h-20 w-auto max-w-[220px] mx-auto mb-4" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">

          {/* ── Validando token ── */}
          {estado === 'validando' && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
            </div>
          )}

          {/* ── Token inválido / expirado ── */}
          {estado === 'token_invalido' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.8" fill="#f87171"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Link Inválido ou Expirado</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Este link de recuperação já não é válido. Pode ter expirado (validade: 1 hora) ou já ter sido utilizado.
                </p>
              </div>
              <button
                onClick={onVoltar}
                className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl py-3 text-sm transition-all"
              >
                Solicitar Novo Link
              </button>
            </div>
          )}

          {/* ── Formulário nova palavra-passe ── */}
          {estado === 'form' && (
            <>
              <div>
                <h2 className="text-xl font-black text-white">Nova Palavra-passe</h2>
                <p className="text-zinc-400 text-sm mt-1">Escolha uma palavra-passe segura para a sua conta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo palavra-passe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nova Palavra-passe</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <input
                      type={showS1 ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-12 py-3 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowS1(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                      {showS1
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Indicadores de força */}
                {senha.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: '6+ caracteres', ok: senha.length >= 6 },
                      { label: 'Letra maiúscula', ok: reqOk(/[A-Z]/) },
                      { label: 'Número', ok: reqOk(/[0-9]/) },
                      { label: 'Símbolo (!@#...)', ok: reqOk(/[^A-Za-z0-9]/) },
                    ].map(r => (
                      <div key={r.label} className={`flex items-center gap-1.5 text-[10px] font-bold ${r.ok ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${r.ok ? 'bg-emerald-400 border-emerald-400' : 'border-zinc-700'}`}>
                          {r.ok && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        {r.label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmar palavra-passe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirmar Palavra-passe</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <input
                      type={showS2 ? 'text' : 'password'}
                      value={confirmar}
                      onChange={e => setConfirmar(e.target.value)}
                      placeholder="Repita a nova palavra-passe"
                      required
                      className={`w-full bg-zinc-950 border text-white rounded-xl pl-11 pr-12 py-3 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all ${
                        confirmar && confirmar !== senha
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-zinc-800 focus:border-amber-400 focus:ring-amber-400/20'
                      }`}
                    />
                    <button type="button" onClick={() => setShowS2(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                      {showS2
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {erro && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!senha || !confirmar}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl py-3.5 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-400/20 active:scale-[0.98]"
                >
                  Definir Nova Palavra-passe
                </button>
              </form>
            </>
          )}

          {/* ── Sucesso ── */}
          {estado === 'sucesso' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Palavra-passe Redefinida!</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  A sua palavra-passe foi alterada com sucesso. Pode agora iniciar sessão com a nova palavra-passe.
                </p>
              </div>
              <button
                onClick={onVoltar}
                className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl py-3 text-sm transition-all"
              >
                Ir para o Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
