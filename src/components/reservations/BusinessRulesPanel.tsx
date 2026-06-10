import { useState, useEffect } from 'react';
import { useReservations } from '../../context/ReservationsContext';
import type { BusinessRules } from '../../types/reservation';

type RuleKey = keyof BusinessRules;

interface FieldDef {
  key: RuleKey;
  label: string;
  type: 'number' | 'boolean' | 'time';
  hint?: string;
  suffix?: string;
}

interface Section {
  title: string;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  {
    title: 'Limites Temporais',
    fields: [
      { key: 'minDiasAluguer',           label: 'Mínimo de dias',                  type: 'number', suffix: 'dias' },
      { key: 'maxDiasAluguer',           label: 'Máximo de dias',                  type: 'number', suffix: 'dias' },
      { key: 'antecedenciaMinimaHoras',  label: 'Antecedência mínima',             type: 'number', suffix: 'h' },
      { key: 'antecedenciaMaximaDias',   label: 'Reserva até (dias à frente)',      type: 'number', suffix: 'dias' },
      { key: 'bufferHorasEntreReservas', label: 'Buffer entre reservas',           type: 'number', suffix: 'h', hint: 'Preparação entre devolução e nova entrega' },
      { key: 'horaLevantamento',         label: 'Hora de levantamento',            type: 'time' },
      { key: 'horaDevolucao',            label: 'Hora de devolução',               type: 'time' },
      { key: 'permitirFimSemana',        label: 'Permitir reservas ao fim de semana', type: 'boolean' },
    ],
  },
  {
    title: 'Depósito & Caução',
    fields: [
      { key: 'depositoPercentual', label: 'Depósito (%)',     type: 'number', suffix: '%',  hint: 'Percentagem do valor total cobrada no momento da reserva' },
      { key: 'caucaoValor',        label: 'Caução',           type: 'number', suffix: 'MT', hint: 'Valor retido como garantia — devolvido no fim do aluguer sem incidentes' },
    ],
  },
  {
    title: 'Taxas Fixas por Aluguer',
    fields: [
      { key: 'taxaLimpeza',            label: 'Taxa de limpeza',         type: 'number', suffix: 'MT' },
      { key: 'taxaLogistica',          label: 'Taxa de logística',        type: 'number', suffix: 'MT', hint: 'Entrega/recolha do veículo' },
      { key: 'seguroDiario',           label: 'Seguro diário',            type: 'number', suffix: 'MT/dia' },
      { key: 'taxaCombustivel',        label: 'Taxa de combustível',      type: 'number', suffix: 'MT', hint: '0 = incluído no preço; valor acrescido se o cliente devolver sem encher' },
      { key: 'taxaCondutorAdicional',  label: 'Condutor adicional',       type: 'number', suffix: 'MT', hint: 'Por condutor extra registado no contrato' },
    ],
  },
  {
    title: 'Quilómetros',
    fields: [
      { key: 'kmIncluidosPorDia', label: 'KM incluídos por dia', type: 'number', suffix: 'km', hint: '0 = quilómetros ilimitados' },
      { key: 'precoKmExtra',      label: 'Preço por KM extra',   type: 'number', suffix: 'MT/km' },
    ],
  },
  {
    title: 'Penalizações & Cancelamento',
    fields: [
      { key: 'penalizacaoAtrasoPorHora', label: 'Penalização por atraso na devolução', type: 'number', suffix: 'MT/h' },
      { key: 'taxaCancelamento',         label: 'Taxa de cancelamento',                type: 'number', suffix: 'MT', hint: 'Cobrada quando o cliente cancela após confirmação' },
    ],
  },
  {
    title: 'Descontos por Duração',
    fields: [
      { key: 'descontoSemanalPercentual',    label: 'Desconto ≥7 dias',  type: 'number', suffix: '%' },
      { key: 'descontoQuinzenalPercentual',  label: 'Desconto ≥15 dias', type: 'number', suffix: '%' },
      { key: 'descontoMensalPercentual',     label: 'Desconto ≥30 dias', type: 'number', suffix: '%' },
    ],
  },
];

export function BusinessRulesPanel() {
  const { rules, updateRules } = useReservations();
  const [localRules, setLocalRules] = useState<BusinessRules>(rules);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  const handleSave = () => {
    setIsSaving(true);
    // Simular um pequeno atraso para feedback visual
    setTimeout(() => {
      updateRules(localRules);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const hasChanges = JSON.stringify(localRules) !== JSON.stringify(rules);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Regras de negócio</h3>
          <p className="text-xs text-white">Validação automática em novas reservas e no catálogo público.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            hasChanges 
              ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-lg shadow-amber-400/10' 
              : 'bg-zinc-800 text-white cursor-not-allowed border border-zinc-700'
          }`}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              A gravar...
            </>
          ) : showSuccess ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Gravado!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Gravar alterações
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-800">
              {section.title}
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {section.fields.map(({ key, label, type, hint, suffix }) => (
                <div key={key} className={type === 'boolean' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-white mb-1.5">{label}</label>
                  {type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localRules[key] as boolean}
                        onChange={e => setLocalRules(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/20"
                      />
                      <span className="text-sm text-white group-hover:text-amber-400 transition-colors font-medium">
                        {localRules[key] ? 'Sim' : 'Não'}
                      </span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type={type === 'time' ? 'time' : 'number'}
                        value={String(localRules[key] ?? '')}
                        onChange={e => {
                          const v = type === 'time' ? e.target.value : Number(e.target.value);
                          setLocalRules(prev => ({ ...prev, [key]: v }));
                        }}
                        className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      {suffix && (
                        <span className="text-xs text-white font-bold shrink-0 w-12">{suffix}</span>
                      )}
                    </div>
                  )}
                  {hint && <p className="text-[10px] text-white mt-1 leading-relaxed">{hint}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
