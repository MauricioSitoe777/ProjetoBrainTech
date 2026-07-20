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
import { useRoute } from '../hooks/useRoute';
import { useNotifications } from '../context/NotificationsContext';
import { useReservations } from '../context/ReservationsContext';
import { useVehicles } from '../context/VehiclesContext';
import { IconKey, IconCar } from '../components/Icons';

// ── Configs ────────────────────────────────────────────────────────────────

const roleConfig = {
  admin:    { label: 'Administrador', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  cliente:  { label: 'Cliente',       className: 'bg-zinc-800 text-white border-zinc-700' },
};

const userStatusConfig = {
  ativo:    { label: 'Activo',    dot: 'bg-emerald-400' },
  inativo:  { label: 'Inactivo', dot: 'bg-zinc-500' },
  suspenso: { label: 'Suspenso',  dot: 'bg-red-400' },
  pendente: { label: 'Pendente',  dot: 'bg-amber-400 animate-pulse' },
};

const motoristaStatusConfig: Record<MotoristaSatus, { label: string; dot: string; badge: string }> = {
  disponivel: { label: 'Disponível',  dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  em_servico: { label: 'Em Serviço',  dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  inativo:    { label: 'Inactivo',    dot: 'bg-zinc-500',    badge: 'bg-zinc-800 text-white border-zinc-700' },
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

function firstLast(nome: string) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length <= 1) return nome;
  return `${parts[0]} ${parts[parts.length - 1]}`;
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
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-black text-white">{initial?.id ? 'Editar Motorista' : 'Novo Motorista'}</h2>
          <button type="button" onClick={onClose} className="text-white hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          if (!form.nome.trim() || !form.telefone.trim()) return;
          onSave({ nome: form.nome.trim(), telefone: form.telefone.trim(), bi: form.bi.trim() || undefined, carta: form.carta.trim() || undefined, status: form.status, observacoes: form.observacoes.trim() || undefined });
        }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-white mb-1">Nome completo *</label>
            <input value={form.nome} onChange={set('nome')} required placeholder="António Cossa" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Telefone *</label>
              <input value={form.telefone} onChange={set('telefone')} required placeholder="+258 84 000 0000" className={field} />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Estado</label>
              <select value={form.status} onChange={set('status')} className={field}>
                <option value="disponivel">Disponível</option>
                <option value="em_servico">Em Serviço</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Nº BI</label>
              <input value={form.bi} onChange={set('bi')} placeholder="000000000A" className={field} />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Carta de condução</label>
              <input value={form.carta} onChange={set('carta')} placeholder="Nº da carta" className={field} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Observações</label>
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

export function UsersPage({ onExit: _onExit }: { onExit?: () => void }) {
  const { users, addUser, updateUser, deleteUser } = useUsers();
  const { motoristas, addMotorista, updateMotorista, deleteMotorista } = useMotoristas();
  const { guests, updateGuest, deleteGuest } = useGuests();
  const { user: authUser } = useAuth();
  const { path } = useRoute();
  const { addNotification } = useNotifications();
  const { createReservation } = useReservations();
  const { vehicles } = useVehicles();

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

  const handleColocarNosInternos = async (g: Guest) => {
    const senha = g.senhaGerada ?? Math.random().toString(36).slice(-8);
    const newUser = await addUser({
      nome: g.nome,
      email: g.email,
      telefone: g.telefone,
      role: 'cliente',
      status: 'ativo',
      regularity: 'regular',
      restriction: 'nenhuma',
      password: senha,
      mustChangePassword: true,
      documentos: (g.documentos ?? {}) as any,
    });

    if (g.intent === 'aluguer') {
      const aluguerVehicles = vehicles.filter(v => v.mode === 'aluguer');
      const matched =
        aluguerVehicles.find(v =>
          v.name.toLowerCase().includes((g.vehicleName ?? '').toLowerCase().trim()) ||
          (g.vehicleName ?? '').toLowerCase().includes(v.name.toLowerCase().trim())
        ) ?? aluguerVehicles[0];

      if (matched) {
        const addDays = (n: number) => {
          const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
        };
        const notaVeiculo = g.vehicleName && g.vehicleName !== matched.name
          ? `Viatura solicitada pelo cliente: "${g.vehicleName}". ` : '';
        createReservation({
          vehicleId: matched.id, userId: newUser.id,
          clientName: g.nome, clientEmail: g.email, clientPhone: g.telefone,
          dataInicio: addDays(10), dataFim: addDays(13),
          horaLevantamento: '08:00', horaDevolucao: '18:00',
          status: 'pendente', valorTotal: 0, deposito: 0,
          notas: `${notaVeiculo}Pedido criado automaticamente a partir de visitante. Datas e valor a confirmar com o cliente.`,
        });
      }
    }

    deleteGuest(g.id);
    addNotification('admin', 'Utilizador criado', `${g.nome} foi adicionado como cliente interno.`, 'success', undefined, '/admin/utilizadores/clientes');
  };

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
        .sort((a, b) => (b.dataCriacao ?? '').localeCompare(a.dataCriacao ?? ''))
        .map(u => ({ kind: 'user', data: u } as Row));
    }

    if (mainTab === 'motoristas') {
      return motoristas
        .filter(m => !q || m.nome.toLowerCase().includes(q) || m.telefone.includes(q))
        .sort((a, b) => (b.dataCriacao ?? '').localeCompare(a.dataCriacao ?? ''))
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
      .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
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

  // ── Stats por tab ─────────────────────────────────────────────────────────
  const kpiCards = useMemo(() => {
    if (mainTab === 'utilizadores') return [
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, value: activePool.length, label: 'Total', sub: 'Utilizadores', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>, value: activePool.filter(u => u.status === 'ativo').length, label: 'Activos', sub: 'Utilizadores', col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>, value: activePool.filter(u => u.status === 'suspenso').length, label: 'Suspensos', sub: 'Utilizadores', col: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>, value: activePool.filter(u => u.status === 'inativo').length, label: 'Inactivos', sub: 'Utilizadores', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
    ];
    if (mainTab === 'motoristas') return [
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>, value: motoristas.length, label: 'Total', sub: 'Motoristas', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/><polyline points="16 11 18 13 22 9"/></svg>, value: motoristas.filter(m => m.status === 'disponivel').length, label: 'Disponíveis', sub: 'Motoristas', col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, value: motoristas.filter(m => m.status === 'em_servico').length, label: 'Em Serviço', sub: 'Motoristas', col: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>, value: motoristas.filter(m => m.status === 'inativo').length, label: 'Inactivos', sub: 'Motoristas', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
    ];
    return [
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, value: guests.length, label: 'Total', sub: 'Visitantes', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, value: guests.filter(g => g.status !== 'aprovado' && g.status !== 'rejeitado').length, label: 'Pendentes', sub: 'Visitantes', col: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, value: guests.filter(g => g.status === 'aprovado').length, label: 'Aprovados', sub: 'Visitantes', col: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>, value: guests.filter(g => g.status === 'rejeitado').length, label: 'Rejeitados', sub: 'Visitantes', col: 'text-white', bg: 'bg-zinc-700/40 border-zinc-600' },
    ];
  }, [mainTab, activePool, motoristas, guests]);

  return (
    <div className="bg-zinc-950 text-white">
      <div className="w-full px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">
              {mainTab === 'utilizadores' ? 'Utilizadores' : mainTab === 'motoristas' ? 'Motoristas' : 'Visitantes'}
            </h1>
            <p className="text-xs text-white mt-0.5">Gestão de pessoas no sistema</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map(k => (
            <div key={k.label} className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="h-0.5 w-full bg-amber-500/40" />
              <div className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${k.bg} ${k.col}`}>
                  {k.icon}
                </div>
                <div>
                  <p className={`text-2xl font-black leading-none tabular-nums ${k.col}`}>{k.value}</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5">{k.label}</p>
                  <p className="text-xs text-white">{k.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Tabs + Novo — tudo numa linha */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Search pequeno */}
          <div className="relative w-52 shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-8 pr-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Sub-filters — Utilizadores */}
          {mainTab === 'utilizadores' && ([
            { value: 'todos',    label: 'Todos' },
            { value: 'admins',   label: 'Administradores' },
            { value: 'clientes', label: 'Clientes' },
          ] as { value: UserSubFilter; label: string }[]).map(sf => (
            <button key={sf.value}
              onClick={() => setUserSub(sf.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors whitespace-nowrap ${
                userSub === sf.value
                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                  : 'bg-zinc-900 text-white border-zinc-700 hover:border-zinc-500'
              }`}>
              {sf.label}
            </button>
          ))}

          {/* Sub-filters — Visitantes */}
          {mainTab === 'visitantes' && ([
            { value: 'todos',              label: 'Todos',        count: guests.length,                                                                                          urgent: false },
            { value: 'aguarda_documentos', label: 'Aguarda Docs', count: guests.filter(g => g.status === 'aguarda_documentos' || g.status === 'documentos_submetidos').length,  urgent: true  },
            { value: 'em_analise',         label: 'Registrar',    count: guests.filter(g => g.status === 'em_analise').length,                                                   urgent: true  },
            { value: 'aprovado',           label: 'Aprovados',    count: guests.filter(g => g.status === 'aprovado').length,                                                     urgent: false },
            { value: 'rejeitado',          label: 'Rejeitados',   count: guests.filter(g => g.status === 'rejeitado').length,                                                    urgent: false },
          ] as { value: GuestSubFilter; label: string; count: number; urgent: boolean }[]).map(sf => {
            const isActive = guestSub === sf.value;
            const isUrgent = sf.urgent && sf.count > 0 && !isActive;
            return (
              <button key={sf.value}
                onClick={() => setGuestSub(sf.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 border-amber-500'
                    : isUrgent
                    ? 'bg-zinc-900 text-red-400 border-red-500/40 hover:border-red-500/70'
                    : 'bg-zinc-900 text-white border-zinc-700 hover:border-zinc-500'
                }`}>
                {sf.label}
                <span className={`min-w-[18px] h-5 flex items-center justify-center rounded-full text-xs font-black px-1 ${
                  isActive
                    ? 'bg-zinc-950/30 text-zinc-950'
                    : isUrgent
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-zinc-700/60 text-zinc-400'
                }`}>{sf.count}</span>
              </button>
            );
          })}

          {/* Spacer + Novo */}
          <div className="ml-auto relative shrink-0">
            {canManage && mainTab !== 'visitantes' && (
              <>
                <button
                  onClick={() => setNovoOpen(o => !o)}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl px-5 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Novo
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {novoOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNovoOpen(false)} />
                    <div className="absolute right-0 mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[170px]">
                      <button
                        onClick={() => { setNovoOpen(false); setEditingUser(null); setShowUserModal(true); }}
                        className="w-full text-left px-5 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        Utilizador
                      </button>
                      <div className="h-px bg-zinc-800" />
                      <button
                        onClick={() => { setNovoOpen(false); setMotoristaModal('new'); }}
                        className="w-full text-left px-5 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/><path d="M18 11l3 3-3 3"/></svg>
                        </div>
                        Motorista
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/70">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
              {mainTab === 'utilizadores' ? 'Utilizadores' : mainTab === 'motoristas' ? 'Motoristas' : 'Visitantes'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-700/60 bg-zinc-800/40">
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap w-8">#</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">Nome</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap hidden sm:table-cell w-[110px]">Tipo</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap hidden md:table-cell w-[130px]">Telefone</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap w-[100px]">Estado</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap hidden md:table-cell w-[120px]">Registo</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap hidden lg:table-cell w-[100px]">Restrição</th>
                  <th className="text-right px-3 py-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap w-[180px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-white text-sm font-medium">
                      Nenhum resultado encontrado
                    </td>
                  </tr>
                )}

                {(() => {
                  let dataRowCount = 0;
                  return rows.map((row, rowIndex) => {
                  // Separator between aluguer / compra groups in visitantes tab
                  if (row.kind === 'guest') {
                    const prev = rows[rowIndex - 1];
                    const prevIntent = prev?.kind === 'guest' ? prev.data.intent : null;
                    const showSep = prevIntent !== null && prevIntent !== row.data.intent;
                    const showFirst = prevIntent === null;
                    const groupLabel = row.data.intent === 'aluguer'
                      ? <span className="flex items-center gap-1.5"><IconKey size={12} /> Aluguer</span>
                      : <span className="flex items-center gap-1.5"><IconCar size={12} /> Compra</span>;
                    dataRowCount++;
                    const guestRowEl = (
                      <GuestRow key={`g-${row.data.id}`} g={row.data} guestStatusConfig={guestStatusConfig}
                        onReview={setReviewGuest} onAdvance={(g, next) => next ? updateGuest(g.id, { status: next }) : setReviewGuest(g)}
                        onColocarNosInternos={handleColocarNosInternos}
                        rowNum={dataRowCount} />
                    );
                    if (showSep || showFirst) {
                      return [
                        <tr key={`sep-${row.data.intent}-${row.data.id}`} className="bg-zinc-800/30">
                          <td colSpan={8} className="px-4 py-1.5">
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
                    dataRowCount++;
                    return (
                      <tr key={`u-${u.id}`} className={`hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60 ${dataRowCount % 2 === 0 ? 'bg-zinc-800/50' : ''}`}>
                        <td className="px-4 py-2 text-[10px] font-black text-white tabular-nums w-8">{dataRowCount}</td>
                        <td className="px-4 py-2 max-w-0">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{firstLast(u.nome)}</p>
                            <p className="text-[10px] text-white mt-0.5 truncate">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${role.className}`}>{role.label}</span>
                        </td>
                        <td className="px-4 py-2 hidden md:table-cell text-xs font-medium text-white whitespace-nowrap">{u.telefone}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                            <span className="text-xs font-semibold text-white whitespace-nowrap">{status.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-white whitespace-nowrap">
                              {u.dataCriacao ? new Date(u.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                            </span>
                            {u.ultimoAcesso && u.ultimoAcesso !== u.dataCriacao && (
                              <span className="text-[10px] text-white whitespace-nowrap">
                                Acesso: {new Date(u.ultimoAcesso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 hidden lg:table-cell">
                          <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${restrictionConfig[u.restriction || 'nenhuma'].className}`}>
                            {restrictionConfig[u.restriction || 'nenhuma'].label}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-0.5">
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
                  dataRowCount++;
                  return (
                    <tr key={`m-${m.id}`} className={`hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60 ${dataRowCount % 2 === 0 ? 'bg-zinc-800/50' : ''}`}>
                      <td className="px-4 py-2 text-[10px] font-black text-white tabular-nums w-8">{dataRowCount}</td>
                      <td className="px-4 py-2 max-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{firstLast(m.nome)}</p>
                          {m.observacoes && <p className="text-[10px] text-white italic mt-0.5 truncate">{m.observacoes}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        <span className="text-[10px] font-bold border rounded-md px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Motorista</span>
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell text-xs font-medium text-white whitespace-nowrap">{m.telefone}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                          <span className="text-xs font-semibold text-white whitespace-nowrap">{st.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell">
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {m.dataCriacao ? new Date(m.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </span>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          {m.bi    && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-white px-1.5 py-0.5 rounded-md">BI: {m.bi}</span>}
                          {m.carta && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-white px-1.5 py-0.5 rounded-md">Carta: {m.carta}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <span className="text-[10px] text-white">—</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-0.5">
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
                  })
                })()}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-800 text-[10px] font-semibold text-white">
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
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-6 max-w-sm w-full">
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
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-1">Remover motorista</h3>
            <p className="text-white text-sm mb-6">Esta ação não pode ser desfeita.</p>
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
          <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Suspender conta</p>
                <p className="text-xs text-white truncate">{suspendTarget.nome}</p>
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
                <p className="text-[11px] text-white mt-2">
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

function GuestRow({ g, guestStatusConfig, onReview, onAdvance, onColocarNosInternos, rowNum }: {
  g: Guest;
  guestStatusConfig: Record<GuestStatus, { label: string; dot: string }>;
  onReview: (g: Guest) => void;
  onAdvance: (g: Guest, next: GuestStatus | null) => void;
  onColocarNosInternos?: (g: Guest) => void;
  rowNum?: number;
}) {
  const gs = guestStatusConfig[g.status];
  const nextStatus = NEXT_STATUS[g.status];
  const canAdvance = g.status in NEXT_STATUS;

  return (
    <tr className={`hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/60 cursor-pointer ${(rowNum ?? 0) % 2 === 0 ? 'bg-zinc-800/50' : ''}`} onClick={() => onReview(g)}>
      <td className="px-3 py-1.5 text-[10px] font-black text-white tabular-nums w-8">{rowNum ?? ''}</td>
      <td className="px-3 py-1.5 max-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{firstLast(g.nome)}</p>
          <p className="text-[10px] text-white/60 truncate">{g.email}</p>
          {g.status === 'rejeitado' && g.notaAdmin && (
            <p className="text-[10px] text-red-400 font-semibold leading-tight truncate">✕ {g.notaAdmin}</p>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 hidden sm:table-cell">
        <span className="text-[10px] font-bold border rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap">
          {g.intent === 'aluguer' ? 'Aluguer' : 'Compra'}
        </span>
      </td>
      <td className="px-3 py-1.5 hidden md:table-cell text-[11px] font-medium text-white whitespace-nowrap">{g.telefone}</td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gs.dot}`} />
          <span className="text-[11px] font-semibold text-white whitespace-nowrap">{gs.label}</span>
          {canAdvance && (
            <button
              onClick={e => { e.stopPropagation(); onAdvance(g, nextStatus ?? null); }}
              title={nextStatus ? `→ ${guestStatusConfig[nextStatus]?.label ?? nextStatus}` : '→ Aprovar / Rejeitar'}
              className="p-0.5 text-amber-500 hover:text-amber-400 transition-colors shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 hidden md:table-cell text-[11px] font-semibold text-white whitespace-nowrap">
        {new Date(g.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </td>
      <td className="px-3 py-1.5 hidden lg:table-cell">
        {g.vehicleName ? <span className="text-[10px] text-white/80 truncate block max-w-[90px]">{g.vehicleName}</span> : <span className="text-[10px] text-white/30">—</span>}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center justify-end gap-1.5">
          {g.status === 'aprovado' && onColocarNosInternos && (
            <button
              onClick={e => { e.stopPropagation(); onColocarNosInternos(g); }}
              className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold whitespace-nowrap transition-all"
            >
              Adicionar aos Utilizadores
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onReview(g); }}
            className="p-1 text-white/50 hover:text-amber-400 transition-colors rounded hover:bg-amber-400/10" title="Analisar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
