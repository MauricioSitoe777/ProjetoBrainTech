import { useState } from 'react';
import type { Reservation } from '../../types/reservation';
import { useReservations } from '../../context/ReservationsContext';
import { useMotoristas } from '../../context/MotoristasContext';

interface Props {
  reservation: Reservation;
  onClose: () => void;
}

const inp = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition';
const label = 'block text-[11px] font-bold text-white uppercase tracking-widest mb-1';

export function EditReservationModal({ reservation: r, onClose }: Props) {
  const { updateReservation } = useReservations();
  const { motoristas } = useMotoristas();

  const [clientName, setClientName]     = useState(r.clientName);
  const [clientPhone, setClientPhone]   = useState(r.clientPhone ?? '');
  const [clientEmail, setClientEmail]   = useState(r.clientEmail ?? '');
  const [dataInicio, setDataInicio]     = useState(r.dataInicio);
  const [dataFim, setDataFim]           = useState(r.dataFim);
  const [horaLev, setHoraLev]           = useState(r.horaLevantamento);
  const [horaDev, setHoraDev]           = useState(r.horaDevolucao);
  const [motivo, setMotivo]             = useState(r.motivoViagem ?? '');
  const [notas, setNotas]               = useState(r.notas ?? '');
  const [motoristaId, setMotoristaId]   = useState(r.motoristaId ?? '');
  const [saved, setSaved]               = useState(false);

  const handleSave = () => {
    updateReservation(r.id, {
      clientName: clientName.trim() || r.clientName,
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      dataInicio,
      dataFim,
      horaLevantamento: horaLev,
      horaDevolucao: horaDev,
      motivoViagem: motivo.trim() || undefined,
      notas: notas.trim() || undefined,
      motoristaId: motoristaId || undefined,
    });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div>
            <p className="text-white font-black text-base">Editar Reserva</p>
            <p className="text-[11px] text-white mt-0.5">#{r.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Cliente */}
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Cliente</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Nome</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Telefone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} className={inp} placeholder="+" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} className={inp} placeholder="email@..." />
                </div>
              </div>
            </div>
          </div>

          {/* Período */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Período</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Data Início</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Data Fim</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Hora Levantamento</label>
                <input type="time" value={horaLev} onChange={e => setHoraLev(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Hora Devolução</label>
                <input type="time" value={horaDev} onChange={e => setHoraDev(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Motorista */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Motorista</p>
            <select value={motoristaId} onChange={e => setMotoristaId(e.target.value)} className={inp}>
              <option value="">Sem motorista</option>
              {motoristas.filter(m => m.status === 'disponivel' || m.id === r.motoristaId).map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Extras */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Extras</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Motivo da Viagem</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)} className={inp} placeholder="Negócios, turismo..." />
              </div>
              <div>
                <label className={label}>Notas Internas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Observações..." />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2 border-t border-zinc-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition ${
              saved ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-[0.98]'
            }`}
          >
            {saved ? '✓ Guardado' : 'Guardar alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}
