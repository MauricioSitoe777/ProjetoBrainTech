import { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../data/constants';
import { useReservations } from '../../context/ReservationsContext';
import { useAuth } from '../../context/AuthContext';
import { useMotoristas } from '../../context/MotoristasContext';

interface BookingPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: () => void;
}

const fmtN = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function BookingPanel({ vehicle, onClose, onSuccess }: BookingPanelProps) {
  const { user, allUsers } = useAuth();
  const { motoristas } = useMotoristas();
  const {
    validateDates,
    checkAvailability,
    createReservation,
    quoteRental,
    rules,
  } = useReservations();

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaLevantamento, setHoraLevantamento] = useState('09:00');
  const [horaDevolucao, setHoraDevolucao] = useState('17:00');
  const [motivoViagem, setMotivoViagem] = useState('');
  const localLevantamento = 'Escritório Central (Av. Julius Nyerere, Maputo)';
  const localDevolucao    = 'Escritório Central (Av. Julius Nyerere, Maputo)';
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [comMotorista, setComMotorista] = useState(false);
  const [motoristaId, setMotoristaId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const fullUser = useMemo(() => {
    if (user && allUsers) {
      return allUsers.find(u => u.id === user.id);
    }
    return null;
  }, [user, allUsers]);

  // Auto-preencher dados se o utilizador logado for alterado/carregado
  useEffect(() => {
    if (fullUser) {
      setClientName(fullUser.nome);
      setClientEmail(fullUser.email);
      setClientPhone(fullUser.telefone || '');
    }
  }, [fullUser]);

  const isRestricted = fullUser?.restriction === 'blacklisted';
  const isInadimplente = fullUser?.regularity === 'inadimplente';
  const isBlocked = isRestricted || isInadimplente;

  const suggestions = useMemo(() => {
    if (!allUsers) return [];
    const query = clientName.trim().toLowerCase();
    if (!query) return [];
    return allUsers.filter(u => 
      u.nome.toLowerCase().includes(query)
    );
  }, [clientName, allUsers]);

  const handleSelectUser = (selectedUser: typeof allUsers[0]) => {
    setClientName(selectedUser.nome);
    setClientPhone(selectedUser.telefone || '');
    setClientEmail(selectedUser.email || '');
    setShowSuggestions(false);
  };

  const dateValidation = useMemo(
    () => (dataInicio && dataFim ? validateDates(dataInicio, dataFim, horaLevantamento) : null),
    [dataInicio, dataFim, horaLevantamento, validateDates],
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
    if (isBlocked) return;
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
      horaLevantamento,
      horaDevolucao,
      motivoViagem: motivoViagem.trim() || undefined,
      status: 'pendente',
      valorTotal: quote.total,
      deposito: quote.deposito,
      localLevantamento,
      localDevolucao,
      motoristaId: comMotorista && motoristaId ? motoristaId : undefined,
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
          <p className="text-sm text-white mb-2">
            A sua reserva de <strong className="text-white">{vehicle.name}</strong> foi registada com sucesso.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs font-bold text-amber-400 mb-1">⏳ A aguardar confirmação de pagamento</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Os seus documentos já estão verificados. O administrador irá confirmar o pagamento para concluir a operação.
            </p>
          </div>
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
            <p className="text-xs text-white mt-0.5">{vehicle.name} · {vehicle.price}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <h3 className="text-emerald-500 text-[10px] font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              Ofertas de Longo Prazo
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className={`text-center p-1.5 rounded-lg border ${dateValidation?.days && dateValidation.days >= 7 && dateValidation.days < 15 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-950/30 border-transparent opacity-60'}`}>
                <p className="text-[9px] text-white font-bold">7+ dias</p>
                <p className="text-[11px] text-emerald-400 font-black">{rules.descontoSemanalPercentual}%</p>
              </div>
              <div className={`text-center p-1.5 rounded-lg border ${dateValidation?.days && dateValidation.days >= 15 && dateValidation.days < 30 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-950/30 border-transparent opacity-60'}`}>
                <p className="text-[9px] text-white font-bold">15+ dias</p>
                <p className="text-[11px] text-emerald-400 font-black">{rules.descontoQuinzenalPercentual}%</p>
              </div>
              <div className={`text-center p-1.5 rounded-lg border ${dateValidation?.days && dateValidation.days >= 30 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-950/30 border-transparent opacity-60'}`}>
                <p className="text-[9px] text-white font-bold">30+ dias</p>
                <p className="text-[11px] text-emerald-400 font-black">{rules.descontoMensalPercentual}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Data de início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Hora de levantamento</label>
              <input type="time" value={horaLevantamento} onChange={e => setHoraLevantamento(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Data de fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Hora de devolução</label>
              <input type="time" value={horaDevolucao} onChange={e => setHoraDevolucao(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white mb-1">Motivo da viagem (Para onde pretende ir?)</label>
            <textarea
              value={motivoViagem}
              onChange={e => setMotivoViagem(e.target.value)}
              placeholder="Ex: Viagem de negócios à Beira, Férias em Bilene..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none resize-none"
            />
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">Local de levantamento e devolução</p>
              <p className="text-sm font-bold text-white truncate">Escritório Central</p>
              <p className="text-xs text-zinc-400">Av. Julius Nyerere, Maputo</p>
            </div>
            <span className="shrink-0 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md px-2 py-0.5 font-bold">Fixo</span>
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
              <div className="flex justify-between text-white">
                <span>{quote.days} dia(s) × {fmtN(quote.dailyRate)} MT</span>
                <span>{fmtN(quote.subtotal)} MT</span>
              </div>
              {quote.desconto > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    Desconto
                    {quote.days >= 15 && quote.days < 30 && (
                      <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        15+ dias ({rules.descontoQuinzenalPercentual}%)
                      </span>
                    )}
                    {quote.days >= 30 && (
                      <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        Mensal ({rules.descontoMensalPercentual}%)
                      </span>
                    )}
                  </span>
                  <span>-{fmtN(quote.desconto)} MT</span>
                </div>
              )}
              <div className="flex justify-between text-white text-xs">
                <span>Taxas + depósito ({rules.depositoPercentual}%)</span>
                <span>{fmtN(quote.total - quote.subtotal + quote.desconto)} MT</span>
              </div>
              <div className="flex justify-between text-white font-semibold pt-2 border-t border-zinc-700">
                <span>Total estimado</span>
                <span className="text-amber-400">{fmtN(quote.total)} MT</span>
              </div>
            </div>
          )}

          <div className="relative">
            <label className="block text-xs text-white mb-1">Nome *</label>
            <input
              value={clientName}
              onChange={e => {
                setClientName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              placeholder="Digite para pesquisar registos..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg max-h-48 overflow-y-auto z-20 shadow-xl divide-y divide-zinc-700">
                {suggestions.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-700/50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-white">{u.nome}</p>
                      <p className="text-[10px] text-white">{u.email}</p>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {u.telefone || 'Sem Telefone'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Telefone</label>
              <input
                value={clientPhone}
                onChange={e => {
                  let val = e.target.value;
                  if (val && !val.startsWith('+') && /^\d/.test(val)) {
                    val = '+258 ' + val;
                  }
                  setClientPhone(val);
                }}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Email</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Motorista */}
          <div className={`rounded-xl border transition-all ${comMotorista ? 'border-amber-400/30 bg-amber-400/5' : 'border-zinc-700/60 bg-zinc-800/30'}`}>
            <button
              type="button"
              onClick={() => { setComMotorista(v => !v); setMotoristaId(''); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🧑‍✈️</span>
                <div className="text-left">
                  <p className={`text-xs font-bold ${comMotorista ? 'text-amber-400' : 'text-white'}`}>Solicitar Motorista</p>
                  <p className="text-[10px] text-zinc-500">Inclui condutor profissional na reserva</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 ${comMotorista ? 'bg-amber-400 justify-end' : 'bg-zinc-700 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow" />
              </div>
            </button>

            {comMotorista && (
              <div className="px-4 pb-4">
                {motoristas.filter(m => m.status === 'disponivel').length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">Sem motoristas disponíveis no momento.</p>
                ) : (
                  <select
                    value={motoristaId}
                    onChange={e => setMotoristaId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none"
                  >
                    <option value="">Selecionar motorista (opcional)</option>
                    {motoristas.filter(m => m.status === 'disponivel').map(m => (
                      <option key={m.id} value={m.id}>{m.nome} · {m.telefone}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          {isBlocked && (
            <div className="p-4 rounded-xl bg-red-600 border border-red-500 shadow-lg animate-pulse">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Acesso Restrito
              </div>
              <p className="text-white text-[11px] leading-tight font-medium opacity-95">
                {isRestricted
                  ? "Esta conta foi suspensa permanentemente (Blacklisted)."
                  : "Operação bloqueada devido a irregularidades financeiras."}
              </p>
              <p className="text-white/80 text-[11px] leading-tight mt-1.5">
                Contacte o administrador para resolver a situação.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm">Cancelar</button>
            <button
              type="submit"
              disabled={!dateValidation?.valid || !availability?.available || !clientName.trim() || isBlocked}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                !dateValidation?.valid || !availability?.available || !clientName.trim() || isBlocked
                  ? 'bg-zinc-800 text-white cursor-not-allowed border border-zinc-700'
                  : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-lg active:scale-[0.98]'
              }`}
            >
              {isBlocked ? 'Bloqueado' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
