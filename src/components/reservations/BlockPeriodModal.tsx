import { useState } from 'react';
import { VEHICLES } from '../../data/constants';
import type { BlockReason } from '../../types/reservation';
import { useReservations } from '../../context/ReservationsContext';

interface BlockPeriodModalProps {
  onClose: () => void;
  defaultVehicleId?: number | null;
}

const MOTIVOS: { value: BlockReason; label: string }[] = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reserva_interna', label: 'Reserva interna' },
  { value: 'indisponivel', label: 'Indisponível' },
  { value: 'outro', label: 'Outro' },
];

export function BlockPeriodModal({ onClose, defaultVehicleId = null }: BlockPeriodModalProps) {
  const { addBlock } = useReservations();
  const [vehicleId, setVehicleId] = useState<string>(defaultVehicleId === null ? 'all' : String(defaultVehicleId));
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState<BlockReason>('manutencao');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio || !dataFim) return;
    addBlock({
      vehicleId: vehicleId === 'all' ? null : Number(vehicleId),
      dataInicio,
      dataFim,
      motivo,
      descricao: descricao.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Bloquear período</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Viatura</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Toda a frota</option>
              {VEHICLES.filter(v => v.mode === 'aluguer').map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Motivo</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value as BlockReason)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm">
              {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm">Cancelar</button>
            <button type="submit" className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm">Bloquear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
