import type { User, Aluguer } from '../types/user';
import { mockAlugueres } from '../data/mockData';

interface UserDetailProps {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

const statusAluguer = {
  ativo: { label: 'Ativo', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  concluido: { label: 'Concluído', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  cancelado: { label: 'Cancelado', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

const roleLabel = { admin: 'Administrador', gestor: 'Gestor', cliente: 'Cliente' };

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function UserDetail({ user, onClose, onEdit }: UserDetailProps) {
  const alugueres: Aluguer[] = mockAlugueres.filter(a => a.userId === user.id);
  const totalGasto = alugueres.filter(a => a.status === 'concluido').reduce((s, a) => s + a.valor, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
              {initials(user.nome)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{user.nome}</h2>
              <p className="text-sm text-zinc-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700">
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Total alugueres</p>
              <p className="text-2xl font-bold text-white">{alugueres.length}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Concluídos</p>
              <p className="text-2xl font-bold text-emerald-400">{alugueres.filter(a => a.status === 'concluido').length}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Total gasto</p>
              <p className="text-xl font-bold text-amber-500">{totalGasto.toLocaleString()} MT</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Telefone', value: user.telefone },
              { label: 'BI', value: user.bi || '—' },
              { label: 'Endereço', value: user.endereco || '—' },
              { label: 'Membro desde', value: user.dataCriacao },
              { label: 'Último acesso', value: user.ultimoAcesso },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="text-sm text-zinc-200 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-medium text-white mb-3">Histórico de alugueres</h3>
            {alugueres.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-800/30 rounded-xl border border-zinc-800">
                Sem alugueres registados
              </div>
            ) : (
              <div className="space-y-2">
                {alugueres.map(a => {
                  const st = statusAluguer[a.status];
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-zinc-800/40 rounded-xl px-4 py-3 border border-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-white">{a.viatura}</p>
                        <p className="text-xs text-zinc-400">{a.matricula} · {a.dataInicio} → {a.dataFim}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs border rounded-md px-2 py-0.5 ${st.className}`}>{st.label}</span>
                        <p className="text-sm font-medium text-zinc-200 mt-1">{a.valor.toLocaleString()} MT</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onEdit}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Editar utilizador
          </button>
        </div>
      </div>
    </div>
  );
}