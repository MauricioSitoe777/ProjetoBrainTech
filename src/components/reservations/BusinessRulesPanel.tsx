import { useReservations } from '../../context/ReservationsContext';
import type { BusinessRules } from '../../types/reservation';

type RuleKey = keyof BusinessRules;

const FIELDS: { key: RuleKey; label: string; type: 'number' | 'boolean' | 'time'; hint?: string }[] = [
  { key: 'minDiasAluguer', label: 'Mínimo de dias', type: 'number' },
  { key: 'maxDiasAluguer', label: 'Máximo de dias', type: 'number' },
  { key: 'antecedenciaMinimaHoras', label: 'Antecedência mínima (horas)', type: 'number' },
  { key: 'antecedenciaMaximaDias', label: 'Reserva até (dias à frente)', type: 'number' },
  { key: 'bufferHorasEntreReservas', label: 'Buffer entre reservas (horas)', type: 'number', hint: 'Tempo de preparação entre devolução e nova entrega' },
  { key: 'depositoPercentual', label: 'Depósito (%)', type: 'number' },
  { key: 'taxaLimpeza', label: 'Taxa de limpeza (MT)', type: 'number' },
  { key: 'taxaLogistica', label: 'Taxa de logística (MT)', type: 'number' },
  { key: 'descontoSemanalPercentual', label: 'Desconto ≥7 dias (%)', type: 'number' },
  { key: 'descontoMensalPercentual', label: 'Desconto ≥30 dias (%)', type: 'number' },
  { key: 'permitirFimSemana', label: 'Permitir reservas ao fim de semana', type: 'boolean' },
  { key: 'horaLevantamento', label: 'Hora de levantamento', type: 'time' },
  { key: 'horaDevolucao', label: 'Hora de devolução', type: 'time' },
];

export function BusinessRulesPanel() {
  const { rules, updateRules } = useReservations();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Regras de negócio</h3>
      <p className="text-xs text-zinc-500 mb-6">Validação automática em novas reservas e no catálogo público.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, type, hint }) => (
          <div key={key} className={type === 'boolean' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs text-zinc-400 mb-1">{label}</label>
            {type === 'boolean' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules[key] as boolean}
                  onChange={e => updateRules({ [key]: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-amber-500"
                />
                <span className="text-sm text-zinc-300">{rules[key] ? 'Sim' : 'Não'}</span>
              </label>
            ) : (
              <input
                type={type === 'time' ? 'time' : 'number'}
                value={String(rules[key])}
                onChange={e => {
                  const v = type === 'time' ? e.target.value : Number(e.target.value);
                  updateRules({ [key]: v } as Partial<BusinessRules>);
                }}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            )}
            {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
