import { useState, useEffect } from 'react';
import { useReservations } from '../../context/ReservationsContext';
import type { BusinessRules } from '../../types/reservation';

type RuleKey = keyof BusinessRules;
type FieldType = 'number' | 'boolean' | 'time';

interface FieldDef {
  key: RuleKey;
  label: string;
  type: FieldType;
  hint?: string;
  suffix?: string;
  wide?: boolean;
}

interface SubSection {
  title: string;
  icon: string;
  fields: FieldDef[];
}

interface Tab {
  key: string;
  label: string;
  icon: JSX.Element;
  subsections: SubSection[];
}

const TABS: Tab[] = [
  {
    key: 'duracao',
    label: 'Duração',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    subsections: [
      {
        title: 'Limites de Reserva',
        icon: '📅',
        fields: [
          { key: 'minDiasAluguer',          label: 'Mínimo de dias',             type: 'number', suffix: 'dias' },
          { key: 'maxDiasAluguer',          label: 'Máximo de dias',             type: 'number', suffix: 'dias' },
          { key: 'antecedenciaMinimaHoras', label: 'Antecedência mínima',        type: 'number', suffix: 'h',   hint: 'Mínimo de horas antes do início' },
          { key: 'antecedenciaMaximaDias',  label: 'Reserva até (dias à frente)',type: 'number', suffix: 'dias' },
          { key: 'bufferHorasEntreReservas',label: 'Buffer entre reservas',      type: 'number', suffix: 'h',   hint: 'Tempo de preparação entre devolução e nova entrega' },
        ],
      },
      {
        title: 'Horários',
        icon: '🕐',
        fields: [
          { key: 'horaLevantamento',  label: 'Hora de levantamento', type: 'time' },
          { key: 'horaDevolucao',     label: 'Hora de devolução',    type: 'time' },
          { key: 'permitirFimSemana', label: 'Permitir reservas ao fim de semana', type: 'boolean', wide: true },
        ],
      },
    ],
  },
  {
    key: 'custos',
    label: 'Custos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    subsections: [
      {
        title: 'Depósito & Caução',
        icon: '🔒',
        fields: [
          { key: 'depositoPercentual', label: 'Depósito (%)',  type: 'number', suffix: '%',  hint: 'Percentagem cobrada no momento da reserva' },
          { key: 'caucaoValor',        label: 'Caução',        type: 'number', suffix: 'MT', hint: 'Valor retido como garantia — devolvido sem incidentes' },
        ],
      },
      {
        title: 'Taxas Fixas por Aluguer',
        icon: '🧾',
        fields: [
          { key: 'taxaLimpeza',   label: 'Taxa de limpeza',    type: 'number', suffix: 'MT' },
          { key: 'taxaLogistica', label: 'Taxa de logística',   type: 'number', suffix: 'MT', hint: 'Entrega/recolha do veículo' },
          { key: 'taxaCombustivel', label: 'Taxa de combustível', type: 'number', suffix: 'MT', hint: '0 = incluído; acrescido se devolvido sem encher' },
        ],
      },
      {
        title: 'Quilómetros',
        icon: '🛣️',
        fields: [
          { key: 'kmIncluidosPorDia', label: 'KM incluídos por dia', type: 'number', suffix: 'km',    hint: '0 = quilómetros ilimitados' },
          { key: 'precoKmExtra',      label: 'Preço por KM extra',   type: 'number', suffix: 'MT/km' },
        ],
      },
    ],
  },
  {
    key: 'penalidades',
    label: 'Penalidades',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    subsections: [
      {
        title: 'Atraso & Cancelamento',
        icon: '⏰',
        fields: [
          { key: 'penalizacaoAtrasoPorHora', label: 'Penalização por atraso na devolução', type: 'number', suffix: 'MT/h' },
          { key: 'taxaCancelamento',         label: 'Taxa de cancelamento',                type: 'number', suffix: 'MT',   hint: 'Cobrada ao cancelar após confirmação' },
        ],
      },
    ],
  },
  {
    key: 'seguranca',
    label: 'Segurança',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    subsections: [
      {
        title: 'Seguro & Condutores',
        icon: '🛡️',
        fields: [
          { key: 'seguroDiario',          label: 'Seguro diário',       type: 'number', suffix: 'MT/dia', hint: 'Custo de seguro por dia de aluguer' },
          { key: 'taxaCondutorAdicional', label: 'Condutor adicional',  type: 'number', suffix: 'MT',     hint: 'Por condutor extra registado no contrato' },
        ],
      },
    ],
  },
  {
    key: 'descontos',
    label: 'Descontos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="19" y1="5" x2="5" y2="19"/>
        <circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>
    ),
    subsections: [
      {
        title: 'Descontos por Duração',
        icon: '🏷️',
        fields: [
          { key: 'descontoSemanalPercentual',   label: 'Desconto ≥ 7 dias',  type: 'number', suffix: '%' },
          { key: 'descontoQuinzenalPercentual', label: 'Desconto ≥ 15 dias', type: 'number', suffix: '%' },
          { key: 'descontoMensalPercentual',    label: 'Desconto ≥ 30 dias', type: 'number', suffix: '%' },
        ],
      },
    ],
  },
];

export function BusinessRulesPanel() {
  const { rules, updateRules } = useReservations();
  const [localRules, setLocalRules] = useState<BusinessRules>(rules);
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => { setLocalRules(rules); }, [rules]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateRules(localRules);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const set = (key: RuleKey, value: BusinessRules[RuleKey]) =>
    setLocalRules(prev => ({ ...prev, [key]: value }));

  const hasChanges = JSON.stringify(localRules) !== JSON.stringify(rules);
  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-black text-white">Regras de negócio</h3>
          <p className="text-xs text-white mt-0.5">Validação automática em novas reservas e no catálogo público.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            hasChanges
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-lg shadow-amber-500/10'
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              Gravado!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Gravar alterações
            </>
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-white hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <span className={activeTab === tab.key ? 'text-amber-400' : 'text-white'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6 space-y-6">
        {currentTab.subsections.map(sub => (
          <div key={sub.title}>
            {/* Sub-section header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base leading-none">{sub.icon}</span>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">{sub.title}</h4>
              <div className="flex-1 h-px bg-zinc-800 ml-1" />
            </div>

            {/* Fields grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {sub.fields.map(({ key, label, type, hint, suffix, wide }) => (
                <div key={key} className={wide || type === 'boolean' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-white mb-1.5">{label}</label>

                  {type === 'boolean' ? (
                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                      <div className={`relative w-10 h-5 rounded-full transition-colors ${
                        localRules[key] ? 'bg-amber-500' : 'bg-zinc-700'
                      }`}>
                        <input
                          type="checkbox"
                          checked={localRules[key] as boolean}
                          onChange={e => set(key, e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          localRules[key] ? 'left-5' : 'left-0.5'
                        }`} />
                      </div>
                      <span className={`text-sm font-semibold transition-colors ${
                        localRules[key] ? 'text-amber-400' : 'text-white'
                      }`}>
                        {localRules[key] ? 'Sim' : 'Não'}
                      </span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type={type === 'time' ? 'time' : 'number'}
                        value={String(localRules[key] ?? '')}
                        onChange={e => set(key, type === 'time' ? e.target.value : Number(e.target.value))}
                        className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      {suffix && (
                        <span className="text-xs text-white font-bold shrink-0 min-w-[3rem]">{suffix}</span>
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
