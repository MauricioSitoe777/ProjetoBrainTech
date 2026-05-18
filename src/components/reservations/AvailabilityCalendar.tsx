import { useMemo, useState } from 'react';
import { VEHICLES } from '../../data/constants';
import { useReservations } from '../../context/ReservationsContext';
import {
  dateStatusForVehicle,
  getDatesInMonth,
  getMonthLabel,
} from '../../lib/availability';

const STATUS_STYLES = {
  livre: 'bg-zinc-800/60 text-zinc-400',
  reservado: 'bg-amber-400/15 text-amber-400 border border-amber-400/25',
  bloqueado: 'bg-red-400/15 text-red-400 border border-red-400/25',
};

interface AvailabilityCalendarProps {
  vehicleId: number | null;
  onSelectDate?: (date: string) => void;
}

export function AvailabilityCalendar({ vehicleId, onSelectDate }: AvailabilityCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { reservations, blocks } = useReservations();

  const rentalVehicles = useMemo(
    () => VEHICLES.filter(v => v.mode === 'aluguer'),
    [],
  );

  const dates = useMemo(() => getDatesInMonth(year, month), [year, month]);
  const firstDow = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-w-sm mx-auto lg:mx-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <button type="button" onClick={prevMonth} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">‹</button>
        <span className="text-sm font-medium text-white capitalize">{getMonthLabel(year, month)}</span>
        <button type="button" onClick={nextMonth} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">›</button>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] text-zinc-600 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}
          {dates.map(date => {
            if (vehicleId === null) {
              const anyBlocked = rentalVehicles.some(
                v => dateStatusForVehicle(v.id, date, reservations, blocks) !== 'livre',
              );
              const status = anyBlocked ? 'reservado' : 'livre';
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate?.(date)}
                  className={`aspect-square rounded-md text-[10px] font-medium ${STATUS_STYLES[status]}`}
                >
                  {date.slice(8)}
                </button>
              );
            }
            const status = dateStatusForVehicle(vehicleId, date, reservations, blocks);
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate?.(date)}
                className={`aspect-square rounded-md text-[10px] font-medium ${STATUS_STYLES[status]}`}
                title={status}
              >
                {date.slice(8)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-zinc-800">
          {(Object.entries(STATUS_STYLES) as [keyof typeof STATUS_STYLES, string][]).map(([k, _]) => (
            <div key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-300 capitalize">
              <span className={`w-2 h-2 rounded-sm ${STATUS_STYLES[k].split(' ')[0]}`} />
              {k}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
