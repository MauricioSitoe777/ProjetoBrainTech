import { useState } from 'react';
import { useMotoristas } from '../context/MotoristasContext';
import type { Motorista, MotoristaSatus } from '../types/motorista';

const STATUS_CFG: Record<MotoristaSatus, { label: string; className: string }> = {
  disponivel:  { label: 'Disponível',   className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  em_servico:  { label: 'Em Serviço',   className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  inativo:     { label: 'Inativo',      className: 'bg-zinc-700 text-white border-zinc-600' },
};

const EMPTY = { nome: '', telefone: '', bi: '', carta: '', status: 'disponivel' as MotoristaSatus, observacoes: '' };

function Modal({ initial, onSave, onClose }: {
  initial?: Partial<Motorista>;
  onSave: (data: Omit<Motorista, 'id' | 'dataCriacao'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const field = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) return;
    onSave({
      nome:        form.nome.trim(),
      telefone:    form.telefone.trim(),
      bi:          form.bi.trim() || undefined,
      carta:       form.carta.trim() || undefined,
      status:      form.status,
      observacoes: form.observacoes.trim() || undefined,
    });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-black text-white">{initial?.id ? 'Editar Motorista' : 'Novo Motorista'}</h2>
          <button type="button" onClick={onClose} className="text-white hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

export function MotoristasPage({ onExit }: { onExit?: () => void }) {
  const { motoristas, addMotorista, updateMotorista, deleteMotorista } = useMotoristas();
  const [modal, setModal] = useState<'new' | Motorista | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const disponiveis = motoristas.filter(m => m.status === 'disponivel').length;
  const emServico   = motoristas.filter(m => m.status === 'em_servico').length;

  return (
    <div className="bg-zinc-950 text-white">
      {modal && (
        <Modal
          initial={modal === 'new' ? undefined : modal}
          onSave={data => {
            if (modal === 'new') addMotorista(data);
            else updateMotorista(modal.id, data);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="text-white font-bold text-sm">Remover motorista?</p>
            <p className="text-white text-xs">Esta acção não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm font-semibold">Cancelar</button>
              <button onClick={() => { deleteMotorista(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg py-2 text-sm font-semibold">Remover</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-5 sm:px-8 py-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',        value: motoristas.length, color: 'text-white',        dot: 'bg-zinc-400' },
            { label: 'Disponíveis',  value: disponiveis,       color: 'text-emerald-400',  dot: 'bg-emerald-400' },
            { label: 'Em Serviço',   value: emServico,         color: 'text-blue-400',     dot: 'bg-blue-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${k.dot}`} />
                <span className="text-xs text-white uppercase font-bold tracking-wide">{k.label}</span>
              </div>
              <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Header + add button */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Lista de Motoristas</h2>
          <button onClick={() => setModal('new')}
            className="text-xs px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black transition-all">
            + Adicionar
          </button>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/40">
                <th className="text-left px-5 py-4 text-xs text-white font-bold uppercase tracking-wider">Motorista</th>
                <th className="text-left px-5 py-4 text-xs text-white font-bold uppercase tracking-wider hidden sm:table-cell">Documentos</th>
                <th className="text-left px-5 py-4 text-xs text-white font-bold uppercase tracking-wider">Estado</th>
                <th className="px-5 py-4 text-xs text-white font-bold uppercase tracking-wider text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {motoristas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-white text-sm">Sem motoristas registados</td>
                </tr>
              )}
              {motoristas.map(m => {
                const st = STATUS_CFG[m.status];
                return (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-white">{m.nome}</p>
                      <p className="text-xs text-white">{m.telefone}</p>
                      {m.observacoes && <p className="text-[10px] text-white italic mt-0.5">{m.observacoes}</p>}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex gap-2 flex-wrap">
                        {m.bi && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-white px-2 py-0.5 rounded-md">BI: {m.bi}</span>}
                        {m.carta && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-white px-2 py-0.5 rounded-md">Carta: {m.carta}</span>}
                        {!m.bi && !m.carta && <span className="text-[10px] text-white italic">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs border rounded-md px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal(m)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all">
                          Editar
                        </button>
                        <button onClick={() => setConfirmDelete(m.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold transition-all">
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {motoristas.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800 text-xs text-white">
              {motoristas.length} motorista(s) registado(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
