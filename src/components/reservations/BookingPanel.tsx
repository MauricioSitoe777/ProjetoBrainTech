import { useState, useMemo } from 'react';
import type { Vehicle } from '../../data/constants';
import { useReservations } from '../../context/ReservationsContext';
import { useAuth } from '../../context/AuthContext';

interface BookingPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingPanel({ vehicle, onClose, onSuccess }: BookingPanelProps) {
  const { user } = useAuth();
  const {
    validateDates,
    checkAvailability,
    createReservation,
    quoteRental,
    rules,
  } = useReservations();

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clientName, setClientName] = useState(user?.nome ?? '');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState(user?.email ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const dateValidation = useMemo(
    () => (dataInicio && dataFim ? validateDates(dataInicio, dataFim) : null),
    [dataInicio, dataFim, validateDates],
  );

  const availability = useMemo(
    () =>
      dataInicio && dataFim && dateValidation?.valid
        ? checkAvailability(vehicle.id, dataInicio, dataFim)
        : null,
    [dataInicio, dataFim, dateValidation, checkAvailability, vehicle.id],
  );

  const quote = useMemo(
    () =>
      dataInicio && dataFim && dateValidation?.valid && availability?.available
        ? quoteRental(vehicle.id, dataInicio, dataFim)
        : null,
    [dataInicio, dataFim, dateValidation, availability, quoteRental, vehicle.id],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dateValidation?.valid) {
      setError(dateValidation?.errors[0] ?? 'Datas inválidas.');
      return;
    }
    if (!availability?.available) {
      setError(availability?.conflicts[0] ?? 'Viatura indisponível.');
      return;
    }
    if (!clientName.trim()) {
      setError('Indique o seu nome.');
      return;
    }
    if (!quote) return;

    const result = createReservation({
      vehicleId: vehicle.id,
      userId: user?.id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      dataInicio,
      dataFim,
      status: 'pendente',
      valorTotal: quote.total,
      deposito: quote.deposito,
    });

    if (!result.ok) {
      setError(result.error ?? 'Não foi possível criar a reserva.');
      return;
    }
    setSuccess(true);
    onSuccess?.();
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-400/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-400 text-xl">✓</div>
          <h2 className="text-lg font-semibold text-white mb-2">Reserva submetida</h2>
          <p className="text-sm text-zinc-400 mb-6">
            A sua reserva de <strong className="text-white">{vehicle.name}</strong> foi registada como pendente de confirmação.
          </p>
          <button onClick={onClose} className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Reservar viatura</h2>
            <p className="text-xs text-zinc-300 mt-0.5">{vehicle.name} · {vehicle.price}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Data de início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Data de fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {dateValidation && !dateValidation.valid && (
            <ul className="text-xs text-red-400 space-y-1 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {dateValidation.errors.map(err => <li key={err}>{err}</li>)}
            </ul>
          )}

          {availability && !availability.available && dateValidation?.valid && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {availability.conflicts[0]}
            </p>
          )}

          {quote && (
            <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>{quote.days} dia(s) × {quote.dailyRate.toLocaleString()} MT</span>
                <span>{quote.subtotal.toLocaleString()} MT</span>
              </div>
              {quote.desconto > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto</span>
                  <span>-{quote.desconto.toLocaleString()} MT</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Taxas + depósito ({rules.depositoPercentual}%)</span>
                <span>{(quote.total - quote.subtotal + quote.desconto).toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between text-white font-semibold pt-2 border-t border-zinc-700">
                <span>Total estimado</span>
                <span className="text-amber-400">{quote.total.toLocaleString()} MT</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nome *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Telefone</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm">Cancelar</button>
            <button
              type="submit"
              disabled={!quote}
              className="flex-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg py-2.5 text-sm"
            >
              Confirmar reserva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
