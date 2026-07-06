import type { Reservation } from '../../types/reservation';
import { VEHICLES } from '../../data/constants';
import { useMotoristas } from '../../context/MotoristasContext';

interface Props {
  reservation: Reservation;
  onClose: () => void;
}

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00 MT';
const today = () => new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

export function ContratoModal({ reservation: r, onClose }: Props) {
  const { motoristas } = useMotoristas();
  const vehicle = VEHICLES.find(v => v.id === r.vehicleId);
  const motorista = r.motoristaId ? motoristas.find(m => m.id === r.motoristaId) : null;

  const totalDays = Math.max(1, Math.round(
    (new Date(r.dataFim).getTime() - new Date(r.dataInicio).getTime()) / 86400000
  ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-base">Contrato de Aluguer</p>
              <p className="text-[11px] text-white">Ref. #{r.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Contract body */}
        <div className="px-6 py-5 space-y-6 text-sm">

          {/* Cabeçalho do contrato */}
          <div className="text-center border-b border-zinc-800 pb-5">
            <img src="/sos-motors-logo.png" alt="SOS Motors" className="h-10 w-auto mx-auto mb-1" />
            <p className="text-white text-xs">Aluguer de Viaturas · Maputo, Moçambique</p>
            <p className="text-white text-xs mt-0.5">Av. Julius Nyerere · Tel: +258 84 000 0000</p>
            <div className="mt-3 inline-block border border-amber-500/30 bg-amber-500/10 rounded-lg px-4 py-1">
              <span className="text-amber-400 font-black text-xs uppercase tracking-widest">Contrato de Aluguer de Viatura</span>
            </div>
            <p className="text-white text-xs mt-2">Emitido a {today()}</p>
          </div>

          {/* Partes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Locador</p>
              <p className="text-white font-black">SOS Motors Lda.</p>
              <p className="text-white text-xs mt-1">Av. Julius Nyerere, Maputo</p>
              <p className="text-white text-xs">NUIT: 400XXXXXXX</p>
            </div>
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Locatário</p>
              <p className="text-white font-black">{r.clientName}</p>
              {r.clientPhone && <p className="text-white text-xs mt-1">{r.clientPhone}</p>}
              {r.clientEmail && <p className="text-white text-xs">{r.clientEmail}</p>}
            </div>
          </div>

          {/* Viatura */}
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Viatura</p>
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-white mb-0.5">Modelo</p>
                  <p className="font-black text-white">{vehicle?.name ?? `Viatura #${r.vehicleId}`}</p>
                </div>
                <div>
                  <p className="text-white mb-0.5">Matrícula</p>
                  <p className="font-black text-white">{vehicle?.matricula ?? '—'}</p>
                </div>
                <div>
                  <p className="text-white mb-0.5">Combustível</p>
                  <p className="font-black text-white">{vehicle?.fuel ?? '—'}</p>
                </div>
                {motorista && (
                  <div>
                    <p className="text-white mb-0.5">Motorista</p>
                    <p className="font-black text-white">{motorista.nome}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Período */}
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Período de Aluguer</p>
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white mb-0.5">Levantamento</p>
                  <p className="font-black text-white">{r.dataInicio}</p>
                  <p className="text-white">{r.horaLevantamento} · {r.localLevantamento ?? 'Escritório Central'}</p>
                </div>
                <div>
                  <p className="text-white mb-0.5">Devolução</p>
                  <p className="font-black text-white">{r.dataFim}</p>
                  <p className="text-white">{r.horaDevolucao} · {r.localDevolucao ?? 'Escritório Central'}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-700/40">
                  <span className="text-white">Duração: </span>
                  <span className="font-black text-white">{totalDays} dia{totalDays !== 1 ? 's' : ''}</span>
                  {r.motivoViagem && (
                    <span className="ml-4 text-white">Motivo: <span className="font-semibold text-white">{r.motivoViagem}</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Condições Financeiras</p>
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-700/40">
                <div className="flex justify-between px-4 py-2.5 text-xs">
                  <span className="text-white">Valor Total do Aluguer</span>
                  <span className="font-black text-white">{fmt(r.valorTotal)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-xs">
                  <span className="text-white">Depósito / Caução</span>
                  <span className="font-black text-emerald-400">{fmt(r.deposito)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-xs">
                  <span className="text-white">Saldo Restante</span>
                  <span className="font-black text-amber-400">{fmt(Math.max(0, r.valorTotal - r.deposito))}</span>
                </div>
                {r.prestacoes && r.prestacoes.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold text-white mb-2">Plano de Prestações</p>
                    <div className="space-y-1">
                      {r.prestacoes.map(p => (
                        <div key={p.numero} className="flex items-center justify-between text-xs">
                          <span className="text-white">{p.numero}ª · {p.dataVencimento}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-black ${p.paga ? 'text-emerald-400' : 'text-white'}`}>{fmt(p.valor)}</span>
                            {p.paga && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">PAGO</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notas */}
          {r.notas && (
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Observações</p>
              <p className="text-white text-xs bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-3 italic">{r.notas}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className="border-t border-zinc-800 pt-5">
            <div className="grid grid-cols-2 gap-8 text-xs text-center">
              <div>
                <div className="h-10 border-b border-zinc-600 mb-2" />
                <p className="text-white font-semibold">Locador</p>
                <p className="text-white">SOS Motors Lda.</p>
              </div>
              <div>
                <div className="h-10 border-b border-zinc-600 mb-2" />
                <p className="text-white font-semibold">Locatário</p>
                <p className="text-white">{r.clientName}</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-white mt-4">
              Este documento foi gerado electronicamente pelo sistema SOS Motors em {today()}.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-zinc-800 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition">
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-amber-400 text-zinc-950 hover:bg-amber-300 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
        </div>

      </div>
    </div>
  );
}
