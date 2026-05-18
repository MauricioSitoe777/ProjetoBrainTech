import type { User } from '../types/user';
import { useReservations } from '../context/ReservationsContext';
import { VEHICLES } from '../data/constants';

interface UserProfileContentProps {
  user: User;
  showRole?: boolean;
}

const statusAluguer: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada: { label: 'Confirmada', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  ativa: { label: 'Ativa', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  concluida: { label: 'Concluída', className: 'bg-zinc-700 text-zinc-300 border-zinc-600' },
  cancelada: { label: 'Cancelada', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

const roleLabel = { admin: 'Administrador', cliente: 'Cliente' };

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function UserProfileContent({ user, showRole = true }: UserProfileContentProps) {
  const { reservations } = useReservations();
  const alugueres = reservations.filter(r => r.userId === user.id);
  const totalGasto = alugueres.filter(a => a.status === 'concluida').reduce((s, a) => s + a.valorTotal, 0);

  const getVehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name || `Viatura #${id}`;
  const getVehiclePlate = (id: number) => VEHICLES.find(v => v.id === id)?.id === 4 ? 'MPC-1234-MP' : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
          {initials(user.nome)}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{user.nome}</h2>
          <p className="text-sm text-white">{user.email}</p>
          {showRole && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-zinc-800 text-white px-2 py-0.5 rounded-md border border-zinc-700">
                {roleLabel[user.role]}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-300 mb-1">Total alugueres</p>
          <p className="text-2xl font-bold text-white">{alugueres.length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-300 mb-1">Concluídos</p>
          <p className="text-2xl font-bold text-emerald-400">{alugueres.filter(a => a.status === 'concluida').length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-300 mb-1">Total gasto</p>
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
          { label: 'Estado', value: user.status === 'ativo' ? 'Ativo' : user.status === 'inativo' ? 'Inativo' : 'Suspenso' },
        ].map(item => (
          <div key={item.label}>
            <p className="text-xs text-zinc-300">{item.label}</p>
            <p className="text-sm text-white mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-white mb-3">Histórico de alugueres</h3>
        {alugueres.length === 0 ? (
          <div className="text-center py-8 text-zinc-300 text-sm bg-zinc-800/30 rounded-xl border border-zinc-800">
            Sem alugueres registados
          </div>
        ) : (
          <div className="space-y-2">
            {alugueres.map(a => {
              const st = statusAluguer[a.status];
              return (
                <div key={a.id} className="flex items-center justify-between bg-zinc-800/40 rounded-xl px-4 py-3 border border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-white">{getVehicleName(a.vehicleId)}</p>
                    <p className="text-xs text-white">{getVehiclePlate(a.vehicleId)} · {a.dataInicio} → {a.dataFim}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs border rounded-md px-2 py-0.5 ${statusAluguer[a.status].className}`}>{statusAluguer[a.status].label}</span>
                    <p className="text-sm font-medium text-white mt-1">{a.valorTotal.toLocaleString()} MT</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
