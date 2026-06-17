
import { useEffect, useMemo, useState } from "react";
import { AddressSearch } from "./AddressSearch";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";
import { useUsers } from "../context/UsersContext";
import { useMotoristas } from "../context/MotoristasContext";
import { useVehicles } from "../context/VehiclesContext";
import { CATEGORY_LABEL } from "../data/constants";
import { GuestRequestModal } from "./GuestRequestModal";

const TAXA_MENSAL = 0.015;
const MAX_MESES_PADRAO = 12;
const MAX_MESES_FUNCIONARIO = 48;

type FlowType = "compra" | "aluguer";
type Category = "func_publico" | "func_privado" | "empreendedor";
type PaymentPlan = "pronto" | "prestacoes";

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
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
      <label className="text-white text-xs font-bold block mb-1">{label}</label>
      <div className={`flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 ${disabled ? 'opacity-70 cursor-not-allowed' : 'focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20'}`}>
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => !disabled && e.currentTarget.select()}
          disabled={disabled}
          className={`w-full bg-transparent text-xs text-white font-medium outline-none ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {suffix ? <span className="text-white text-[10px] font-bold">{suffix}</span> : null}
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
  const { motoristas } = useMotoristas();
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
  const [showGuestModal, setShowGuestModal] = useState(false);
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
  const localLevantamento = "Escritório Central (Av. Julius Nyerere, Maputo)";
  const localDevolucao    = "Escritório Central (Av. Julius Nyerere, Maputo)";
  const [comMotorista, setComMotorista] = useState(false);
  const [motoristaId, setMotoristaId] = useState("");
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
    if (flow !== "compra" || paymentPlan !== "prestacoes") return { ok: true, title: "", why: "", fix: "" };

    const pctEntry = vehiclePrice > 0 ? (downPayment / vehiclePrice) * 100 : 0;

    if (category === "func_publico") {
      if (purchasePMT > maxPmt) {
        return {
          ok: false,
          title: "A prestação mensal é demasiado alta",
          why: `Imagina o teu salário como uma pizza 🍕. A empresa só permite usar até 30% (3 fatias em 10) para pagar o carro por mês. O teu limite é ${fmt(maxPmt)} MT/mês, mas a prestação calculada é ${fmt(purchasePMT)} MT — ultrapassa esse limite.`,
          fix: `Tens duas formas de resolver: (1) Coloca um valor de entrada para reduzir o que falta financiar. (2) Aumenta o número de meses para que cada prestação fique mais pequena.`,
        };
      }
      return { ok: true, title: "Tudo certo!", why: "Não precisas de dar entrada. A prestação cabe no teu salário.", fix: "" };
    }

    if (category === "func_privado") {
      if (pctEntry < 10) {
        return {
          ok: false,
          title: "A entrada é muito pequena",
          why: `Pensa assim: se o carro custa ${fmt(vehiclePrice)} MT, tens de pagar pelo menos 10% logo no início — isso é ${fmt(Math.round(vehiclePrice * 0.1))} MT. É como reservar um lugar: pagas um sinal primeiro para mostrar que és sério. Agora tens ${fmt(downPayment)} MT de entrada, o que é menos de 10%.`,
          fix: `Aumenta a entrada para pelo menos ${fmt(Math.round(vehiclePrice * 0.1))} MT (10% do preço). Usa o botão "Mín 10%" para preencher automaticamente.`,
        };
      }
      if (pctEntry > 50) {
        return {
          ok: false,
          title: "A entrada é demasiado alta",
          why: `Para funcionários privados, a entrada não pode ultrapassar 50% do valor do carro (${fmt(Math.round(vehiclePrice * 0.5))} MT). Estás a colocar mais do que isso. Parece estranho, mas as regras impedem que a entrada seja excessiva neste tipo de financiamento.`,
          fix: `Reduz a entrada para no máximo ${fmt(Math.round(vehiclePrice * 0.5))} MT (50%). Usa o botão "Máx 50%" para ajustar.`,
        };
      }
      if (purchasePMT > maxPmt) {
        return {
          ok: false,
          title: "A prestação mensal é demasiado alta",
          why: `O teu salário é ${fmt(income)} MT. A regra diz que só podes gastar até 30% disso por mês no carro — ou seja, no máximo ${fmt(maxPmt)} MT/mês. A prestação calculada é ${fmt(purchasePMT)} MT, que é mais do que esse limite.`,
          fix: `Podes resolver de duas formas: (1) Aumenta a entrada — quanto mais deres agora, menos precisas de pagar todos os meses. (2) Aumenta o número de meses para dividir melhor o valor.`,
        };
      }
      return { ok: true, title: "Tudo certo!", why: "A entrada e a prestação mensal estão dentro das regras.", fix: "" };
    }

    if (category === "empreendedor") {
      if (pctEntry < 75) {
        return {
          ok: false,
          title: "A entrada mínima é de 75%",
          why: `Para empresários, as regras são diferentes. Tens de pagar pelo menos 75% do valor do carro logo à partida. No caso deste carro (${fmt(vehiclePrice)} MT), isso significa ${fmt(Math.round(vehiclePrice * 0.75))} MT de entrada. Agora tens ${fmt(downPayment)} MT, que é menos do que o mínimo exigido.`,
          fix: `Aumenta a entrada para pelo menos ${fmt(Math.round(vehiclePrice * 0.75))} MT. Clica em "Usar mínimo (75%)" para preencher automaticamente.`,
        };
      }
      return { ok: true, title: "Tudo certo!", why: "Entrada superior a 75% confirmada.", fix: "" };
    }

    return { ok: true, title: "", why: "", fix: "" };
  }, [flow, paymentPlan, category, downPayment, vehiclePrice, purchasePMT, maxPmt, income, fmt]);

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
        motoristaId: comMotorista && motoristaId ? motoristaId : undefined,
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
    <>
    <section id="simulador" className="py-5 bg-zinc-950 relative overflow-hidden">
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
        <div className="text-center mb-4">
          <div className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            {lockedFlow === "aluguer" ? "Aluguer" : "Compra & Aluguer"}
          </div>
          <h2 className="text-white text-xl md:text-2xl font-bold">Simulador</h2>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-4">

          {/* ── Controls panel ── */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-4 flex flex-col gap-2.5 shadow-2xl self-start">

            {/* Serviço */}
            {!lockedFlow ? (
              <div>
                <label className="text-white text-xs font-bold block mb-1.5 uppercase tracking-tight">O que pretende?</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { key: "compra",  label: "🚗  Comprar",  sub: "Prestações mensais" },
                    { key: "aluguer", label: "🔑  Alugar",   sub: "Diário ou mensal" },
                  ] as const).map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setFlow(o.key)}
                      className={`py-2 px-3 rounded-lg text-left transition-all duration-200 ${flow === o.key
                        ? "bg-amber-500 text-zinc-950"
                        : "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      <p className="text-xs font-black">{o.label}</p>
                      <p className={`text-[9px] font-semibold mt-0.5 ${flow === o.key ? 'text-zinc-800' : 'text-white'}`}>{o.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-2 rounded-lg text-xs font-bold text-center bg-amber-500 text-zinc-950">
                {lockedFlow === "aluguer" ? "🔑 Aluguer" : "🚗 Compra"}
              </div>
            )}

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-white text-xs font-bold block mb-1.5">Cliente</label>
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
                  className={`w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${
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
                <div className={`flex items-center w-full rounded-lg bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 overflow-hidden ${authUser ? 'opacity-70' : ''}`}>
                  <div className="pl-3 pr-2 py-1.5 text-xs text-amber-500 font-bold bg-zinc-900 border-r border-zinc-700">
                    +258
                  </div>
                  <input
                    value={clientContact}
                    onChange={(e) => !authUser && setClientContact(formatContact(e.target.value))}
                    placeholder="Ex: 84..."
                    readOnly={!!authUser}
                    className={`w-full bg-transparent px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-zinc-500 outline-none ${
                      authUser ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </div>


            {/* ══ COMPRA ══ */}
            {flow === "compra" ? (
              <>
                {/* 1. Perfil do comprador */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-white text-xs font-bold uppercase tracking-tight">Tipo de Funcionario</label>
                    {currentUser?.category && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Definido pelo perfil</span>
                    )}
                  </div>
                  {(() => {
                    const PROFILES = [
                      { key: 'func_publico',  emoji: '🏛️', title: 'Público',    rules: 'Sem entrada · até 48 prestações' },
                      { key: 'func_privado',  emoji: '💼', title: 'Privado',    rules: 'Entrada 10–50% · até 48 prestações' },
                      { key: 'empreendedor',  emoji: '🏢', title: 'Empresário', rules: 'Entrada mín. 75% · até 12 prestações' },
                    ] as const;
                    const locked = !!currentUser?.category;
                    const active = PROFILES.find(p => p.key === category);
                    return (
                      <>
                        <div className="flex gap-1.5">
                          {PROFILES.map(p => {
                            const isActive = category === p.key;
                            return (
                              <button key={p.key} type="button" disabled={locked}
                                onClick={() => !locked && setCategory(p.key as Category)}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                  isActive ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                  : locked  ? 'bg-zinc-800/40 border-zinc-700 text-zinc-500 cursor-not-allowed'
                                  : 'bg-zinc-800/60 border-zinc-700 text-white hover:border-zinc-500'
                                }`}
                              >
                                <span>{p.emoji}</span>
                                <span>{p.title}</span>
                              </button>
                            );
                          })}
                        </div>
                        {active && (
                          <p className="text-[9px] text-white mt-1 leading-tight">{active.rules}</p>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 2. Preço + Salário */}
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="💰 Preço do Veículo" value={vehiclePrice}
                    onChange={(v) => setVehiclePrice(Math.min(8_000_000, Math.max(0, v)))} min={0} suffix="MT" />
                  <NumberField label="💵 O Meu Salário" value={income}
                    onChange={(v) => setIncome(Math.min(100_000_000, Math.max(0, v)))} min={0} suffix="MT/mês" />
                </div>

                {/* 3. Como vai pagar? */}
                <div>
                  <label className="text-white text-xs font-bold block mb-1.5">Como vai pagar?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "pronto",     label: "💵  À Vista",       sub: "Paga tudo de uma vez" },
                      { key: "prestacoes", label: "📅  Em Prestações", sub: `Até ${maxMonthsForCategory} meses` },
                    ] as const).map((o) => (
                      <button key={o.key} onClick={() => setPaymentPlan(o.key)}
                        className={`py-2 px-3 rounded-lg text-left transition-all ${paymentPlan === o.key
                          ? "bg-amber-500 text-zinc-950"
                          : "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700"}`}
                      >
                        <p className="text-xs font-black">{o.label}</p>
                        <p className={`text-[9px] font-semibold mt-0.5 ${paymentPlan === o.key ? 'text-zinc-800' : 'text-white'}`}>{o.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Entrada + Meses — só para prestações */}
                {paymentPlan === "prestacoes" && (
                  <>
                    {/* Dica contextual de entrada */}
                    <div className={`rounded-xl px-3 py-2.5 border text-xs leading-relaxed ${
                      category === 'func_publico' ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300'
                      : category === 'func_privado' ? 'bg-blue-500/8 border-blue-500/25 text-blue-300'
                      : 'bg-amber-500/8 border-amber-500/25 text-amber-300'
                    }`}>
                      {category === 'func_publico' && <span>✅ <b>Funcionário Público:</b> não precisa de dar entrada. Pode começar a pagar já na 1ª prestação.</span>}
                      {category === 'func_privado' && <span>ℹ️ <b>Funcionário Privado:</b> entrada obrigatória entre <b>10%</b> ({fmt(vehiclePrice * 0.1)} MT) e <b>50%</b> ({fmt(vehiclePrice * 0.5)} MT).</span>}
                      {category === 'empreendedor'  && <span>ℹ️ <b>Empresário:</b> entrada mínima de <b>75%</b> do valor = <b>{fmt(vehiclePrice * 0.75)} MT</b>.</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-start">
                      {/* Entrada */}
                      <div>
                        <NumberField label="Valor de Entrada" value={downPayment}
                          onChange={(v) => setDownPayment(Math.min(vehiclePrice, Math.max(0, v)))} min={0} suffix="MT" />
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {category === 'func_publico' && (
                            <button type="button" onClick={() => setDownPayment(0)}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-white border border-zinc-700 transition-all">
                              Sem entrada (0 MT)
                            </button>
                          )}
                          {category === 'func_privado' && (<>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.10))}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-white hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">Mín 10%</button>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.30))}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-white hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">30%</button>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.50))}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-white hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">Máx 50%</button>
                          </>)}
                          {category === 'empreendedor' && (
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.75))}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all">Usar mínimo (75%)</button>
                          )}
                        </div>
                      </div>

                      {/* Slider de meses */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-white text-xs font-bold">Nº de Meses</label>
                          <div className="flex items-baseline gap-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-0.5">
                            <span className="text-base font-black text-amber-400 leading-none">{mesesPrestacoes}</span>
                            <span className="text-[9px] text-white font-bold">m</span>
                          </div>
                        </div>
                        <input type="range" className="months-slider w-full"
                          min={1} max={maxMonthsForCategory} step={1} value={mesesPrestacoes}
                          onChange={e => setMesesPrestacoes(Number(e.target.value))}
                          style={{ background: `linear-gradient(to right, #d8a020 ${((mesesPrestacoes - 1) / (maxMonthsForCategory - 1)) * 100}%, #3f3f46 ${((mesesPrestacoes - 1) / (maxMonthsForCategory - 1)) * 100}%)` }}
                        />
                        <div className="flex justify-between mt-1.5">
                          {(maxMonthsForCategory <= 12 ? [1, 6, 12] : [1, 12, 24, 48])
                            .filter(v => v <= maxMonthsForCategory).map(v => (
                            <button key={v} type="button" onClick={() => setMesesPrestacoes(v)}
                              className={`text-[9px] font-black px-1 py-0.5 rounded transition-all ${mesesPrestacoes === v ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30' : 'text-white'}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
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

                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">Local de levantamento e devolução</p>
                    <p className="text-xs font-bold text-white truncate">Escritório Central</p>
                    <p className="text-[11px] text-zinc-400">Av. Julius Nyerere, Maputo</p>
                  </div>
                  <span className="shrink-0 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-bold">Fixo</span>
                </div>

                {/* Solicitar motorista */}
                {(() => {
                  const disponiveis = motoristas.filter(m => m.status === 'disponivel');
                  return (
                    <div className={`rounded-xl border transition-all ${comMotorista ? 'border-amber-400/30 bg-amber-400/5' : 'border-zinc-700/60 bg-zinc-800/30'}`}>
                      <button
                        type="button"
                        onClick={() => { setComMotorista(v => !v); setMotoristaId(''); }}
                        className="w-full flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🧑‍✈️</span>
                          <div className="text-left">
                            <p className={`text-xs font-bold ${comMotorista ? 'text-amber-400' : 'text-white'}`}>Com ou sem motorista</p>
                            <p className="text-[10px] text-white">Condutor profissional incluído na reserva</p>
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 shrink-0 ${comMotorista ? 'bg-amber-400 justify-end' : 'bg-zinc-700 justify-start'}`}>
                          <div className="w-4 h-4 rounded-full bg-white shadow" />
                        </div>
                      </button>
                      {comMotorista && (
                        <div className="px-4 pb-3">
                          {disponiveis.length === 0 ? (
                            <p className="text-xs text-white italic">Sem motoristas disponíveis no momento.</p>
                          ) : (
                            <select
                              value={motoristaId}
                              onChange={e => setMotoristaId(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-400 outline-none"
                            >
                              <option value="">Selecionar motorista (opcional)</option>
                              {disponiveis.map(m => (
                                <option key={m.id} value={m.id}>{m.nome} · {m.telefone}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                {/* Dias + Custo + Desconto (desconto só admin) */}
                <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
                  {isAdmin && (
                    <div className="relative">
                      <NumberField
                        label="Desconto"
                        value={discountPct}
                        onChange={(v) => setDiscountPct(Math.min(100, Math.max(0, v)))}
                        min={0}
                        step={1}
                        suffix="%"
                      />
                      {days >= 7 && (
                        <div className="absolute top-0 right-0 -translate-y-1 bg-emerald-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                          {days >= 30 ? rules.descontoMensalPercentual : days >= 15 ? rules.descontoQuinzenalPercentual : rules.descontoSemanalPercentual}%
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Taxa de limpeza"
                    value={cleaningFee}
                    onChange={(v) => setCleaningFee(Math.max(0, v))}
                    min={0}
                    step={50}
                    suffix="MT"
                  />
                  <NumberField
                    label="Taxa de logística"
                    value={logisticsFee}
                    onChange={(v) => setLogisticsFee(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                  />
                  <NumberField
                    label="Outras taxas"
                    value={otherFees}
                    onChange={(v) => setOtherFees(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                  />
                  <NumberField
                    label="Caução"
                    value={deposit}
                    onChange={(v) => setDeposit(Math.max(0, v))}
                    min={0}
                    step={500}
                    suffix="MT"
                  />
                </div>
                )}
              </>
            )}

          </div>

          {/* ── Result panel ── */}
          <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-4 flex flex-col justify-between shadow-[0_0_50px_-12px_rgba(216,160,32,0.15)] relative overflow-hidden h-fit">
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
              <div className="flex items-baseline gap-3 flex-wrap mb-1">
                <span className="text-2xl font-black text-white tracking-tighter">
                  {flow === "compra"
                    ? paymentPlan === "prestacoes"
                      ? fmt(purchasePMT)
                      : fmt(vehiclePrice)
                    : fmt(rentalTotal)}
                  <span className="text-base text-amber-500 ml-1 font-black">MT</span>
                </span>
                <span className="text-white text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md border border-white/10">
                  {flow === "compra" && paymentPlan === "prestacoes"
                    ? `${(TAXA_MENSAL * 100).toFixed(1)}%/mês · ${Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes)))} meses`
                    : flow === "compra"
                      ? "Pagamento à vista."
                      : "Inclui diárias, taxas e caução."}
                </span>
              </div>
            </div>

            {/* Elegibilidade */}
            {flow === "compra" && paymentPlan === "prestacoes" ? (
              <div className={`mt-3 rounded-xl border-2 shadow-md relative z-10 overflow-hidden ${eligivel ? "border-emerald-500/20" : "border-red-500/30"}`}>
                {/* Cabeçalho */}
                <div className={`flex items-center gap-2 px-3 py-2 ${eligivel ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {eligivel ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  )}
                  <span className={`text-xs font-black uppercase tracking-tight ${eligivel ? "text-emerald-400" : "text-red-400"}`}>
                    {eligivel ? "Simulação Válida" : "Requisitos não atendidos"}
                  </span>
                </div>

                {/* Corpo */}
                <div className="px-3 py-2.5 space-y-2 bg-zinc-900/60">
                  {/* Título do problema */}
                  <p className={`text-xs font-black ${eligivel ? "text-emerald-300" : "text-red-300"}`}>
                    {financingStatus.title}
                  </p>

                  {/* Porquê — explicação simples */}
                  {financingStatus.why && (
                    <div className="bg-zinc-800/70 rounded-lg px-2.5 py-2 border border-zinc-700/50">
                      <p className="text-[10px] text-white font-bold mb-0.5 uppercase tracking-wide">O que acontece?</p>
                      <p className="text-[10px] text-white leading-relaxed">{financingStatus.why}</p>
                    </div>
                  )}

                  {/* Como resolver */}
                  {!eligivel && financingStatus.fix && (
                    <div className="bg-amber-500/8 rounded-lg px-2.5 py-2 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400 font-bold mb-0.5 uppercase tracking-wide">Como resolver?</p>
                      <p className="text-[10px] text-white leading-relaxed">{financingStatus.fix}</p>
                    </div>
                  )}
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
                : ([] as [string, string][])
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
              onClick={!authUser ? () => setShowGuestModal(true) : handleSubmit}
              disabled={!authUser ? clientName.trim().length < 2 : !canSubmit}
              className={`mt-5 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg relative z-10 ${
                (!authUser ? clientName.trim().length >= 2 : canSubmit)
                  ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-zinc-800 text-white cursor-not-allowed border border-zinc-700"
              }`}
            >
              {!authUser ? "Registar Interesse" : isBlocked ? "Bloqueado" : "Confirmar Operação"}
            </button>

          </div>

        </div>
      </div>

    </section>

      {showGuestModal && (
        <GuestRequestModal
          intent={flow as 'aluguer' | 'compra'}
          vehicleName={VEHICLES.find(v => v.id === selectedVehicleId)?.name}
          prefill={{ nome: clientName, telefone: clientContact || undefined }}
          preCategory={flow === 'compra' ? (category as import('../types/guest').GuestCategory) : undefined}
          withDriver={flow === 'aluguer' ? comMotorista : undefined}
          onClose={() => setShowGuestModal(false)}
        />
      )}
    </>
  );
}
