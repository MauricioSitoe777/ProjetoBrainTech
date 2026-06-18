import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

type Estado = 'form' | 'enviado' | 'erro_email' | 'nao_encontrado';

export function RecuperarSenhaPage({ onVoltar }: { onVoltar: () => void }) {
  const { solicitarResetSenha } = useAuth();
  const [email,   setEmail]   = useState('');
  const [estado,  setEstado]  = useState<Estado>('form');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const resultado = await solicitarResetSenha(email);
    setLoading(false);
    if (resultado === 'sent')       setEstado('enviado');
    else if (resultado === 'not_found') setEstado('nao_encontrado');
    else                            setEstado('erro_email');
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
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Introduza o seu endereço de e-mail. Enviaremos um link para redefinir a senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">E-mail</label>
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
                      A enviar...
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
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Se o endereço <span className="text-amber-400 font-bold">{email}</span> estiver registado no sistema, receberá um link de recuperação em breve.
                </p>
                <p className="text-zinc-500 text-xs mt-3">O link expira em <span className="text-white font-bold">1 hora</span>. Verifique também a pasta de spam.</p>
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
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Não existe nenhuma conta registada com o endereço <span className="text-red-400 font-bold">{email}</span>.
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

          {/* ── Erro de envio ── */}
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
                <h3 className="text-white font-black text-lg">Erro ao Enviar E-mail</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Não foi possível enviar o e-mail neste momento. Por favor, contacte o administrador do sistema.
                </p>
                <p className="text-zinc-500 text-xs mt-2">
                  (Em modo de desenvolvimento, o link de recuperação foi registado na consola do browser.)
                </p>
              </div>
              <button
                onClick={() => setEstado('form')}
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
            className="flex items-center gap-2 text-zinc-400 text-sm hover:text-white transition mx-auto"
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
