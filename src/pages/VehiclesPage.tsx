import { useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { useVehicles, type VehicleData } from '../context/VehiclesContext';

const CATEGORIES = ['suv', 'pickup', 'sedan', 'hatchback', 'van'];
const MODES = ['aluguer', 'compra'];
const FUELS = ['Diesel', 'Gasolina', 'Híbrido', 'Eléctrico'];

const emptyForm: Omit<VehicleData, 'id'> = {
  name: '', brand: '', cat: 'suv', mode: 'aluguer', price: '', description: '', img: '', images: [], fuel: 'Gasolina', seats: 5, year: 2024, discount: 0, available: true,
};

export function VehiclesPage({ onExit }: { onExit: () => void }) {
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageInput, setImageInput] = useState('');
  const [filterCat, setFilterCat] = useState('todos');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = filterCat === 'todos' ? vehicles : vehicles.filter(v => v.cat === filterCat);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setImageInput('');
    setShowForm(true);
  };

  const openEdit = (v: VehicleData) => {
    setEditId(v.id);
    setForm({ 
      name: v.name, 
      brand: v.brand,
      cat: v.cat, 
      mode: v.mode, 
      price: v.price, 
      description: v.description ?? '',
      img: v.img, 
      images: [...v.images], 
      fuel: v.fuel, 
      seats: v.seats, 
      year: v.year,
      discount: v.discount ?? 0,
      available: v.available ?? true
    });
    setImageInput('');
    setShowForm(true);
  };

  const handleAddImage = () => {
    const url = imageInput.trim();
    if (url && !form.images.includes(url)) {
      setForm(f => ({ ...f, images: [...f.images, url] }));
      // If first image, also set as cover
      if (!form.img) setForm(f => ({ ...f, img: url }));
      setImageInput('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setForm(f => {
      const newImages = f.images.filter((_, i) => i !== idx);
      const newImg = newImages.length > 0 ? newImages[0] : '';
      return { ...f, images: newImages, img: f.img === f.images[idx] ? newImg : f.img };
    });
  };

  const handleSetCover = (url: string) => {
    setForm(f => ({ ...f, img: url }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price.trim() || !form.brand.trim()) return;
    const finalForm = {
      ...form,
      img: form.img || (form.images[0] ?? ''),
      images: form.images.length > 0 ? form.images : (form.img ? [form.img] : []),
    };
    if (editId !== null) {
      updateVehicle(editId, finalForm);
    } else {
      addVehicle(finalForm);
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    removeVehicle(id);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950" style={{ fontFamily: "'Archivo', sans-serif" }}>
      <AdminNav subtitle="Gestão de Veículos" onExit={onExit} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Veículos</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{vehicles.length} veículos no catálogo</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Adicionar Veículo
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['todos', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterCat === c
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {c === 'todos' ? 'Todos' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Vehicle list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden group">
              <div className="relative h-40 bg-zinc-800">
                {v.img ? (
                  <img src={v.img} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-3xl">🚗</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    v.mode === 'aluguer' ? 'bg-blue-500/90 text-white' : 'bg-amber-500/90 text-zinc-950'
                  }`}>{v.mode}</span>
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-950/70 text-white border border-zinc-700/50">
                  {v.cat}
                </div>
                {v.images.length > 1 && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-semibold">
                    📷 {v.images.length} fotos
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-white font-bold text-sm">{v.name}</h3>
                    <p className="text-zinc-400 text-xs mt-0.5">{v.year} · {v.fuel} · {v.seats} lugares</p>
                  </div>
                  <div className="text-amber-400 font-black text-xs text-right whitespace-nowrap">{v.price}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border border-zinc-700 text-white hover:bg-zinc-800 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(v.id)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-500 text-sm">
            Nenhum veículo encontrado nesta categoria.
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Remover veículo?</h3>
            <p className="text-zinc-400 text-sm mb-5">Esta ação não pode ser revertida. O veículo será removido do catálogo.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-zinc-700 text-white hover:bg-zinc-800 transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-400 transition">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-white font-bold text-base">{editId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition">×</button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Nome e Marca */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Nome do veículo *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Land Cruiser Prado"
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Marca *</label>
                  <input
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Ex: Toyota"
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Categoria + Modo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Categoria</label>
                  <select
                    value={form.cat}
                    onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
                    className="w-full appearance-none rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Modalidade</label>
                  <select
                    value={form.mode}
                    onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                    className="w-full appearance-none rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {MODES.map(m => <option key={m} value={m} className="bg-zinc-900">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Preço + Combustível */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Preço *</label>
                  <input
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="Ex: 4.500 MT/dia"
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Combustível</label>
                  <select
                    value={form.fuel}
                    onChange={e => setForm(f => ({ ...f, fuel: e.target.value }))}
                    className="w-full appearance-none rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {FUELS.map(f => <option key={f} value={f} className="bg-zinc-900">{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Lugares + Ano */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Lugares</label>
                  <input
                    type="number"
                    value={form.seats}
                    onChange={e => setForm(f => ({ ...f, seats: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Ano</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || 2024 }))}
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Desconto + Disponibilidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Desconto (%)</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 cursor-pointer h-full pb-2">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                    />
                    <span className="text-white text-sm font-medium">Disponível</span>
                  </label>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-white text-sm font-medium block mb-1.5">Descrição detalhada</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva as características, vantagens e detalhes do veículo..."
                  rows={4}
                  className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              {/* Imagens */}
              <div>
                <label className="text-white text-sm font-medium block mb-1.5">Imagens ({form.images.length})</label>
                <div className="flex gap-2">
                  <input
                    value={imageInput}
                    onChange={e => setImageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                    placeholder="Cole o URL da imagem e pressione Enter"
                    className="flex-1 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                  <button
                    onClick={handleAddImage}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition"
                  >
                    +
                  </button>
                </div>

                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group/img rounded-xl overflow-hidden border border-zinc-800 h-20">
                        <img src={url} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSetCover(url)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                              form.img === url ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                            }`}
                          >
                            {form.img === url ? '★ Capa' : 'Capa'}
                          </button>
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/80 text-white font-bold hover:bg-red-400 transition"
                          >
                            ✕
                          </button>
                        </div>
                        {form.img === url && (
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500 text-zinc-950">
                            CAPA
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-zinc-700 text-white hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.price.trim() || !form.brand.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                    form.name.trim() && form.price.trim() && form.brand.trim()
                      ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {editId ? 'Guardar Alterações' : 'Adicionar Veículo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
