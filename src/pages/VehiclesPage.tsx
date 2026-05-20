import { useState, useMemo } from 'react';
import { useVehicles } from '../context/VehiclesContext';
import { AdminNav } from '../components/AdminNav';
import { VehicleModal } from '../components/VehicleModal';
import type { Vehicle, VehicleCategory, VehicleMode } from '../types/vehicle';

export function VehiclesPage({ onExit }: { onExit?: () => void }) {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<VehicleCategory | 'todos'>('todos');
  const [filterMode, setFilterMode] = useState<VehicleMode | 'todos'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'todos' || v.cat === filterCat;
      const matchMode = filterMode === 'todos' || v.mode === filterMode;
      return matchSearch && matchCat && matchMode;
    });
  }, [vehicles, search, filterCat, filterMode]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    aluguer: vehicles.filter(v => v.mode === 'aluguer').length,
    compra: vehicles.filter(v => v.mode === 'compra').length,
  }), [vehicles]);

  const handleSave = (data: Omit<Vehicle, 'id'>) => {
    if (editingVehicle) {
      updateVehicle(editingVehicle.id, data);
    } else {
      addVehicle(data);
    }
    setShowModal(false);
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav subtitle="Frota" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total na frota', value: stats.total, color: 'text-white' },
            { label: 'Para Aluguer', value: stats.aluguer, color: 'text-blue-400' },
            { label: 'Para Compra', value: stats.compra, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-300">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome do veículo..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as VehicleCategory | 'todos')}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="todos">Todas as categorias</option>
            <option value="suv">SUV</option>
            <option value="pickup">Pick-up</option>
            <option value="sedan">Sedan</option>
            <option value="hatchback">Hatchback</option>
            <option value="van">Van</option>
          </select>
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as VehicleMode | 'todos')}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="todos">Todas as modalidades</option>
            <option value="aluguer">Aluguer</option>
            <option value="compra">Compra</option>
          </select>
          <button
            onClick={() => { setEditingVehicle(null); setShowModal(true); }}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova viatura
          </button>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-300 uppercase tracking-wider">Veículo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-300 uppercase tracking-wider">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-300 uppercase tracking-wider">Modalidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-300 uppercase tracking-wider">Preço</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-400 text-sm">
                      Nenhuma viatura encontrada
                    </td>
                  </tr>
                )}
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={v.img} alt={v.name} className="w-12 h-8 object-cover rounded bg-zinc-800" />
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{v.name}</p>
                          <p className="text-xs text-zinc-400">{v.fuel} · {v.year} · {v.seats} lug.</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-300 uppercase">{v.cat}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs border rounded-md px-2 py-0.5 ${
                        v.mode === 'aluguer'
                          ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                          : 'bg-purple-400/10 text-purple-400 border-purple-400/20'
                      }`}>
                        {v.mode === 'aluguer' ? 'Aluguer' : 'Compra'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">{v.price}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-700"
                          title="Editar"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(v.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                          title="Eliminar"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
              {filtered.length} de {vehicles.length} viaturas
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <VehicleModal
          vehicle={editingVehicle}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingVehicle(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-10 h-10 bg-red-400/10 rounded-xl flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="text-white font-semibold mb-1">Eliminar viatura</h3>
            <p className="text-zinc-300 text-sm mb-6">Esta ação é permanente e removerá a viatura de todo o sistema.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm transition-colors">Cancelar</button>
              <button onClick={() => { deleteVehicle(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg py-2 text-sm transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
