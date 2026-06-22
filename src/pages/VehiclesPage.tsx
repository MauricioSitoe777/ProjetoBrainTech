import { useState, useMemo, useRef } from 'react';
import { useVehicles, type VehicleData } from '../context/VehiclesContext';
import { useReservations } from '../context/ReservationsContext';

const CATEGORIES = ['suv', 'pickup', 'sedan', 'hatchback', 'van'];
const MODES = ['aluguer', 'compra'];
const FUELS = ['Diesel', 'Gasolina', 'Híbrido', 'Eléctrico'];

const emptyForm: Omit<VehicleData, 'id'> = {
  name: '', brand: '', cat: 'suv', mode: 'aluguer', price: '', description: '', img: '', images: [], fuel: 'Gasolina', seats: 5, year: 2024, discount: 0, available: true, matricula: '',
};

export function VehiclesPage({ onExit: _onExit }: { onExit?: () => void }) {
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { reservations, blocks } = useReservations();
  const [showForm, setShowForm] = useState(false);

  const vehicleStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const emAluguerIds = new Set(
      reservations.filter(r => r.status === 'ativa').map(r => r.vehicleId)
    );
    const reservadasIds = new Set(
      reservations
        .filter(r => (r.status === 'confirmada' || r.status === 'pendente') && !emAluguerIds.has(r.vehicleId))
        .map(r => r.vehicleId)
    );
    const manutencaoIds = new Set<number>();
    blocks
      .filter(b => b.motivo === 'manutencao' && b.dataInicio <= today && b.dataFim >= today)
      .forEach(b => {
        if (b.vehicleId !== null) {
          manutencaoIds.add(b.vehicleId);
        } else {
          vehicles.forEach(v => manutencaoIds.add(v.id));
        }
      });
    const occupied = new Set([...emAluguerIds, ...reservadasIds, ...manutencaoIds]);
    return {
      total:       vehicles.length,
      disponiveis: vehicles.filter(v => v.available && !occupied.has(v.id)).length,
      emAluguer:   emAluguerIds.size,
      reservadas:  reservadasIds.size,
      emManutencao: manutencaoIds.size,
    };
  }, [vehicles, reservations, blocks]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageInput, setImageInput] = useState('');
  const [filterCat, setFilterCat] = useState('todos');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = filterCat === 'todos' ? vehicles : vehicles.filter(v => v.cat === filterCat);

  const openAdd = () => {
    console.log('[VehiclesPage] openAdd — a abrir formulário');
    setEditId(null);
    setForm(emptyForm);
    setImageInput('');
    setShowForm(true);
  };

  const openEdit = (v: VehicleData) => {
    setEditId(v.id);
    setForm({ 
      name: v.name || '', 
      brand: v.brand || '',
      cat: v.cat || 'suv', 
      mode: (v.mode as any) || 'aluguer', 
      price: v.price || '', 
      description: v.description ?? '',
      img: v.img || '', 
      images: Array.isArray(v.images) ? [...v.images] : [], 
      fuel: v.fuel || 'Gasolina', 
      seats: v.seats || 5, 
      year: v.year || 2024,
      discount: v.discount ?? 0,
      available: v.available ?? true,
      matricula: v.matricula ?? '',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');

    const compress = (src: string, maxW = 800, quality = 0.75): Promise<string> =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = src;
      });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compress(reader.result as string);
        setForm(f => ({
          ...f,
          images: [...f.images, compressed],
          img: f.img || compressed,
        }));
      } catch {
        setUploadError('Erro ao processar imagem. Tenta novamente.');
      }
      setUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o ficheiro. Tenta novamente.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log('[VehiclesPage] handleSubmit — nome:', form.name, '| preço:', form.price, '| editId:', editId);
    if (!form.name.trim() || !form.price.trim()) {
      console.warn('[VehiclesPage] submit bloqueado — nome ou preço em falta');
      return;
    }

    const autoBrand = form.name.trim().split(' ')[0] || '';
    const finalForm = {
      ...form,
      brand: autoBrand,
      img: form.img || (form.images[0] ?? ''),
      images: form.images.length > 0 ? form.images : (form.img ? [form.img] : []),
    };
    console.log('[VehiclesPage] a enviar para API:', finalForm);
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
    <div className="bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Veículos</h1>
            <p className="text-sm text-white mt-0.5">{vehicles.length} veículos no catálogo</p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total de Viaturas', value: vehicleStats.total,        color: 'text-white',       dot: 'bg-white' },
            { label: 'Disponíveis',       value: vehicleStats.disponiveis,  color: 'text-emerald-400', dot: 'bg-emerald-400' },
            { label: 'Em Aluguer',        value: vehicleStats.emAluguer,    color: 'text-blue-400',    dot: 'bg-blue-400' },
            { label: 'Reservadas',        value: vehicleStats.reservadas,   color: 'text-orange-400',  dot: 'bg-orange-400' },
            { label: 'Em Manutenção',     value: vehicleStats.emManutencao, color: 'text-red-400',     dot: 'bg-red-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
                <span className="text-xs text-white uppercase font-bold tracking-wide leading-tight">{k.label}</span>
              </div>
              <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
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
                  : 'text-white hover:text-white border border-zinc-800'
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
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl">🚗</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    v.mode === 'aluguer' ? 'bg-blue-500/90 text-white' : 'bg-amber-500/90 text-zinc-950'
                  }`}>{v.mode}</span>
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-950/70 text-white border border-zinc-700/50">
                  {v.cat}
                </div>
                {v.images && v.images.length > 1 && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-semibold">
                    📷 {v.images.length} fotos
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-white font-bold text-sm">{v.name}</h3>
                    <p className="text-white text-xs mt-0.5">{v.year} · {v.fuel} · {v.seats} lugares{v.matricula ? ` · ${v.matricula}` : ''}</p>
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
          <div className="text-center py-16 text-white text-sm">
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
            <p className="text-white text-sm mb-5">Esta ação não pode ser revertida. O veículo será removido do catálogo.</p>
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
            <form onSubmit={handleSubmit}>
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-white font-bold text-base">{editId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-zinc-800 text-white hover:text-white flex items-center justify-center transition">×</button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {/* Marca (Campo Único) */}
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Marca / Modelo *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Ford Ranger Raptor"
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                  />
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
                    <div className="relative">
                      <input
                        required
                        inputMode="numeric"
                        value={form.price.replace(/\s*(MT\/dia|MT)\s*$/, '')}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '');
                          if (!digits) { setForm(f => ({ ...f, price: '' })); return; }
                          const formatted = parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          const suffix = form.mode === 'aluguer' ? ' MT/dia' : ' MT';
                          setForm(f => ({ ...f, price: formatted + suffix }));
                        }}
                        placeholder={form.mode === 'aluguer' ? '4.500' : '7.200.000'}
                        className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 pl-4 pr-20 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-amber-400 pointer-events-none">
                        {form.mode === 'aluguer' ? 'MT/dia' : 'MT'}
                      </span>
                    </div>
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

                {/* Matrícula */}
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">Matrícula</label>
                  <input
                    value={form.matricula ?? ''}
                    onChange={e => setForm(f => ({ ...f, matricula: e.target.value.toUpperCase() }))}
                    placeholder="Ex: MZ-12-AB-34"
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 font-mono tracking-widest uppercase"
                  />
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
                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-3 cursor-pointer pb-1">
                      <input
                        type="checkbox"
                        checked={form.available}
                        onChange={e => setForm(f => ({ ...f, available: e.target.checked, motivoIndisponibilidade: e.target.checked ? '' : f.motivoIndisponibilidade }))}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                      />
                      <span className="text-white text-sm font-medium">Disponível</span>
                    </label>
                    {!form.available && (
                      <input
                        type="text"
                        value={(form as any).motivoIndisponibilidade ?? ''}
                        onChange={e => setForm(f => ({ ...f, motivoIndisponibilidade: e.target.value }))}
                        placeholder="Motivo (ex: Em manutenção, Reservada...)"
                        className="w-full rounded-xl bg-zinc-950/40 border border-red-500/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-red-400/50"
                      />
                    )}
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
                    className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                {/* Imagens */}
                <div>
                  <label className="text-white text-sm font-medium block mb-1.5">
                    Imagens ({form.images.length})
                  </label>

                  {/* Upload de ficheiro */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm font-semibold transition mb-3 ${
                      uploading
                        ? 'border-amber-500/40 text-amber-400 cursor-wait'
                        : 'border-zinc-700 text-white hover:border-amber-500/50 hover:text-amber-400'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
                        </svg>
                        A carregar...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Selecionar imagem do computador
                      </>
                    )}
                  </button>

                  {uploadError && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                      </svg>
                      {uploadError}
                    </p>
                  )}

                  {/* URL manual */}
                  <div className="flex gap-2">
                    <input
                      value={imageInput}
                      onChange={e => setImageInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                      placeholder="Ou cole o URL da imagem"
                      className="flex-1 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                    />
                    <button
                      type="button"
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
                              type="button"
                              onClick={() => handleSetCover(url)}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                                form.img === url ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                              }`}
                            >
                              {form.img === url ? '★ Capa' : 'Capa'}
                            </button>
                            <button
                              type="button"
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
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-zinc-700 text-white hover:bg-zinc-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!form.name.trim() || !form.price.trim()}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                      form.name.trim() && form.price.trim()
                        ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                        : 'bg-zinc-800 text-white cursor-not-allowed'
                    }`}
                  >
                    {editId ? 'Guardar Alterações' : 'Adicionar Veículo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
