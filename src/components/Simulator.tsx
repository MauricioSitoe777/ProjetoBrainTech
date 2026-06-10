
import { useEffect, useMemo, useState } from "react";
import { AddressSearch } from "./AddressSearch";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";
import { useUsers } from "../context/UsersContext";
import { CATEGORY_LABEL } from "../data/constants";

const TAXA_MENSAL = 0.015;
const MAX_MESES_PADRAO = 12;
const MAX_MESES_FUNCIONARIO = 48;

type FlowType = "compra" | "aluguer";
type Category = "func_publico" | "func_privado" | "empreendedor";
type PaymentPlan = "pronto" | "prestacoes";

type HistoryEntry = {
  id: string;
  createdAt: number;
  clientName: string;
  clientContact: string;
  flow: FlowType;
  category: Category;
  paymentPlan: PaymentPlan;
  mesesPrestacoes?: number;
  values: Record<string, number>;
};

const HISTORY_KEY = "rentcar:clientHistory:v1";
const RENTAL_LOCATIONS = [
  "Aeroporto de Maputo (MPM)",
  "Escritório Central (Av. Julius Nyerere, Maputo)",
  "Matola (Bairro Central)",
  "Entrega ao Domicílio (Maputo)",
  "Entrega ao Domicílio (Matola)",
] as const;

function NumberField({
  label,
  value,
  onChange,
  min,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const formatNumber = (num: number) => {
    if (!Number.isFinite(num)) return "0";
    return new Intl.NumberFormat("pt-PT").format(num);
  };

  const [raw, setRaw] = useState(formatNumber(value));

  useEffect(() => {
    setRaw(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const cleaned = inputVal.replace(/\D/g, "");
    if (cleaned === "") {
      setRaw("");
      onChange(0);
      return;
    }
    const num = parseInt(cleaned, 10);
    setRaw(formatNumber(num));
    onChange(num);
  };

  const handleBlur = () => {
    let num = parseInt(raw.replace(/\D/g, ""), 10);
    if (isNaN(num)) num = min ?? 0;
    setRaw(formatNumber(num));
    onChange(num);
  };

  return (
    <div>
      <label className="text-white text-xs font-bold block mb-1.5">{label}</label>
      <div className={`flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 ${disabled ? 'opacity-70 cursor-not-allowed' : 'focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20'}`}>
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => !disabled && e.currentTarget.select()}
          disabled={disabled}
          className={`w-full bg-transparent text-sm text-white font-medium outline-none ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {suffix ? <span className="text-white text-xs font-bold">{suffix}</span> : null}
      </div>
    </div>
  );
}

function pmtMonthly(principal: number, months: number, monthlyRate: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = monthlyRate;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

export default function Simulator({
  showClose = true,
  lockedFlow,
}: {
  showClose?: boolean;
  lockedFlow?: FlowType;
}) {
  const fmt = useCurrencyFormatter();
  const { user: authUser, allUsers, addUser } = useAuth();
  const { updateUser, getUser } = useUsers();
  const {
    createReservation,
    validateDates,
    checkAvailability,
    quoteRental,
    rules,
  } = useReservations();

  // Get full user data from context to have documents
  const currentUser = useMemo(() => {
    return authUser ? getUser(authUser.id) : undefined;
  }, [authUser, getUser]);
  
  const isAdmin = authUser?.role === "admin";

  const [flow, setFlow] = useState<FlowType>(lockedFlow ?? "compra");
  const [category, setCategory] = useState<Category>("func_publico");

  const maxMonthsForCategory = useMemo(() => {
    if (category === "func_publico" || category === "func_privado") {
      return MAX_MESES_FUNCIONARIO;
    }
    return MAX_MESES_PADRAO;
  }, [category]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const formatContact = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 9);
    return formatted;
  };

  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Compra
  const [vehiclePrice, setVehiclePrice] = useState(1_500_000);
  const [income, setIncome] = useState(80_000);
  const [downPayment, setDownPayment] = useState(0);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("prestacoes");
  const [mesesPrestacoes, setMesesPrestacoes] = useState(12);

  // Aluguer
  const [days, setDays] = useState(3);
  const [dailyRate, setDailyRate] = useState(8_500);
  const [discountPct, setDiscountPct] = useState(10);
  const [cleaningFee, setCleaningFee] = useState(500);
  const [deposit, setDeposit] = useState(() => rules.caucaoValor);
  const [logisticsFee, setLogisticsFee] = useState(0);
  const [otherFees, setOtherFees] = useState(0);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaLevantamento, setHoraLevantamento] = useState("09:00");
  const [horaDevolucao, setHoraDevolucao] = useState("17:00");
  const [motivoViagem, setMotivoViagem] = useState("");
  const [localLevantamento, setLocalLevantamento] = useState("");
  const [localDevolucao, setLocalDevolucao] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Auto-preencher dados se o utilizador logado for alterado/carregado
  useEffect(() => {
    if (currentUser) {
      setClientName(currentUser.nome);
      const contact = currentUser.telefone || currentUser.email || "";
      setClientContact(formatContact(contact.replace(/^\+258\s*/, "")));
      if (currentUser.category) {
        setCategory(currentUser.category as Category);
      }
    }
  }, [currentUser]);

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
    const contact = selectedUser.telefone || selectedUser.email || "";
    setClientContact(formatContact(contact.replace(/^\+258\s*/, "")));
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (lockedFlow) {
      setFlow(lockedFlow);
    }
  }, [lockedFlow]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { category: cat, flow: f } = (e as CustomEvent<{ category?: string; flow?: "compra" | "aluguer" }>).detail;
      if (f) setFlow(f);
      if (cat && !currentUser?.category) setCategory(cat as Category);
    };
    window.addEventListener("rentcar:open-simulator-category", handler as EventListener);
    return () => window.removeEventListener("rentcar:open-simulator-category", handler as EventListener);
  }, [currentUser?.category]);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem("rentcar:selectedVehicle:v1") ??
        localStorage.getItem("rentcar:selectedVehicle:v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        id?: number;
        mode?: "aluguer" | "compra";
        dailyRate?: number;
        vehiclePrice?: number;
      };

      if (parsed.id) {
        setSelectedVehicleId(parsed.id);
      }

      if (lockedFlow) {
        setFlow(lockedFlow);
      } else if (parsed.mode === "aluguer") {
        setFlow("aluguer");
      } else if (parsed.mode === "compra") {
        setFlow("compra");
      }

      if (parsed.mode === "aluguer") {
        if (typeof parsed.dailyRate === "number" && Number.isFinite(parsed.dailyRate) && parsed.dailyRate > 0) {
          setDailyRate(parsed.dailyRate);
        }
      } else if (parsed.mode === "compra") {
        if (typeof parsed.vehiclePrice === "number" && Number.isFinite(parsed.vehiclePrice) && parsed.vehiclePrice > 0) {
          setVehiclePrice(parsed.vehiclePrice);
        }
        setPaymentPlan("prestacoes");
      }
    } catch {
      // ignore
    }
  }, [lockedFlow]);

  const purchasePMT = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan !== "prestacoes") return 0;
    const n = Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes)));
    const financed = Math.max(0, vehiclePrice - downPayment);
    return pmtMonthly(financed, n, TAXA_MENSAL);
  }, [flow, paymentPlan, mesesPrestacoes, vehiclePrice, downPayment, maxMonthsForCategory]);

  const purchaseTotal = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan === "pronto") return vehiclePrice;
    const n = Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes)));
    return downPayment + (purchasePMT * n);
  }, [flow, paymentPlan, vehiclePrice, purchasePMT, mesesPrestacoes, downPayment, maxMonthsForCategory]);

  const maxPmt = income * 0.3;

  const financingStatus = useMemo(() => {
    if (flow !== "compra" || paymentPlan !== "prestacoes") return { ok: true, msg: "" };

    const pctEntry = (downPayment / vehiclePrice) * 100;

    if (category === "func_publico") {
      if (purchasePMT > maxPmt) {
        return { 
          ok: false, 
          msg: `A prestação (${fmt(purchasePMT)} MT) excede o limite de 30% do rendimento mensal (${fmt(maxPmt)} MT). É necessária uma entrada para prosseguir.` 
        };
      }
      return { ok: true, msg: "Elegível: Sem entrada obrigatória (respeitando taxa de esforço)." };
    }

    if (category === "func_privado") {
      if (pctEntry < 10 || pctEntry > 50) {
        return { 
          ok: false, 
          msg: `Entrada fora do intervalo obrigatório (10% a 50%). Valor mínimo: ${fmt(vehiclePrice * 0.1)} MT.` 
        };
      }
      if (purchasePMT > maxPmt) {
        return { 
          ok: false, 
          msg: `A prestação (${fmt(purchasePMT)} MT) excede o limite de 30% do rendimento mensal (${fmt(maxPmt)} MT).` 
        };
      }
      return { ok: true, msg: "Elegível: Entrada e taxa de esforço dentro dos parâmetros." };
    }

    if (category === "empreendedor") {
      if (pctEntry < 75) {
        return { 
          ok: false, 
          msg: `Entrada insuficiente. A posse da viatura para empreendedores requer no mínimo 75% (${fmt(vehiclePrice * 0.75)} MT).` 
        };
      }
      return { ok: true, msg: "Elegível: Entrada superior a 75% confirmada." };
    }

    return { ok: true, msg: "" };
  }, [flow, paymentPlan, category, downPayment, vehiclePrice, purchasePMT, maxPmt, fmt]);

  const eligivel = financingStatus.ok;

  const rentalVehicleId = selectedVehicleId ?? 4;
  const dateValidation = useMemo(
    () => (dataInicio && dataFim ? validateDates(dataInicio, dataFim) : null),
    [dataInicio, dataFim, validateDates],
  );
  const availability = useMemo(
    () =>
      dataInicio && dataFim && dateValidation?.valid
        ? checkAvailability(rentalVehicleId, dataInicio, dataFim)
        : null,
    [dataInicio, dataFim, dateValidation, checkAvailability, rentalVehicleId],
  );
  const rentalQuote = useMemo(
    () =>
      dataInicio && dataFim && dateValidation?.valid && availability?.available
        ? quoteRental(rentalVehicleId, dataInicio, dataFim)
        : null,
    [dataInicio, dataFim, dateValidation, availability, quoteRental, rentalVehicleId],
  );

  useEffect(() => {
    setDeposit(rules.caucaoValor);
  }, [rules.caucaoValor]);

  useEffect(() => {
    if (dateValidation?.valid) {
      setDays(dateValidation.days);
      // Aplicar descontos automáticos baseados na duração
      let autoDiscount = 0;
      if (dateValidation.days >= 30) {
        autoDiscount = rules.descontoMensalPercentual;
      } else if (dateValidation.days >= 15) {
        autoDiscount = rules.descontoQuinzenalPercentual;
      } else if (dateValidation.days >= 7) {
        autoDiscount = rules.descontoSemanalPercentual;
      }
      setDiscountPct(autoDiscount);
    }
  }, [dateValidation, rules.descontoMensalPercentual, rules.descontoQuinzenalPercentual, rules.descontoSemanalPercentual]);

  const rentDailySubtotal = dailyRate * Math.max(1, Math.round(days));
  const rentDiscount = rentDailySubtotal * (Math.min(100, Math.max(0, discountPct)) / 100);
  const rentDailyAfterDiscount = rentDailySubtotal - rentDiscount;
  const rentTotalPayNow = rentDailyAfterDiscount + cleaningFee + logisticsFee + otherFees + deposit;
  const rentalTotal = rentalQuote?.total ?? rentTotalPayNow;
  const rentalDeposit = rentalQuote?.deposito ?? deposit;

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as HistoryEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  const rentalDetailsOk =
    flow !== "aluguer" ||
    (!!dataInicio && !!dataFim && dateValidation?.valid === true && availability?.available !== false);

  const isRestricted = currentUser?.restriction === 'blacklisted';
  const isInadimplente = currentUser?.regularity === 'inadimplente';
  const isBlocked = isRestricted || isInadimplente;

  const canSubmit =
    !isBlocked &&
    clientName.trim().length >= 2 &&
    rentalDetailsOk &&
    (flow === "aluguer" || eligivel) &&
    true;

  const handleSubmit = () => {
    setSubmitError("");
    if (!canSubmit) return;

    const values: Record<string, number> =
      flow === "compra"
        ? { vehiclePrice, income, downPayment, purchasePMT, purchaseTotal }
        : {
          days: Math.max(1, Math.round(days)),
          dailyRate,
          discountPct: Math.min(100, Math.max(0, discountPct)),
          rentDailySubtotal,
          rentDiscount,
          rentDailyAfterDiscount,
          cleaningFee,
          logisticsFee,
          otherFees,
          deposit: rentalDeposit,
          rentTotalPayNow: rentalTotal,
        };

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      clientName: clientName.trim(),
      clientContact: clientContact.trim() ? `+258 ${clientContact.trim()}` : "",
      flow,
      category,
      paymentPlan: flow === "compra" ? paymentPlan : "pronto",
      mesesPrestacoes:
        flow === "compra" && paymentPlan === "prestacoes"
          ? Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes)))
          : undefined,
      values,
    };

    setHistory((h) => [entry, ...h].slice(0, 30));

    // Resolve which user record to link the reservation to
    const normalizedPhone = clientContact.trim() ? `+258 ${clientContact.trim()}` : "";
    let transactionUserId: string;

    if (authUser) {
      transactionUserId = authUser.id;
      updateUser(authUser.id, {
        category,
        telefone: normalizedPhone || undefined,
      });
    } else {
      // Guest: reuse existing account if email/phone matches, otherwise create pending
      const existing = allUsers.find(
        (u) => normalizedPhone && u.telefone === normalizedPhone,
      );
      if (existing) {
        transactionUserId = existing.id;
      } else {
        const guest = addUser({
          nome: clientName.trim(),
          email: '',
          telefone: normalizedPhone,
          regularity: "regular",
          restriction: "nenhuma",
          role: "cliente",
          status: "pendente",
          category,
        });
        transactionUserId = guest.id;
      }
    }

    if (flow === "aluguer") {
      const result = createReservation({
        vehicleId: rentalVehicleId,
        userId: transactionUserId,
        clientName: clientName.trim(),
        clientEmail: authUser?.email ?? '',
        clientPhone: normalizedPhone || undefined,
        dataInicio,
        dataFim,
        horaLevantamento,
        horaDevolucao,
        status: "pendente",
        valorTotal: rentalTotal,
        deposito: rentalDeposit,
        ...(motivoViagem.trim() ? { motivoViagem: motivoViagem.trim() } : { motivoViagem: undefined }),
        ...{ localLevantamento, localDevolucao },
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "Não foi possível criar a reserva.");
        return;
      }
    } else if (flow === "compra") {
      const start = new Date();
      createReservation({
        vehicleId: selectedVehicleId ?? 2,
        userId: transactionUserId,
        clientName: clientName.trim(),
        clientEmail: authUser?.email ?? '',
        dataInicio: start.toISOString().split("T")[0],
        dataFim: start.toISOString().split("T")[0],
        horaLevantamento: "09:00",
        horaDevolucao: "09:00",
        status: "pendente",
        valorTotal: purchaseTotal,
        deposito: paymentPlan === "prestacoes" ? purchasePMT : purchaseTotal,
        notas: `Compra via plano: ${paymentPlan === "prestacoes" ? `${mesesPrestacoes} prestações` : "Pronto pagamento"}`,
        totalPrestacoes: paymentPlan === "prestacoes" ? mesesPrestacoes : undefined,
        prestacoesPagas: paymentPlan === "prestacoes" ? 0 : undefined,
      });
    }
  };

  return (
    <section id="simulador" className="py-8 bg-zinc-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{ background: "radial-gradient(circle, #d8a020, transparent 70%)" }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">
        {showClose ? (
          <button
            type="button"
            aria-label="Fechar simulador"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent("rentcar:close-simulator"));
              } catch {
                // ignore
              }
            }}
            className="absolute right-6 top-0 -translate-y-2 w-10 h-10 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg transition flex items-center justify-center text-xl font-bold"
          >
            ×
          </button>
        ) : null}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-2">
            {lockedFlow === "aluguer" ? "Aluguer" : "Compra & Aluguer"}
          </div>
          <h2
            className="text-white text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Simulador
          </h2>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-5">

          {/* ── Controls panel ── */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-5 flex flex-col gap-3 shadow-2xl self-start">

            {/* Serviço + Funcionário (Funcionário só aparece em Compra) */}
            <div className={`grid gap-3 ${flow === 'compra' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="text-white text-xs font-bold block mb-1.5 uppercase tracking-tight">Serviço</label>
                {lockedFlow ? (
                  <div className="py-2 rounded-lg text-xs font-bold text-center bg-amber-500 text-zinc-950">
                    {lockedFlow === "aluguer" ? "Aluguer" : "Compra"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { key: "compra", label: "Compra" },
                      { key: "aluguer", label: "Aluguer" },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setFlow(o.key)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${flow === o.key
                          ? "bg-amber-500 text-zinc-950"
                          : "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {flow === 'compra' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-white text-xs font-bold block">Funcionário</label>
                    {currentUser?.category && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/20 px-1.5 py-0.5 rounded border border-emerald-400/30">
                        Perfil
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      disabled={!!currentUser?.category}
                      className={`w-full appearance-none rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500 ${
                        currentUser?.category ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                        <option key={k} value={k} className="bg-zinc-900 text-white font-bold">
                          {CATEGORY_LABEL[k]}
                        </option>
                      ))}
                    </select>
                    {!currentUser?.category && (
                      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-amber-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-white text-xs font-bold block mb-1.5">Nome do cliente</label>
                <input
                  value={clientName}
                  onChange={(e) => {
                    if (authUser) return;
                    setClientName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => !authUser && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Ex: Ana Mussa"
                  readOnly={!!authUser}
                  className={`w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white font-bold placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${
                    authUser ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
                {showSuggestions && suggestions.length > 0 && !authUser && (
                  <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl max-h-60 overflow-y-auto z-20 shadow-2xl divide-y divide-zinc-800">
                    {suggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-zinc-800/80 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-white">{u.nome}</p>
                          <p className="text-[11px] text-white font-medium">{u.email}</p>
                        </div>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 font-bold">
                          {u.telefone || 'Sem Telefone'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-white text-xs font-bold block mb-1.5">Contacto</label>
                <div className={`flex items-center w-full rounded-xl bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 overflow-hidden ${authUser ? 'opacity-70' : ''}`}>
                  <div className="pl-4 pr-3 py-3.5 text-sm text-amber-500 font-bold bg-zinc-900 border-r border-zinc-700">
                    +258
                  </div>
                  <input
                    value={clientContact}
                    onChange={(e) => !authUser && setClientContact(formatContact(e.target.value))}
                    placeholder="Ex: 84..."
                    readOnly={!!authUser}
                    className={`w-full bg-transparent px-3 py-2 text-sm text-white font-bold placeholder:text-zinc-500 outline-none ${
                      authUser ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </div>


            {/* Compra */}
            {flow === "compra" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Valor do Veículo"
                    value={vehiclePrice}
                    onChange={(v) => setVehiclePrice(Math.min(8_000_000, Math.max(0, v)))}
                    min={0}
                    step={50_000}
                    suffix="MT"
                  />
                  <NumberField
                    label="Rendimento Mensal"
                    value={income}
                    onChange={(v) => setIncome(Math.min(100_000_000, Math.max(0, v)))}
                    min={0}
                    step={5_000}
                    suffix="MT"
                  />
                </div>

                <div>
                  <label className="text-white text-xs font-bold block mb-1.5">Plano de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "pronto", label: "Pronto pagamento" },
                      { key: "prestacoes", label: "Por prestações" },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setPaymentPlan(o.key)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${paymentPlan === o.key
                          ? "bg-amber-500 text-zinc-950"
                          : "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-white text-[10px] mt-1">Máximo {maxMonthsForCategory} meses · Garantia 15 dias</p>
                </div>

                {paymentPlan === "prestacoes" && (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Valor de Entrada"
                      value={downPayment}
                      onChange={(v) => setDownPayment(Math.min(vehiclePrice, Math.max(0, v)))}
                      min={0}
                      step={10_000}
                      suffix="MT"
                    />
                    <NumberField
                      label="Meses"
                      value={mesesPrestacoes}
                      onChange={(v) => setMesesPrestacoes(Math.min(maxMonthsForCategory, Math.max(1, Math.round(v))))}
                      min={1}
                      step={1}
                      suffix="meses"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Aluguer — datas e horas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white text-xs font-bold block mb-1.5">Data início</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-white text-xs font-bold block mb-1.5">Hora levantamento</label>
                    <input
                      type="time"
                      value={horaLevantamento}
                      onChange={(e) => setHoraLevantamento(e.target.value)}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-white text-xs font-bold block mb-1.5">Data fim</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-white text-xs font-bold block mb-1.5">Hora devolução</label>
                    <input
                      type="time"
                      value={horaDevolucao}
                      onChange={(e) => setHoraDevolucao(e.target.value)}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white text-xs font-bold block mb-1.5">Motivo da viagem</label>
                  <textarea
                    value={motivoViagem}
                    onChange={(e) => setMotivoViagem(e.target.value)}
                    placeholder="Ex: Viagem de negócios à Beira, férias em Bilene..."
                    rows={1}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-bold placeholder:text-zinc-500 outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <AddressSearch
                    label="Local levantamento"
                    value={localLevantamento}
                    onChange={setLocalLevantamento}
                    placeholder="Ex: Av. 24 de Julho…"
                  />
                  <AddressSearch
                    label="Local devolução"
                    value={localDevolucao}
                    onChange={setLocalDevolucao}
                    placeholder="Ex: Aeroporto…"
                  />
                </div>

                {dateValidation && !dateValidation.valid ? (
                  <div className="text-xs text-red-100 bg-red-600 border border-red-500 rounded-lg p-2 font-bold">
                    {dateValidation.errors[0]}
                  </div>
                ) : null}

                {availability && !availability.available && dateValidation?.valid ? (
                  <div className="text-xs text-red-100 bg-red-600 border border-red-500 rounded-lg p-2 font-bold">
                    {availability.conflicts[0]}
                  </div>
                ) : null}

                {/* Dias + Custo + Desconto em 3 colunas */}
                <div className="grid grid-cols-3 gap-3">
                  <NumberField
                    label="Dias"
                    value={days}
                    onChange={(v) => setDays(Math.max(1, Math.round(v)))}
                    min={1}
                    step={1}
                    suffix="dias"
                    disabled={dateValidation?.valid === true}
                  />
                  <NumberField
                    label="Custo diário"
                    value={dailyRate}
                    onChange={(v) => setDailyRate(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT/dia"
                    disabled={!isAdmin}
                  />
                  <div className="relative">
                    <NumberField
                      label="Desconto"
                      value={discountPct}
                      onChange={(v) => setDiscountPct(Math.min(100, Math.max(0, v)))}
                      min={0}
                      step={1}
                      suffix="%"
                      disabled={!isAdmin && days < 7}
                    />
                    {days >= 7 && (
                      <div className="absolute top-0 right-0 -translate-y-1 bg-emerald-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                        {days >= 30 ? rules.descontoMensalPercentual : days >= 15 ? rules.descontoQuinzenalPercentual : rules.descontoSemanalPercentual}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Taxa de limpeza"
                    value={cleaningFee}
                    onChange={(v) => setCleaningFee(Math.max(0, v))}
                    min={0}
                    step={50}
                    suffix="MT"
                    disabled={!isAdmin}
                  />
                  <NumberField
                    label="Taxa de logística"
                    value={logisticsFee}
                    onChange={(v) => setLogisticsFee(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                    disabled={!isAdmin}
                  />
                  <NumberField
                    label="Outras taxas"
                    value={otherFees}
                    onChange={(v) => setOtherFees(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                    disabled={!isAdmin}
                  />
                  <NumberField
                    label="Caução"
                    value={deposit}
                    onChange={(v) => setDeposit(Math.max(0, v))}
                    min={0}
                    step={500}
                    suffix="MT"
                    disabled={!isAdmin}
                  />
                </div>
              </>
            )}

          </div>

          {/* ── Result panel ── */}
          <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-5 flex flex-col justify-between shadow-[0_0_50px_-12px_rgba(216,160,32,0.15)] relative overflow-hidden h-fit">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12" />
            
            <div className="relative z-10">
              <div className="text-white text-[10px] mb-2 font-bold uppercase tracking-widest opacity-80">
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? "Prestação Mensal"
                    : "Total (Pronto)"
                  : "Total a pagar"}
              </div>
              <div
                className="text-3xl font-black text-white mb-1 tracking-tighter"
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? fmt(purchasePMT)
                    : fmt(vehiclePrice)
                  : fmt(rentalTotal)}
                <span className="text-lg text-amber-500 ml-1 font-black">MT</span>
              </div>
              <div className="text-white text-[10px] mt-2 font-bold bg-white/5 px-2 py-1 rounded-md inline-block border border-white/10">
                {flow === "compra" && paymentPlan === "prestacoes"
                  ? `${(TAXA_MENSAL * 100).toFixed(1)}%/mês · ${Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes)))} meses`
                  : flow === "compra"
                    ? "Pagamento à vista."
                    : "Inclui diárias, taxas e caução."}
              </div>
            </div>

            {/* Elegibilidade */}
            {flow === "compra" && paymentPlan === "prestacoes" ? (
              <div
                className={`mt-6 rounded-xl p-4 border-2 shadow-md relative z-10 ${eligivel
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-red-500/5 border-red-500/20"
                  }`}
              >
                <div className={`text-xs font-bold mb-1 uppercase tracking-tight flex items-center gap-2 ${eligivel ? "text-emerald-400" : "text-red-400"}`}>
                  {eligivel ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  )}
                  {eligivel ? "Simulação Válida" : "Requisitos não atendidos"}
                </div>
                <div className="text-white text-[11px] leading-tight font-medium opacity-90">
                  {financingStatus.msg}
                </div>
              </div>
            ) : null}

            {/* Resumo */}
            <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
              {(flow === "compra"
                ? paymentPlan === "prestacoes"
                  ? ([
                    ["Veículo", `${fmt(vehiclePrice)}`],
                    ["Entrada", `${fmt(downPayment)}`],
                    ["Financiado", `${fmt(vehiclePrice - downPayment)}`],
                  ] as [string, string][])
                  : ([
                    ["Veículo", `${fmt(vehiclePrice)} MT`],
                    ["Total", `${fmt(vehiclePrice)} MT`],
                  ] as [string, string][])
                : ([
                  ["Diárias", `${fmt(rentDailyAfterDiscount)} MT`],
                  ["Caução", `${fmt(deposit)} MT`],
                ] as [string, string][])
              ).map(([label, val]) => (
                <div key={label} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <div className="text-white text-[10px] font-bold uppercase tracking-tighter mb-0.5">{label}</div>
                  <div className="text-white font-bold text-sm truncate">{val}</div>
                </div>
              ))}
            </div>

            {submitError ? (
              <div className="mt-4 p-3 rounded-lg bg-red-600/90 text-white text-[11px] font-bold text-center shadow-lg animate-bounce">
                {submitError}
              </div>
            ) : null}

            {isBlocked && (
              <div className="mt-6 rounded-xl p-4 bg-red-600 border border-red-500 shadow-lg relative z-10 animate-pulse">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Acesso Restrito
                </div>
                <p className="text-white text-[11px] leading-tight font-medium opacity-95">
                  {isRestricted 
                    ? "Esta conta foi suspensa permanentemente por violação das políticas de segurança (Blacklisted)." 
                    : "Operação bloqueada devido a pendências financeiras ou irregularidades cadastrais. Por favor, contacte a administração."}
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`mt-5 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg relative z-10 ${canSubmit
                ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-zinc-800 text-white cursor-not-allowed border border-zinc-700"
                }`}
            >
              {isBlocked ? "Bloqueado" : "Confirmar Operação"}
            </button>

            {/* Histórico — Mini */}
            <div className="mt-5 relative z-10 border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white text-[11px] font-bold uppercase tracking-widest opacity-80">Últimos Registos</div>
                <button
                  onClick={() => setHistory([])}
                  className="text-[10px] font-bold text-white hover:text-amber-500 transition-colors uppercase tracking-tighter"
                >
                  Limpar
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-white text-[11px] font-medium bg-white/5 p-4 rounded-xl border border-dashed border-white/5 text-center">
                  Sem histórico.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-auto pr-1 custom-scrollbar">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-amber-500/30 transition-colors group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-bold text-xs truncate group-hover:text-amber-500 transition-colors">{h.clientName}</div>
                          <div className="text-white text-[9px] font-bold uppercase tracking-tighter truncate mt-0.5">
                            {h.flow === "compra" ? "Compra" : "Aluguer"} · {CATEGORY_LABEL[h.category]}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-amber-500 font-bold text-xs">
                            {h.flow === "compra"
                              ? h.paymentPlan === "prestacoes"
                                ? fmt(h.values.purchasePMT)
                                : fmt(h.values.vehiclePrice ?? 0)
                              : fmt(h.values.rentTotalPayNow ?? 0)}
                          </div>
                          <div className="text-white text-[9px] font-bold uppercase tracking-tighter">MT</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
