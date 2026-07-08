import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onDone: () => void;
}

export function ChangePasswordModal({ onDone }: Props) {
  const { user, updateUser } = useAuth();
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = () => {
    if (nova.length < 6) { setErro('A password deve ter pelo menos 6 caracteres.'); return; }
    if (nova !== confirmar) { setErro('As passwords não coincidem.'); return; }
    if (!user) return;
    updateUser(user.id, { password: nova, mustChangePassword: false });
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-white font-black text-base">Crie a sua password pessoal</h2>
          <p className="text-white text-xs mt-1 leading-relaxed">
            Por segurança, substitua a password temporária por uma que só você conhece.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Nova password */}
          <div>
            <label className="block text-xs text-white font-bold mb-1">Nova password</label>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 focus-within:border-amber-500/50">
              <input
                type={showNova ? 'text' : 'password'}
                value={nova}
                onChange={e => { setNova(e.target.value); setErro(''); }}
                placeholder="Mínimo 6 caracteres"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button type="button" onClick={() => setShowNova(v => !v)} className="text-white hover:text-white transition-colors">
                {showNova
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Confirmar password */}
          <div>
            <label className="block text-xs text-white font-bold mb-1">Confirmar password</label>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 focus-within:border-amber-500/50">
              <input
                type={showConf ? 'text' : 'password'}
                value={confirmar}
                onChange={e => { setConfirmar(e.target.value); setErro(''); }}
                placeholder="Repita a nova password"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button type="button" onClick={() => setShowConf(v => !v)} className="text-white hover:text-white transition-colors">
                {showConf
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Indicador de força */}
          {nova.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    nova.length >= i * 3
                      ? nova.length >= 10 ? 'bg-emerald-400' : nova.length >= 6 ? 'bg-amber-400' : 'bg-red-400'
                      : 'bg-zinc-700'
                  }`} />
                ))}
              </div>
              <p className="text-[10px] text-white">
                {nova.length < 6 ? 'Muito curta' : nova.length < 10 ? 'Aceitável' : 'Forte'}
              </p>
            </div>
          )}

          {erro && (
            <p className="text-red-400 text-xs font-bold bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg py-2.5 text-sm transition-colors mt-2"
          >
            Guardar e Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
