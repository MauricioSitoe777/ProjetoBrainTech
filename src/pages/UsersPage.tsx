import { useState, useMemo } from 'react';
import { useUsers } from '../context/UsersContext';
import { useAuth } from '../context/AuthContext';
import { UserModal } from '../components/UserModal';
import { UserDetail } from '../components/UserDetail';
import { AdminNav } from '../components/AdminNav';
import type { User, UserRole, UserStatus } from '../types/user';

const roleConfig = {
  admin: { label: 'Admin', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  cliente: { label: 'Cliente', className: 'bg-zinc-700 text-zinc-300 border-zinc-600' },
};

const statusConfig = {
  ativo: { label: 'Ativo', dot: 'bg-emerald-400' },
  inativo: { label: 'Inativo', dot: 'bg-zinc-500' },
  suspenso: { label: 'Suspenso', dot: 'bg-red-400' },
};

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function UsersPage({ onExit }: { onExit?: () => void }) {
  const { users, addUser, updateUser, deleteUser } = useUsers();
  const { user: authUser } = useAuth();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'todos'>('todos');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'todos'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.telefone.includes(search);
      const matchRole = filterRole === 'todos' || u.role === filterRole;
      const matchStatus = filterStatus === 'todos' || u.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const stats = useMemo(() => ({
    total: users.length,
    ativos: users.filter(u => u.status === 'ativo').length,
    clientes: users.filter(u => u.role === 'cliente').length,
    suspensos: users.filter(u => u.status === 'suspenso').length,
  }), [users]);

  const handleSave = (data: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => {
    if (editingUser) {
      updateUser(editingUser.id, data);
    } else {
      addUser(data);
    }
    setShowModal(false);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setDetailUser(null);
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    setDeleteConfirm(null);
  };

  const canManage = authUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav subtitle="Utilizadores" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total utilizadores', value: stats.total, color: 'text-white' },
            { label: 'Ativos', value: stats.ativos, color: 'text-emerald-400' },
            { label: 'Clientes', value: stats.clientes, color: 'text-amber-400' },
            { label: 'Suspensos', value: stats.suspensos, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, email ou telefone..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'todos')}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="todos">Todos os papéis</option>
            <option value="admin">Administrador</option>
            <option value="cliente">Cliente</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as UserStatus | 'todos')}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="todos">Todos os estados</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="suspenso">Suspenso</option>
          </select>
          {canManage && (
            <button
              onClick={() => { setEditingUser(null); setShowModal(true); }}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo utilizador
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Utilizador</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Papel</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Último acesso</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500 text-sm">
                      Nenhum utilizador encontrado
                    </td>
                  </tr>
                )}
                {filtered.map(u => {
                  const role = roleConfig[u.role];
                  const status = statusConfig[u.status];
                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailUser(u)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
                            {initials(u.nome)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{u.nome}</p>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs border rounded-md px-2 py-0.5 ${role.className}`}>{role.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-zinc-400">{u.telefone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                          <span className="text-xs text-zinc-400">{status.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-zinc-500">{u.ultimoAcesso}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailUser(u)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-700"
                            title="Ver detalhes"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleEdit(u)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-700"
                                title="Editar"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              {authUser?.role === 'admin' && u.id !== authUser.id && (
                                <button
                                  onClick={() => setDeleteConfirm(u.id)}
                                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                                  title="Eliminar"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
              {filtered.length} de {users.length} utilizadores
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <UserModal
          user={editingUser}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
        />
      )}
      {detailUser && authUser?.role === 'admin' && (
        <UserDetail
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => handleEdit(detailUser)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-10 h-10 bg-red-400/10 rounded-xl flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="text-white font-semibold mb-1">Eliminar utilizador</h3>
            <p className="text-zinc-400 text-sm mb-6">Esta ação é permanente e não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 text-sm transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg py-2 text-sm transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
