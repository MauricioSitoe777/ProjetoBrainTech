import { useState } from 'react';
import type { User } from '../types/user';
import { useReservations } from '../context/ReservationsContext';
import { VEHICLES, CATEGORY_LABEL, DOC_LABEL } from '../data/constants';
import { useAuth } from '../context/AuthContext';

interface UserProfileContentProps {
  user: User;
  showRole?: boolean;
}

const statusAluguer: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  confirmada: { label: 'Confirmada', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  ativa: { label: 'Ativa', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  concluida: { label: 'Concluída', className: 'bg-zinc-700 text-white border-zinc-600' },
  cancelada: { label: 'Cancelada', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

const roleLabel = { admin: 'Administrador', cliente: 'Cliente' };

const regularityLabel = {
  regular: 'Regular',
  pendente: 'Pendente',
  inadimplente: 'Inadimplente'
};

const restrictionLabel = {
  nenhuma: 'Nenhuma',
  blacklisted: 'Lista Negra (Blacklisted)'
};

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function UserProfileContent({ user, showRole = true }: UserProfileContentProps) {
  const { reservations, updateReservation, cancelReservation } = useReservations();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [showPass, setShowPass] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    });
  };
  
  // Filtrar todas as transações deste utilizador
  const userReservations = reservations.filter(r => r.userId === user.id);
  
  // Separar alugueres e compras com base no modo do veículo
  const alugueres = userReservations.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return !v || v.mode === 'aluguer';
  });
  
  const compras = userReservations.filter(r => {
    const v = VEHICLES.find(veh => veh.id === r.vehicleId);
    return v?.mode === 'compra';
  });

  // Calcular o total gasto (usando o preço do carro original para compras parceladas, sem incluir juros das prestações)
  const totalAlugueresGasto = alugueres.filter(a => a.status === 'concluida').reduce((s, a) => s + a.valorTotal, 0);
  const totalComprasGasto = compras.filter(c => c.status === 'concluida' || c.status === 'confirmada' || c.status === 'ativa').reduce((s, c) => {
    const v = VEHICLES.find(veh => veh.id === c.vehicleId);
    const originalPrice = v ? parseInt(v.price.replace(/\D/g, ""), 10) : c.valorTotal;
    const isInstallment = (c.notas || (c as any).notes)?.includes("prestações");
    return s + (isInstallment ? originalPrice : c.valorTotal);
  }, 0);
  const totalGasto = totalAlugueresGasto + totalComprasGasto;

  const getVehicleName = (id: number) => VEHICLES.find(v => v.id === id)?.name || `Viatura #${id}`;
  const getVehiclePlate = (id: number) => {
    const v = VEHICLES.find(v => v.id === id);
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
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] bg-zinc-800 text-white px-2 py-0.5 rounded-md border border-zinc-700">
                {roleLabel[user.role]}
              </span>
              {user.regularity && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                  user.regularity === 'regular' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  user.regularity === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {regularityLabel[user.regularity]}
                </span>
              )}
              {user.restriction === 'blacklisted' && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-md border border-red-500 font-bold uppercase">
                  Blacklisted
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-white mb-1">Alugueres</p>
          <p className="text-2xl font-bold text-white">{alugueres.length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-white mb-1">Compras</p>
          <p className="text-2xl font-bold text-white">{compras.length}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-white mb-1">Total investido</p>
          <p className="text-xl font-bold text-amber-500">{totalGasto.toLocaleString("pt-PT")} MT</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Telefone', value: user.telefone || '—' },
          { label: 'Categoria', value: user.category ? CATEGORY_LABEL[user.category] : 'Não definida' },
          { label: 'BI', value: user.bi || '—' },
          { label: 'NUIT', value: user.nuit || '—' },
          { label: 'Membro desde', value: user.dataCriacao },
          { label: 'Estado da Conta', value: user.status === 'ativo' ? 'Ativo' : user.status === 'inativo' ? 'Inativo' : 'Suspenso' },
          { label: 'Regularidade', value: regularityLabel[user.regularity || 'regular'] },
          { label: 'Restrição', value: restrictionLabel[user.restriction || 'nenhuma'] },
        ].map(item => (
          <div key={item.label}>
            <p className="text-xs text-white">{item.label}</p>
            <p className="text-sm text-white mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {user.documentos && Object.keys(user.documentos).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Documentos Arquivados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(user.documentos) as [keyof typeof DOC_LABEL, boolean][]).map(([key, exists]) => (
              <div 
                key={key} 
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                  exists 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-zinc-800/30 border-zinc-800 text-white'
                }`}
              >
                <span>{DOC_LABEL[key] || key}</span>
                <span>{exists ? '✓' : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-white">Credenciais de Acesso</h3>
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Confidencial</span>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl overflow-hidden divide-y divide-zinc-700/60">
            {/* Email */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-0.5">Email de login</div>
                <div className="text-sm text-white font-medium truncate">{user.email}</div>
              </div>
              <button
                onClick={() => copiar(user.email, 'email')}
                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                  copiado === 'email' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {copiado === 'email' ? '✓' : 'Copiar'}
              </button>
            </div>
            {/* Telefone */}
            {user.telefone && (
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-0.5">Telemóvel (login alternativo)</div>
                  <div className="text-sm text-white font-medium">{user.telefone}</div>
                </div>
                <button
                  onClick={() => copiar(user.telefone, 'tel')}
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                    copiado === 'tel' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-700 text-white hover:bg-zinc-600'
                  }`}
                >
                  {copiado === 'tel' ? '✓' : 'Copiar'}
                </button>
              </div>
            )}
            {/* Senha */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-0.5">Senha</div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black tracking-wider ${user.password ? 'text-amber-400' : 'text-white'}`}>
                    {showPass ? (user.password || '123') : '••••••••'}
                  </span>
                  {!user.password && (
                    <span className="text-[9px] text-white font-bold uppercase bg-zinc-700 px-1.5 py-0.5 rounded">padrão</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowPass(v => !v)}
                  className="p-1.5 text-white hover:text-white transition rounded-lg hover:bg-zinc-700"
                  title={showPass ? 'Ocultar' : 'Mostrar'}
                >
                  {showPass ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
                <button
                  onClick={() => copiar(user.password || '123', 'pass')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                    copiado === 'pass' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-700 text-white hover:bg-zinc-600'
                  }`}
                >
                  {copiado === 'pass' ? '✓' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-white mb-3">Histórico de Transações</h3>
        {userReservations.length === 0 ? (
          <div className="text-center py-8 text-white text-sm bg-zinc-800/30 rounded-xl border border-zinc-800">
            Sem transações registadas
          </div>
        ) : (
          <div className="space-y-2">
            {userReservations.map(a => {
              const vehicle = VEHICLES.find(v => v.id === a.vehicleId);
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
                      {getVehiclePlate(a.vehicleId)} · {isPurchase 
                        ? `Adquirido em ${a.dataInicio}${vehicle ? ` · Preço do Carro: ${vehicle.price}` : ''}`
                        : `${a.dataInicio} → ${a.dataFim}`}
                    </p>
                    {isPurchase && (a.totalPrestacoes ?? 0) > 0 && (
                      <p className="text-[10px] text-amber-500 font-semibold mt-1">
                        📅 Prestações: {(a.prestacoesPagas ?? 0)} / {a.totalPrestacoes} pagas · Restam: {(a.totalPrestacoes ?? 0) - (a.prestacoesPagas ?? 0)}
                      </p>
                    )}
                    {!isPurchase && a.localLevantamento && (
                      <p className="text-[10px] text-white mt-1">
                        📍 Levantamento: {a.localLevantamento} <br />
                        🏁 Devolução: {a.localDevolucao}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs border rounded-md px-2 py-0.5 ${statusAluguer[a.status].className}`}>{statusAluguer[a.status].label}</span>
                    <p className="text-sm font-medium text-white">
                      {isPurchase && ((a.notas || (a as any).notes)?.includes("prestações"))
                        ? `${a.deposito.toLocaleString("pt-PT")} MT/mês`
                        : `${a.valorTotal.toLocaleString("pt-PT")} MT`}
                    </p>
                    
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
