import { useEffect, useState } from 'react';
import { useInvites, type Invite } from '../context/InvitesContext';
import { useAuth } from '../context/AuthContext';

interface InvitePageProps {
  token: string;
  onSuccess: () => void;
}

export function InvitePage({ token, onSuccess }: InvitePageProps) {
  const { validateInvite, consumeInvite } = useInvites();
  const { updateUser, loginById } = useAuth();

  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setInvite(validateInvite(token));
  }, [token, validateInvite]);

  const validate = (): string => {
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (password !== confirm) return 'As senhas não coincidem.';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    // Guardar senha e ativar conta
    updateUser(invite.userId, { password, status: 'ativo' });
    consumeInvite(token);
    loginById(invite.userId);
    onSuccess();
  };

  // Loading
  if (invite === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Inválido / expirado
  if (invite === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-black mb-2">Link inválido</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Este link já foi utilizado, expirou (válido por 24h) ou não existe.
            Contacte o administrador para obter um novo convite.
          </p>
          <button
            onClick={onSuccess}
            className="w-full py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition"
          >
            Ir para a página principal
          </button>
        </div>
      </div>
    );
  }

  const expiresIn = Math.max(0, Math.round((invite.expiresAt - Date.now()) / 3_600_000));

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #d8a020, transparent 70%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">
              Activação de conta
            </div>
            <h2 className="text-white text-2xl font-black">
              Olá, {invite.userName.split(' ')[0]}!
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Crie a sua senha para activar a conta.
            </p>
          </div>

          {/* Account info */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Nome</span>
              <span className="text-white font-semibold">{invite.userName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Email</span>
              <span className="text-white">{invite.userEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Link expira em</span>
              <span className="text-amber-400 font-bold text-xs">
                {expiresIn > 0 ? `≈ ${expiresIn}h` : 'menos de 1h'}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Nova senha
              </label>
              <div className="flex items-center rounded-xl bg-zinc-950/60 border border-zinc-700 focus-within:border-amber-500 transition-colors overflow-hidden">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="px-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < Math.min(4, Math.floor(password.length / 3))
                          ? password.length >= 10 ? 'bg-emerald-400'
                            : password.length >= 6 ? 'bg-amber-400'
                            : 'bg-red-400'
                          : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-zinc-400 ml-1 self-center">
                    {password.length < 6 ? 'Fraca' : password.length < 10 ? 'Média' : 'Forte'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Confirmar senha
              </label>
              <div className="flex items-center rounded-xl bg-zinc-950/60 border border-zinc-700 focus-within:border-amber-500 transition-colors overflow-hidden">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Repita a senha"
                  required
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="px-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Match indicator */}
              {confirm.length > 0 && (
                <p className={`text-xs mt-1.5 ${password === confirm ? 'text-emerald-400' : 'text-red-400'}`}>
                  {password === confirm ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || password.length < 6 || password !== confirm}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                !submitting && password.length >= 6 && password === confirm
                  ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'A activar…' : 'Activar conta'}
            </button>
          </form>

          <p className="text-zinc-600 text-xs text-center mt-5">
            Link de uso único · válido por 24h após emissão
          </p>
        </div>
      </div>
    </div>
  );
}
