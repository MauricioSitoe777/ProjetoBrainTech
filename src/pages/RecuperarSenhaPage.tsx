import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

type Estado = 'form' | 'enviado' | 'erro_email' | 'nao_encontrado';

export function RecuperarSenhaPage({ onVoltar }: { onVoltar: () => void }) {
  const { solicitarResetSenha } = useAuth();
  const [email,    setEmail]    = useState('');
  const [estado,   setEstado]   = useState<Estado>('form');
  const [loading,  setLoading]  = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copiado,  setCopiado]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const resultado = await solicitarResetSenha(email);
    setLoading(false);
    if (resultado.status === 'sent')       setEstado('enviado');
    else if (resultado.status === 'not_found') setEstado('nao_encontrado');
    else {
      setResetLink(resultado.link ?? null);
      setEstado('erro_email');
    }
  };

  const copiarLink = () => {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-400/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center">
          <BrandLogo className="h-20 w-auto max-w-[220px] mx-auto mb-4" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">

          {/* ── Form ── */}
          {estado === 'form' && (
            <>
              <div>
                <h2 className="text-xl font-black text-white">Recuperar Senha</h2>
                <p className="text-white text-sm mt-1 leading-relaxed opacity-70">
                  Introduza o seu endereço de e-mail. Enviaremos um link para redefinir a senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="o-seu-email@exemplo.com"
                      required
                      autoFocus
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl py-3.5 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-400/20 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                      A processar...
                    </div>
                  ) : 'Enviar Link de Recuperação'}
                </button>
              </form>
            </>
          )}

          {/* ── Enviado com sucesso ── */}
          {estado === 'enviado' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg">E-mail Enviado!</h3>
                <p className="text-white text-sm mt-2 leading-relaxed opacity-80">
                  Se o endereço <span className="text-amber-400 font-bold opacity-100">{email}</span> estiver registado no sistema, receberá um link de recuperação em breve.
                </p>
                <p className="text-white text-xs mt-3 opacity-60">O link expira em <span className="text-white font-bold opacity-100">1 hora</span>. Verifique também a pasta de spam.</p>
              </div>
            </div>
          )}

          {/* ── Não encontrado ── */}
          {estado === 'nao_encontrado' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.8" fill="#f87171"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg">E-mail Não Encontrado</h3>
                <p className="text-white text-sm mt-2 leading-relaxed opacity-80">
                  Não existe nenhuma conta registada com o endereço <span className="text-red-400 font-bold opacity-100">{email}</span>.
                </p>
              </div>
              <button
                onClick={() => setEstado('form')}
                className="text-amber-400 text-sm font-bold hover:text-amber-300 transition"
              >
                Tentar com outro e-mail
              </button>
            </div>
          )}

          {/* ── Erro de envio / link directo ── */}
          {estado === 'erro_email' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.8" fill="#fbbf24"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Link de Recuperação Gerado</h3>
                <p className="text-white text-sm mt-2 leading-relaxed opacity-80">
                  O e-mail automático não pôde ser enviado. Copie o link abaixo e partilhe diretamente com o utilizador.
                </p>
              </div>

              {resetLink && (
                <div className="space-y-2 text-left">
                  <p className="text-xs font-bold text-white uppercase tracking-wider opacity-60">Link de recuperação</p>
                  <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-3 flex items-start gap-3">
                    <p className="text-xs text-white flex-1 break-all leading-relaxed">{resetLink}</p>
                    <button
                      onClick={copiarLink}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        copiado
                          ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                          : 'bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30'
                      }`}
                    >
                      {copiado ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Copiado
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-white text-xs opacity-50">Este link expira em 1 hora.</p>
                </div>
              )}

              <button
                onClick={() => { setEstado('form'); setResetLink(null); }}
                className="text-amber-400 text-sm font-bold hover:text-amber-300 transition"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Voltar ao login */}
        <div className="text-center">
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 text-white text-sm hover:text-amber-400 transition mx-auto opacity-60 hover:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
}
