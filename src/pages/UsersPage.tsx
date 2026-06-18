import { useState, useMemo, useEffect } from 'react';
import { useUsers } from '../context/UsersContext';
import { useAuth } from '../context/AuthContext';
import { useMotoristas } from '../context/MotoristasContext';
import { UserModal } from '../components/UserModal';
import { UserDetail } from '../components/UserDetail';
import type { User } from '../types/user';
import type { Motorista, MotoristaSatus } from '../types/motorista';
import type { Guest, GuestStatus } from '../types/guest';
import { useGuests } from '../context/GuestsContext';
import { GuestReviewModal } from '../components/GuestReviewModal';
import { AcoesNecessarias } from '../components/AcoesNecessarias';
import { useRoute } from '../hooks/useRoute';
import { useNotifications } from '../context/NotificationsContext';

// ── Configs ────────────────────────────────────────────────────────────────

const roleConfig = {
  admin:    { label: 'Administrador', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  cliente:  { label: 'Cliente',       className: 'bg-zinc-700 text-white border-zinc-600' },
};

const userStatusConfig = {
  ativo:    { label: 'Ativo',     dot: 'bg-emerald-400' },
  inativo:  { label: 'Inativo',   dot: 'bg-zinc-500' },
  suspenso: { label: 'Suspenso',  dot: 'bg-red-400' },
  pendente: { label: 'Pendente',  dot: 'bg-amber-400 animate-pulse' },
};

const motoristaStatusConfig: Record<MotoristaSatus, { label: string; dot: string; badge: string }> = {
  disponivel: { label: 'Disponível',  dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  em_servico: { label: 'Em Serviço',  dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  inativo:    { label: 'Inativo',     dot: 'bg-zinc-500',    badge: 'bg-zinc-700 text-zinc-400 border-zinc-600' },
};

const restrictionConfig = {
  nenhuma:    { label: 'Nenhuma',     className: 'text-white' },
  blacklisted:{ label: 'Lista Negra', className: 'text-white bg-red-600 border-red-500 px-2 font-bold uppercase text-[10px]' },
};

type MainTab = 'utilizadores' | 'motoristas' | 'visitantes';
type UserSubFilter = 'todos' | 'admins' | 'clientes';
type GuestSubFilter = 'todos' | 'pendentes' | 'aprovado' | 'aguarda_documentos' | 'documentos_submetidos' | 'em_analise' | 'rejeitado';
type Row = { kind: 'user'; data: User } | { kind: 'motorista'; data: Motorista } | { kind: 'guest'; data: Guest };

const guestStatusConfig: Record<GuestStatus, { label: string; dot: string }> = {
  aguarda_documentos:    { label: 'Aguarda Docs',     dot: 'bg-zinc-500' },
  documentos_submetidos: { label: 'Docs Submetidos',  dot: 'bg-amber-400 animate-pulse' },
  em_analise:            { label: 'Registrar',           dot: 'bg-blue-400 animate-pulse' },
  aprovado:              { label: 'Aprovado',          dot: 'bg-emerald-400' },
  rejeitado:             { label: 'Rejeitado',         dot: 'bg-red-400' },
};

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ── Motorista Modal (inline) ───────────────────────────────────────────────

const MOTO_EMPTY = { nome: '', telefone: '', bi: '', carta: '', status: 'disponivel' as MotoristaSatus, observacoes: '' };

function MotoristaModal({ initial, onSave, onClose }: {
  initial?: Partial<Motorista>;
  onSave: (data: Omit<Motorista, 'id' | 'dataCriacao'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...MOTO_EMPTY, ...initial });
  const field = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-black text-white">{initial?.id ? 'Editar Motorista' : 'Novo Motorista'}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          if (!form.nome.trim() || !form.telefone.trim()) return;
          onSave({ nome: form.nome.trim(), telefone: form.telefone.trim(), bi: form.bi.trim() || undefined, carta: form.carta.trim() || undefined, status: form.status, observacoes: form.observacoes.trim() || undefined });
        }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nome completo *</label>
            <input value={form.nome} onChange={set('nome')} required placeholder="António Cossa" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Telefone *</label>
              <input value={form.telefone} onChange={set('telefone')} required placeholder="+258 84 000 0000" className={field} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Estado</label>
              <select value={form.status} onChange={set('status')} className={field}>
                <option value="disponivel">Disponível</option>
                <option value="em_servico">Em Serviço</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nº BI</label>
              <input value={form.bi} onChange={set('bi')} placeholder="000000000A" className={field} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Carta de condução</label>
              <input value={form.carta} onChange={set('carta')} placeholder="Nº da carta" className={field} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={set('observacoes')} rows={2} placeholder="Notas internas..." className={`${field} resize-none`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-semibold">Cancelar</button>
            <button type="submit" className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-lg py-2.5 text-sm font-black">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function UsersPage({ onExit }: { onExit?: () => void }) {
  const { users, addUser, updateUser, deleteUser } = useUsers();
  const { motoristas, addMotorista, updateMotorista, deleteMotorista } = useMotoristas();
  const { guests, updateGuest } = useGuests();
  const { user: authUser } = useAuth();
  const { path } = useRoute();
  const { addNotification } = useNotifications();

  const [search, setSearch]     = useState('');
  const [mainTab, setMainTab]   = useState<MainTab>(() =>
    path.startsWith('/admin/visitantes') ? 'visitantes' : 'utilizadores'
  );
  const [userSub, setUserSub]   = useState<UserSubFilter>(() => {
    if (path === '/admin/utilizadores/clientes')        return 'clientes';
    if (path === '/admin/utilizadores/administradores') return 'admins';
    return 'todos';
  });
  const pathToGuestSub = (p: string): GuestSubFilter => {
    if (p === '/admin/visitantes/aguarda-documentos') return 'aguarda_documentos';
    if (p === '/admin/visitantes/em-analise')         return 'em_analise';
    if (p === '/admin/visitantes/aprovados')          return 'aprovado';
    if (p === '/admin/visitantes/rejeitados')         return 'rejeitado';
    return 'todos';
  };

  const [guestSub, setGuestSub] = useState<GuestSubFilter>(() => pathToGuestSub(path));

  // Sync state when sidebar navigation changes the path
  useEffect(() => {
    if (path.startsWith('/admin/visitantes')) {
      setMainTab('visitantes');
      setGuestSub(pathToGuestSub(path));
    } else {
      setMainTab('utilizadores');
      if (path === '/admin/utilizadores/clientes')        setUserSub('clientes');
      else if (path === '/admin/utilizadores/administradores') setUserSub('admins');
      else if (path === '/admin/utilizadores') setUserSub('todos');
    }
  }, [path]);

  // User modal state
  const [showUserModal, setShowUserModal]   = useState(false);
  const [editingUser, setEditingUser]       = useState<User | null>(null);
  const [detailUser, setDetailUser]         = useState<User | null>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(null);

  // Motorista modal state
  const [motoristaModal, setMotoristaModal]         = useState<'new' | Motorista | null>(null);
  const [deleteMotoristaConfirm, setDeleteMotoristaConfirm] = useState<string | null>(null);

  // Guest modal state
  const [reviewGuest, setReviewGuest] = useState<Guest | null>(null);

  // Suspend modal state
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendMotivo, setSuspendMotivo] = useState('');
  const [suspendError, setSuspendError] = useState('');

  const activePool = useMemo(() => users.filter(u => !u.xitique), [users]);

  const rows = useMemo((): Row[] => {
    const q = search.toLowerCase();

    if (mainTab === 'utilizadores') {
      return activePool
        .filter(u => {
          const matchSearch = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.telefone.includes(q);
          if (!matchSearch) return false;
          if (userSub === 'admins')   return u.role === 'admin';
          if (userSub === 'clientes') return u.role === 'cliente';
          return true;
        })
        .map(u => ({ kind: 'user', data: u } as Row));
    }

    if (mainTab === 'motoristas') {
      return motoristas
        .filter(m => !q || m.nome.toLowerCase().includes(q) || m.telefone.includes(q))
        .map(m => ({ kind: 'motorista', data: m } as Row));
    }

    return guests
      .filter(g => {
        const matchSearch = !q || g.nome.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || g.telefone.includes(q);
        if (!matchSearch) return false;
        if (guestSub === 'pendentes') return g.status !== 'aprovado' && g.status !== 'rejeitado';
        if (guestSub === 'aprovado')  return g.status === 'aprovado';
        if (guestSub !== 'todos')     return g.status === guestSub;
        return true;
      })
      .sort((a, b) => (a.intent === b.intent ? 0 : a.intent === 'aluguer' ? -1 : 1))
      .map(g => ({ kind: 'guest', data: g } as Row));
  }, [activePool, motoristas, guests, search, mainTab, userSub, guestSub]);

  const canManage = authUser?.role === 'admin';
  const [novoOpen, setNovoOpen] = useState(false);

  const handleSaveUser = (data: Omit<User, 'id' | 'dataCriacao' | 'ultimoAcesso' | 'totalAlugueres'>) => {
    if (editingUser) updateUser(editingUser.id, data);
    else addUser(data);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleEditUser = (user: User) => {
    setDetailUser(null);
    setEditingUser(user);
    setShowUserModal(true);
  };

  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <AcoesNecessarias />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Utilizadores',      value: activePool.length,                                           color: 'text-white' },
            { label: 'Ativos',            value: activePool.filter(u => u.status === 'ativo').length,         color: 'text-emerald-400' },
            { label: 'Visitantes',        value: guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length, color: 'text-amber-400' },
            { label: 'Motoristas disp.',  value: motoristas.filter(m => m.status === 'disponivel').length,    color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-white">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Search + Novo */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, email ou telefone..."
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {canManage && (
              <div className="relative">
                <button
                  onClick={() => setNovoOpen(o => !o)}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Novo
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {novoOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNovoOpen(false)} />
                    <div className="absolute right-0 mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                      <button
                        onClick={() => { setNovoOpen(false); setEditingUser(null); setShowUserModal(true); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-800 transition flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-md bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        Utilizador
                      </button>
                      <div className="h-px bg-zinc-800" />
                      <button
                        onClick={() => { setNovoOpen(false); setMotoristaModal('new'); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-800 transition flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-md bg-blue-400/15 border border-blue-400/30 flex items-center justify-center shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/><path d="M18 11l3 3-3 3"/></svg>
                        </div>
                        Motorista
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sub-filters — Visitantes */}
          {mainTab === 'visitantes' && (
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'todos',               label: 'Todos' },
                { value: 'aguarda_documentos',  label: 'Aguarda Docs', badge: guests.filter(g => g.status === 'aguarda_documentos' || g.status === 'documentos_submetidos').length || undefined },
                { value: 'em_analise',          label: 'Registrar',     badge: guests.filter(g => g.status === 'em_analise').length || undefined },
                { value: 'aprovado',            label: 'Aprovados' },
                { value: 'rejeitado',           label: 'Rejeitados' },
              ] as { value: GuestSubFilter; label: string; badge?: number }[]).map(sf => {
                const isActive  = guestSub === sf.value;
                const isUrgent  = !!sf.badge && sf.badge > 0 && !isActive;
                return (
                  <button key={sf.value}
                    onClick={() => setGuestSub(sf.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-zinc-950 border-amber-500'
                        : isUrgent
                        ? 'bg-zinc-900 text-red-400 border-red-500/40 animate-pulse hover:border-red-500/70 hover:text-red-300'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}>
                    {sf.label}
                    {sf.badge !== undefined && (
                      <span className={`min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-black px-1 ${
                        isActive ? 'bg-zinc-950/30 text-zinc-950' : 'bg-red-500/20 text-red-400'
                      }`}>{sf.badge}</span>
                    )}
                    {isUrgent && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-filters — Utilizadores */}
          {mainTab === 'utilizadores' && (
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'todos',    label: 'Todos' },
                { value: 'admins',   label: 'Administradores' },
                { value: 'clientes', label: 'Clientes' },
              ] as { value: UserSubFilter; label: string }[]).map(sf => (
                <button key={sf.value}
                  onClick={() => setUserSub(sf.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    userSub === sf.value
                      ? 'bg-amber-500 text-zinc-950 border-amber-500'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                  }`}>
                  {sf.label}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/40">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider hidden md:table-cell">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider hidden md:table-cell">Registo</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider hidden xl:table-cell">Restrição</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-white uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-white text-sm font-medium">
                      Nenhum resultado encontrado
                    </td>
                  </tr>
                )}

                {rows.map((row, rowIndex) => {
                  // Separator between aluguer / compra groups in visitantes tab
                  if (row.kind === 'guest') {
                    const prev = rows[rowIndex - 1];
                    const prevIntent = prev?.kind === 'guest' ? prev.data.intent : null;
                    const showSep = prevIntent !== null && prevIntent !== row.data.intent;
                    const showFirst = prevIntent === null;
                    const groupLabel = row.data.intent === 'aluguer' ? '🔑 Aluguer' : '🚗 Compra';
                    const guestRowEl = (
                      <GuestRow key={`g-${row.data.id}`} g={row.data} guestStatusConfig={guestStatusConfig}
                        onReview={setReviewGuest} onAdvance={(g, next) => next ? updateGuest(g.id, { status: next }) : setReviewGuest(g)} />
                    );
                    if (showSep || showFirst) {
                      return [
                        <tr key={`sep-${row.data.intent}-${row.data.id}`} className="bg-zinc-800/30">
                          <td colSpan={7} className="px-4 py-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{groupLabel}</span>
                          </td>
                        </tr>,
                        guestRowEl,
                      ];
                    }
                    return guestRowEl;
                  }

                  if (row.kind === 'user') {
                    const u = row.data;
                    const role   = roleConfig[u.role];
                    const status = userStatusConfig[u.status];
                    return (
                      <tr key={`u-${u.id}`} className="hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60">
                        <td className="px-4 py-3.5">
                          <button onClick={() => setDetailUser(u)} className="flex items-center gap-3 text-left">
                            <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xs font-black flex-shrink-0">
                              {initials(u.nome)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{u.nome}</p>
                              <p className="text-xs text-white mt-0.5">{u.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={`text-xs font-bold border rounded-md px-2 py-1 ${role.className}`}>{role.label}</span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-sm font-medium text-white">{u.telefone}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                            <span className="text-sm font-semibold text-white">{status.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-white">
                              {u.dataCriacao ? new Date(u.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                            </span>
                            {u.ultimoAcesso && u.ultimoAcesso !== u.dataCriacao && (
                              <span className="text-xs text-white">
                                Acesso: {new Date(u.ultimoAcesso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <span className={`text-xs font-bold border rounded-md px-2 py-1 ${restrictionConfig[u.restriction || 'nenhuma'].className}`}>
                            {restrictionConfig[u.restriction || 'nenhuma'].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setDetailUser(u)} className="p-1.5 text-white hover:text-white transition-colors rounded-lg hover:bg-zinc-700" title="Ver detalhes">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            {canManage && (
                              <>
                                <button onClick={() => handleEditUser(u)} className="p-1.5 text-white hover:text-white transition-colors rounded-lg hover:bg-zinc-700" title="Editar">
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                {authUser?.role === 'admin' && u.id !== authUser.id && (
                                  <>
                                    {u.status === 'suspenso' ? (
                                      <button
                                        onClick={() => { updateUser(u.id, { status: 'ativo', motivoSuspensao: '' }); addNotification('admin', 'Conta reactivada', `${u.nome} foi reactivado e pode voltar a aceder ao sistema.`, 'success'); }}
                                        title="Reactivar conta"
                                        className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors rounded-lg hover:bg-emerald-400/10"
                                      >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { setSuspendTarget(u); setSuspendMotivo(''); setSuspendError(''); }}
                                        title="Suspender conta"
                                        className="p-1.5 text-white hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-400/10"
                                      >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                      </button>
                                    )}
                                    <button onClick={() => setDeleteUserConfirm(u.id)} className="p-1.5 text-white hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10" title="Eliminar">
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Motorista row
                  const m  = row.data;
                  const st = motoristaStatusConfig[m.status];
                  return (
                    <tr key={`m-${m.id}`} className="hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-400/15 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xs font-black flex-shrink-0">
                            {initials(m.nome)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{m.nome}</p>
                            {m.observacoes && <p className="text-xs text-zinc-500 italic mt-0.5">{m.observacoes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-bold border rounded-md px-2 py-1 bg-blue-400/10 text-blue-400 border-blue-400/20">Motorista</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-sm font-medium text-white">{m.telefone}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          <span className="text-sm font-semibold text-white">{st.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm font-semibold text-white">
                          {m.dataCriacao ? new Date(m.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </span>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {m.bi    && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">BI: {m.bi}</span>}
                          {m.carta && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">Carta: {m.carta}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <span className="text-xs text-zinc-500">—</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <button onClick={() => setMotoristaModal(m)} className="p-1.5 text-white hover:text-white transition-colors rounded-lg hover:bg-zinc-700" title="Editar">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDeleteMotoristaConfirm(m.id)} className="p-1.5 text-white hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10" title="Remover">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
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
          {rows.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 text-xs font-semibold text-white">
              {rows.length} resultado(s)
            </div>
          )}
        </div>

      </div>

      {/* Guest review modal */}
      {reviewGuest && (
        <GuestReviewModal
          guest={reviewGuest}
          onClose={() => setReviewGuest(null)}
        />
      )}

      {/* User modals */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
        />
      )}
      {detailUser && authUser?.role === 'admin' && (
        <UserDetail
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => handleEditUser(detailUser)}
        />
      )}
      {deleteUserConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-1">Eliminar utilizador</h3>
            <p className="text-white text-sm mb-6">Esta ação é permanente e não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUserConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm transition-colors">Cancelar</button>
              <button onClick={() => {
                const target = users.find(u => u.id === deleteUserConfirm);
                deleteUser(deleteUserConfirm);
                if (target) addNotification('admin', 'Utilizador eliminado', `${target.nome} foi removido permanentemente do sistema.`, 'alert');
                setDeleteUserConfirm(null);
              }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg py-2 text-sm transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Motorista modals */}
      {motoristaModal && (
        <MotoristaModal
          initial={motoristaModal === 'new' ? undefined : motoristaModal}
          onSave={data => {
            if (motoristaModal === 'new') addMotorista(data);
            else updateMotorista(motoristaModal.id, data);
            setMotoristaModal(null);
          }}
          onClose={() => setMotoristaModal(null)}
        />
      )}
      {deleteMotoristaConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-1">Remover motorista</h3>
            <p className="text-white text-sm mb-6">Esta acção não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteMotoristaConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm transition-colors">Cancelar</button>
              <button onClick={() => { deleteMotorista(deleteMotoristaConfirm); setDeleteMotoristaConfirm(null); }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg py-2 text-sm transition-colors">Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rápido de suspensão */}
      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSuspendTarget(null); }}
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Suspender conta</p>
                <p className="text-xs text-zinc-400 truncate">{suspendTarget.nome}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  Motivo da suspensão
                  <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Obrigatório</span>
                </label>
                <textarea
                  value={suspendMotivo}
                  onChange={e => { setSuspendMotivo(e.target.value); if (e.target.value.trim()) setSuspendError(''); }}
                  placeholder="Ex: Incumprimento de pagamento, documentos inválidos, comportamento inadequado..."
                  rows={3}
                  className={`w-full bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors resize-none ${
                    suspendError ? 'border-red-500 focus:border-red-400' : 'border-zinc-700 focus:border-amber-500'
                  }`}
                />
                {suspendError && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/></svg>
                    {suspendError}
                  </p>
                )}
                <p className="text-[11px] text-zinc-500 mt-2">
                  Este motivo será visível ao utilizador no seu perfil.
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setSuspendTarget(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!suspendMotivo.trim()) { setSuspendError('Obrigatório indicar o motivo da suspensão'); return; }
                  updateUser(suspendTarget.id, { status: 'suspenso', motivoSuspensao: suspendMotivo.trim() });
                  addNotification('admin', 'Conta suspensa', `${suspendTarget.nome} foi suspenso. Motivo: ${suspendMotivo.trim()}`, 'warning');
                  setSuspendTarget(null);
                }}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg py-2.5 text-sm font-black transition-all"
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Next-status map ────────────────────────────────────────────────────────
const NEXT_STATUS: Partial<Record<GuestStatus, GuestStatus | null>> = {
  aguarda_documentos:    'em_analise',
  documentos_submetidos: 'em_analise',
  em_analise:            null, // null = open review modal
};

function GuestRow({ g, guestStatusConfig, onReview, onAdvance }: {
  g: Guest;
  guestStatusConfig: Record<GuestStatus, { label: string; dot: string }>;
  onReview: (g: Guest) => void;
  onAdvance: (g: Guest, next: GuestStatus | null) => void;
}) {
  const gs = guestStatusConfig[g.status];
  const nextStatus = NEXT_STATUS[g.status];
  const canAdvance = g.status in NEXT_STATUS;

  return (
    <tr className="hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60 cursor-pointer" onClick={() => onReview(g)}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-black flex-shrink-0">
            {g.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{g.nome}</p>
            <p className="text-xs text-white mt-0.5">{g.email}</p>
            {g.status === 'rejeitado' && g.notaAdmin && (
              <p className="text-[10px] text-red-400 mt-1 font-semibold leading-tight max-w-[220px]">✕ {g.notaAdmin}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <span className="text-xs font-bold border rounded-md px-2 py-1 bg-amber-500/10 text-amber-400 border-amber-500/20">
          Visitante · {g.intent === 'aluguer' ? 'Aluguer' : 'Compra'}
        </span>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell text-sm font-medium text-white">{g.telefone}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${gs.dot}`} />
          <span className="text-sm font-semibold text-white">{gs.label}</span>
          {canAdvance && (
            <button
              onClick={e => { e.stopPropagation(); onAdvance(g, nextStatus ?? null); }}
              title={nextStatus ? `→ ${guestStatusConfig[nextStatus]?.label ?? nextStatus}` : '→ Aprovar / Rejeitar'}
              className="p-0.5 text-amber-500 hover:text-amber-400 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell text-sm text-white">
        {new Date(g.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </td>
      <td className="px-4 py-3.5 hidden xl:table-cell">
        {g.vehicleName ? <span className="text-xs text-white">{g.vehicleName}</span> : <span className="text-xs text-zinc-600">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end">
          <button onClick={e => { e.stopPropagation(); onReview(g); }}
            className="p-1.5 text-white hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-400/10" title="Analisar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
