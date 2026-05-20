import type { User } from '../types/user';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { useAuth } from '../context/AuthContext';

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
  const { reservations, updateReservation, cancelReservation } = useReservations();
  const { vehicles } = useVehicles();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  
  // Filtrar todas as transações deste utilizador
  const userReservations = reservations.filter(r => r.userId === user.id);
  
  // Separar alugueres e compras com base no modo do veículo
  const alugueres = userReservations.filter(r => {
    const v = vehicles.find(veh => veh.id === r.vehicleId);
    return !v || v.mode === 'aluguer';
  });
  
  const compras = userReservations.filter(r => {
    const v = vehicles.find(veh => veh.id === r.vehicleId);
    return v?.mode === 'compra';
  });

  // Calcular o total gasto
  const totalAlugueresGasto = alugueres.filter(a => a.status === 'concluida').reduce((s, a) => s + a.valorTotal, 0);
  const totalComprasGasto = compras.filter(c => c.status === 'concluida' || c.status === 'confirmada' || c.status === 'ativa').reduce((s, c) => s + c.valorTotal, 0);
  const totalGasto = totalAlugueresGasto + totalComprasGasto;

  const getVehicleName = (id: number) => vehicles.find(v => v.id === id)?.name || `Viatura #${id}`;
  const getVehiclePlate = (id: number) => {
    const v = vehicles.find(v => v.id === id);
    if (v?.mode === 'compra') return 'Matrícula Pendente';
    return id === 4 ? 'MPC-1234-MP' : '—';
  };

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
          <p className="text-xs text-zinc-300 mb-1">Alugueres</p>
          <p className="text-2xl font-bold text-white">{alugueres.length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-300 mb-1">Compras</p>
          <p className="text-2xl font-bold text-white">{compras.length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-300 mb-1">Total investido</p>
          <p className="text-xl font-bold text-amber-500">{totalGasto.toLocaleString("pt-PT")} MT</p>
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
        <h3 className="text-sm font-medium text-white mb-3">Histórico de Transações</h3>
        {userReservations.length === 0 ? (
          <div className="text-center py-8 text-zinc-300 text-sm bg-zinc-800/30 rounded-xl border border-zinc-800">
            Sem transações registadas
          </div>
        ) : (
          <div className="space-y-2">
            {userReservations.map(a => {
              const vehicle = vehicles.find(v => v.id === a.vehicleId);
              const isPurchase = vehicle?.mode === 'compra';
              return (
                <div key={a.id} className="flex items-center justify-between bg-zinc-800/40 rounded-xl px-4 py-3 border border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{getVehicleName(a.vehicleId)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        isPurchase
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {isPurchase ? 'Compra' : 'Aluguer'}
                      </span>
                    </div>
                    <p className="text-xs text-white">
                      {getVehiclePlate(a.vehicleId)} · {isPurchase ? `Adquirido em ${a.dataInicio}` : `${a.dataInicio} → ${a.dataFim}`}
                    </p>
                    {!isPurchase && a.localLevantamento && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        📍 Levantamento: {a.localLevantamento} <br />
                        🏁 Devolução: {a.localDevolucao}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs border rounded-md px-2 py-0.5 ${statusAluguer[a.status].className}`}>{statusAluguer[a.status].label}</span>
                    <p className="text-sm font-medium text-white">{a.valorTotal.toLocaleString("pt-PT")} MT</p>
                    
                    {/* Botões de Ação para o Admin */}
                    {isAdmin && (a.status === 'pendente' || a.status === 'confirmada' || a.status === 'ativa') && (
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          onClick={() => updateReservation(a.id, { status: 'concluida' })}
                          className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                        >
                          {isPurchase ? 'Concluir Venda' : 'Concluir'}
                        </button>
                        {a.status === 'pendente' && (
                          <button
                            onClick={() => cancelReservation(a.id)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all active:scale-95 cursor-pointer"
                          >
                            {isPurchase ? 'Cancelar Venda' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    )}
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
