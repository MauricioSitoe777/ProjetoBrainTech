import { useState, useEffect } from 'react';
import type { Vehicle, VehicleCategory, VehicleMode } from '../types/vehicle';

interface VehicleModalProps {
  vehicle?: Vehicle | null;
  onSave: (data: Omit<Vehicle, 'id'>) => void;
  onClose: () => void;
}

const CATEGORIES: { value: VehicleCategory; label: string }[] = [
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pick-up' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'van', label: 'Van' },
];

const MODES: { value: VehicleMode; label: string }[] = [
  { value: 'aluguer', label: 'Aluguer' },
  { value: 'compra', label: 'Compra' },
];

export function VehicleModal({ vehicle, onSave, onClose }: VehicleModalProps) {
  const [form, setForm] = useState({
    name: '',
    cat: 'suv' as VehicleCategory,
    mode: 'aluguer' as VehicleMode,
    price: '',
    img: '',
    fuel: 'Diesel',
    seats: 5,
    year: new Date().getFullYear(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vehicle) {
      setForm({
        name: vehicle.name,
        cat: vehicle.cat,
        mode: vehicle.mode,
        price: vehicle.price,
        img: vehicle.img,
        fuel: vehicle.fuel,
        seats: vehicle.seats,
        year: vehicle.year,
      });
    }
  }, [vehicle]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (!form.price.trim()) e.price = 'Preço é obrigatório';
    if (!form.img.trim()) e.img = 'URL da imagem é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setForm(prev => ({ ...prev, [key]: val }));
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">
            {vehicle ? 'Editar viatura' : 'Nova viatura'}
          </h2>
          <button onClick={onClose} className="text-zinc-200 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">Nome do Veículo *</label>
              <input
                {...field('name')}
                placeholder="Ex: Toyota Hilux"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Categoria</label>
              <select
                {...field('cat')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Modalidade</label>
              <select
                {...field('mode')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">Preço *</label>
              <input
                {...field('price')}
                placeholder={form.mode === 'aluguer' ? "Ex: 4.500 MT/dia" : "Ex: 2.500.000 MT"}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-white mb-1">URL da Imagem *</label>
              <input
                {...field('img')}
                placeholder="https://..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              {errors.img && <p className="text-red-400 text-xs mt-1">{errors.img}</p>}
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Combustível</label>
              <input
                {...field('fuel')}
                placeholder="Diesel, Gasolina, Híbrido"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Lugares</label>
              <input
                {...field('seats')}
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white mb-1">Ano</label>
              <input
                {...field('year')}
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {vehicle ? 'Guardar alterações' : 'Criar viatura'}
          </button>
        </div>
      </div>
    </div>
  );
}
