import { useMemo, useState } from 'react';
import { VEHICLES } from '../../data/constants';
import { useReservations } from '../../context/ReservationsContext';
import {
  dateStatusForVehicle,
  getDatesInMonth,
  getMonthLabel,
} from '../../lib/availability';

const STATUS_STYLES = {
  livre:     { cell: 'bg-zinc-800/60 text-white hover:bg-zinc-700/60',                              dot: 'bg-zinc-600',  label: 'Livre'     },
  reservado: { cell: 'bg-amber-400/15 text-amber-400 border border-amber-400/25 hover:bg-amber-400/25', dot: 'bg-amber-400', label: 'Reservado' },
  bloqueado: { cell: 'bg-red-400/15 text-red-400 border border-red-400/25 hover:bg-red-400/25',    dot: 'bg-red-400',   label: 'Bloqueado' },
};

interface AvailabilityCalendarProps {
  vehicleId: number | null;
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

export function AvailabilityCalendar({ vehicleId, onSelectDate, selectedDate }: AvailabilityCalendarProps) {
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { reservations, blocks } = useReservations();

  const rentalVehicles = useMemo(() => VEHICLES.filter(v => v.mode === 'aluguer'), []);

  const dates    = useMemo(() => getDatesInMonth(year, month), [year, month]);
  const firstDow = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // Per-date occupancy count (only for "all fleet" view)
  const occupancyMap = useMemo(() => {
    if (vehicleId !== null) return {} as Record<string, { reservado: number; bloqueado: number }>;
    const map: Record<string, { reservado: number; bloqueado: number }> = {};
    for (const date of dates) {
      let rv = 0, bl = 0;
      for (const v of rentalVehicles) {
        const s = dateStatusForVehicle(v.id, date, reservations, blocks);
        if (s === 'reservado') rv++;
        else if (s === 'bloqueado') bl++;
      }
      if (rv > 0 || bl > 0) map[date] = { reservado: rv, bloqueado: bl };
    }
    return map;
  }, [vehicleId, dates, rentalVehicles, reservations, blocks]);

  return (
    <div className="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden max-w-sm">
      {/* Header nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <button type="button" onClick={prevMonth} className="p-1 text-white hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">‹</button>
        <span className="text-xs font-bold text-white capitalize">{getMonthLabel(year, month)}</span>
        <button type="button" onClick={nextMonth} className="p-1 text-white hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">›</button>
      </div>

      <div className="p-3">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[9px] text-white/60 font-medium py-0.5">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}

          {dates.map(date => {
            const isSelected = date === selectedDate;
            const isToday    = date === todayStr;
            const ringCls    = isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-900' : '';

            if (vehicleId === null) {
              const occ    = occupancyMap[date];
              const status: keyof typeof STATUS_STYLES =
                occ?.bloqueado ? 'bloqueado' : occ?.reservado ? 'reservado' : 'livre';
              const total  = (occ?.reservado ?? 0) + (occ?.bloqueado ?? 0);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate?.(date)}
                  className={`aspect-square rounded flex flex-col items-center justify-center transition-all ${STATUS_STYLES[status].cell} ${ringCls}`}
                >
                  <span className={`text-[10px] leading-none ${isToday ? 'font-black underline underline-offset-1' : 'font-medium'}`}>
                    {date.slice(8)}
                  </span>
                  {total > 0 && (
                    <span className="text-[7px] leading-none mt-0.5 opacity-75">{total}v</span>
                  )}
                </button>
              );
            }

            const status = dateStatusForVehicle(vehicleId, date, reservations, blocks);
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate?.(date)}
                className={`aspect-square rounded text-[10px] transition-all flex items-center justify-center ${STATUS_STYLES[status].cell} ${ringCls} ${isToday ? 'font-black' : 'font-medium'}`}
              >
                <span className={isToday ? 'underline underline-offset-1' : ''}>{date.slice(8)}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-2.5 border-t border-zinc-800">
          {(Object.entries(STATUS_STYLES) as [keyof typeof STATUS_STYLES, typeof STATUS_STYLES[keyof typeof STATUS_STYLES]][]).map(([, v]) => (
            <div key={v.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm shrink-0 ${v.dot}`} />
              <span className="text-[10px] font-semibold text-white">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
