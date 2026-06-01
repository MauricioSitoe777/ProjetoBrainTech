
import { useEffect, useMemo, useState } from "react";
import { AddressSearch } from "./AddressSearch";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";
import { useUsers } from "../context/UsersContext";
import { CATEGORY_LABEL, DOC_LABEL } from "../data/constants";

const TAXA_MENSAL = 0.015;
const MAX_MESES_PRESTACOES = 12;

type FlowType = "compra" | "aluguer";
type Category = "func_publico" | "func_privado" | "empreendedor";
type PaymentPlan = "pronto" | "prestacoes";

type DocumentKey =
  | "bi"
  | "nuit"
  | "declaracao_rendimento"
  | "contrato_trabalho"
  | "carta_conducao"
  | "declaracao_bairro";

const REQUIRED_DOCS_VENDA: Record<Category, readonly DocumentKey[]> = {
  func_publico: ["bi", "nuit", "declaracao_rendimento"],
  func_privado: ["contrato_trabalho", "bi", "nuit", "declaracao_rendimento"],
  empreendedor: ["bi", "nuit"],
} as const;

const REQUIRED_DOCS_VENDA_PRONTO: Record<Category, readonly DocumentKey[]> = {
  func_publico: ["bi", "nuit", "declaracao_bairro"],
  func_privado: ["bi", "nuit", "declaracao_bairro"],
  empreendedor: ["bi", "nuit", "declaracao_bairro"],
} as const;

const REQUIRED_DOCS_ALUGUER: Record<Category, readonly DocumentKey[]> = {
  func_publico: ["bi", "nuit", "carta_conducao"],
  func_privado: ["bi", "nuit", "carta_conducao"],
  empreendedor: ["bi", "nuit", "carta_conducao"],
} as const;

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
  submittedDocs: DocumentKey[];
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
      <label className="text-white text-sm font-bold block mb-2">{label}</label>
      <div className={`flex items-center gap-3 rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 ${disabled ? 'opacity-70 cursor-not-allowed' : 'focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20'}`}>
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => !disabled && e.currentTarget.select()}
          disabled={disabled}
          className={`w-full bg-transparent text-sm text-white font-medium outline-none ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {suffix ? <span className="text-zinc-200 text-xs font-bold">{suffix}</span> : null}
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
  } = useReservations();

  // Get full user data from context to have documents
  const currentUser = useMemo(() => {
    return authUser ? getUser(authUser.id) : undefined;
  }, [authUser, getUser]);
  
  const isAdmin = authUser?.role === "admin";

  const [flow, setFlow] = useState<FlowType>(lockedFlow ?? "compra");
  const [category, setCategory] = useState<Category>("func_publico");
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
  const [clientEmail, setClientEmail] = useState("");
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
  const [deposit, setDeposit] = useState(10_000);
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

  const [docs, setDocs] = useState<Record<DocumentKey, boolean>>({
    bi: false,
    nuit: false,
    declaracao_rendimento: false,
    contrato_trabalho: false,
    carta_conducao: false,
    declaracao_bairro: false,
  });

  // Auto-preencher dados se o utilizador logado for alterado/carregado
  useEffect(() => {
    if (currentUser) {
      setClientName(currentUser.nome);
      const contact = currentUser.telefone || currentUser.email || "";
      setClientContact(formatContact(contact.replace(/^\+258\s*/, "")));
      
      if (currentUser.category) {
        setCategory(currentUser.category as Category);
      }
      
      if (currentUser.documentos) {
        setDocs(prev => ({
          ...prev,
          ...currentUser.documentos
        }));
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
    setClientEmail(selectedUser.email || "");
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (lockedFlow) {
      setFlow(lockedFlow);
    }
  }, [lockedFlow]);

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

  const requiredDocs = useMemo(() => {
    if (flow === "compra") {
      return paymentPlan === "pronto" ? REQUIRED_DOCS_VENDA_PRONTO[category] : REQUIRED_DOCS_VENDA[category];
    }
    return REQUIRED_DOCS_ALUGUER[category];
  }, [flow, category, paymentPlan]);

  const docsOk = requiredDocs.every((k) => docs[k]);

  const purchasePMT = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan !== "prestacoes") return 0;
    const n = Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)));
    const financed = Math.max(0, vehiclePrice - downPayment);
    return pmtMonthly(financed, n, TAXA_MENSAL);
  }, [flow, paymentPlan, mesesPrestacoes, vehiclePrice, downPayment]);

  const purchaseTotal = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan === "pronto") return vehiclePrice;
    const n = Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)));
    return downPayment + (purchasePMT * n);
  }, [flow, paymentPlan, vehiclePrice, purchasePMT, mesesPrestacoes, downPayment]);

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
    if (dateValidation?.valid) {
      setDays(dateValidation.days);
    }
  }, [dateValidation]);

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
  const canSubmit =
    clientName.trim().length >= 2 &&
    docsOk &&
    rentalDetailsOk &&
    (flow === "aluguer" || eligivel) &&
    (!!authUser || clientEmail.trim().length > 0);

  const handleSubmit = () => {
    setSubmitError("");
    if (!canSubmit) return;

    const submittedDocs = (Object.keys(docs) as DocumentKey[]).filter((k) => docs[k]);

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
          ? Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)))
          : undefined,
      values,
      submittedDocs,
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
        documentos: { ...currentUser?.documentos, ...docs },
      });
    } else {
      // Guest: reuse existing account if email/phone matches, otherwise create pending
      const existing = allUsers.find(
        (u) => u.email === clientEmail.trim() || (normalizedPhone && u.telefone === normalizedPhone),
      );
      if (existing) {
        transactionUserId = existing.id;
      } else {
        const guest = addUser({
          nome: clientName.trim(),
          email: clientEmail.trim(),
          telefone: normalizedPhone,
          role: "cliente",
          status: "pendente",
          category,
          documentos: docs,
        });
        transactionUserId = guest.id;
      }
    }

    if (flow === "aluguer") {
      const result = createReservation({
        vehicleId: rentalVehicleId,
        userId: transactionUserId,
        clientName: clientName.trim(),
        clientEmail: authUser?.email ?? clientEmail.trim(),
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
        clientEmail: authUser?.email ?? clientEmail.trim(),
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
    <section id="simulador" className="py-12 bg-zinc-950 relative overflow-hidden">
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
        <div className="text-center mb-12">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
            {lockedFlow === "aluguer" ? "Aluguer" : "Compra & Aluguer"}
          </div>
          <h2
            className="text-white text-4xl md:text-5xl font-bold"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Simulador
          </h2>
          <p className="text-zinc-100 text-base mt-4 max-w-xl mx-auto font-medium opacity-90">
            {lockedFlow === "aluguer"
              ? "Escolha a categoria do cliente, submeta documentos e simule os custos do aluguer."
              : "Escolha a categoria do cliente, submeta documentos e simule pagamentos (compra) ou custos (aluguer)."}
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">

          {/* ── Controls panel ── */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-8 flex flex-col gap-8 shadow-2xl">

            {/* Serviço */}
            <div>
              <label className="text-white text-base font-bold block mb-4 uppercase tracking-tight">Serviço</label>
              {lockedFlow ? (
                <div className="py-3 rounded-xl text-sm font-bold text-center bg-amber-500 text-zinc-950 shadow-lg">
                  {lockedFlow === "aluguer" ? "Aluguer" : "Compra (Venda)"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: "compra", label: "Compra (Venda)" },
                    { key: "aluguer", label: "Aluguer" },
                  ] as const).map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setFlow(o.key)}
                      className={`py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md ${flow === o.key
                        ? "bg-amber-500 text-zinc-950 scale-[1.02]"
                        : "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700"
                        }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Categoria */}
            <div>
              {flow === "compra" && (
                <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h3 className="text-amber-500 text-[11px] font-bold mb-2 flex items-center gap-2 uppercase tracking-tighter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Informação de Financiamento
                  </h3>
                  <div className="space-y-2 text-[11px] text-zinc-100 font-medium leading-tight">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`p-2 rounded-lg transition-colors ${category === 'func_publico' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-950/50'}`}>
                        <p className="font-bold text-white mb-0.5">Público</p>
                        <p className="opacity-80 text-[10px]">Entrada opcional. Limite 30% salário.</p>
                      </div>

                      <div className={`p-2 rounded-lg transition-colors ${category === 'func_privado' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-950/50'}`}>
                        <p className="font-bold text-white mb-0.5">Privado</p>
                        <p className="opacity-80 text-[10px]">Entrada obrigatória: 10% a 50%.</p>
                      </div>

                      <div className={`p-2 rounded-lg transition-colors ${category === 'empreendedor' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-950/50'}`}>
                        <p className="font-bold text-white mb-0.5">Empreendedor</p>
                        <p className="opacity-80 text-[10px]">Posse viatura com 75% entrada.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <label className="text-white text-sm font-bold block">Funcionário</label>
                {currentUser?.category && (
                  <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-400/20 px-3 py-1 rounded-lg border border-emerald-400/30">
                    Definido no Perfil
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  disabled={!!currentUser?.category}
                  className={`w-full appearance-none rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${
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
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-amber-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-white text-sm font-bold block mb-2">Nome do cliente</label>
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
                  className={`w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold placeholder:text-zinc-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${
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
                          <p className="text-[11px] text-zinc-400 font-medium">{u.email}</p>
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
                <label className="text-white text-sm font-bold block mb-2">Contacto</label>
                <div className={`flex items-center w-full rounded-xl bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 overflow-hidden ${authUser ? 'opacity-70' : ''}`}>
                  <div className="pl-4 pr-3 py-3.5 text-sm text-amber-500 font-bold bg-zinc-900 border-r border-zinc-700">
                    +258
                  </div>
                  <input
                    value={clientContact}
                    onChange={(e) => !authUser && setClientContact(formatContact(e.target.value))}
                    placeholder="Ex: 84..."
                    readOnly={!!authUser}
                    className={`w-full bg-transparent px-4 py-3.5 text-sm text-white font-bold placeholder:text-zinc-600 outline-none ${
                      authUser ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Email — só visível para convidados */}
            {!authUser && (
              <div>
                <label className="text-white text-sm font-bold block mb-2">
                  Email do cliente <span className="text-amber-400 text-xs font-bold">*</span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@cliente.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold placeholder:text-zinc-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-inner"
                />
                <p className="text-zinc-100 text-[11px] mt-2 font-medium italic">
                  O seu pedido ficará pendente até o admin aprovar o registo.
                </p>
              </div>
            )}

            {/* Compra */}
            {flow === "compra" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                {paymentPlan === "prestacoes" && (
                  <NumberField
                    label="Valor de Entrada"
                    value={downPayment}
                    onChange={(v) => setDownPayment(Math.min(vehiclePrice, Math.max(0, v)))}
                    min={0}
                    step={10_000}
                    suffix="MT"
                  />
                )}

                <div>
                  <label className="text-white text-sm font-bold block mb-4">Plano de Pagamento</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "pronto", label: "Pronto pagamento" },
                      { key: "prestacoes", label: "Por prestações" },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setPaymentPlan(o.key)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md ${paymentPlan === o.key
                          ? "bg-amber-500 text-zinc-950 scale-[1.02]"
                          : "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-zinc-100 text-xs mt-3 font-bold italic">
                    Prestações: máximo {MAX_MESES_PRESTACOES} meses.
                  </div>
                </div>

                {paymentPlan === "prestacoes" ? (
                  <NumberField
                    label="Meses"
                    value={mesesPrestacoes}
                    onChange={(v) => setMesesPrestacoes(Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(v))))}
                    min={1}
                    step={1}
                    suffix="meses"
                  />
                ) : null}
              </>
            ) : (
              <>
                {/* Aluguer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-white text-sm font-bold block mb-2">Data de início</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-bold block mb-2">Hora de levantamento</label>
                    <input
                      type="time"
                      value={horaLevantamento}
                      onChange={(e) => setHoraLevantamento(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-bold block mb-2">Data de fim</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-bold block mb-2">Hora de devolução</label>
                    <input
                      type="time"
                      value={horaDevolucao}
                      onChange={(e) => setHoraDevolucao(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-bold block mb-2">Motivo da viagem</label>
                  <textarea
                    value={motivoViagem}
                    onChange={(e) => setMotivoViagem(e.target.value)}
                    placeholder="Ex: Viagem de negócios à Beira, férias em Bilene..."
                    rows={2}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3.5 text-sm text-white font-bold placeholder:text-zinc-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 resize-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <AddressSearch
                    label="Local de levantamento"
                    value={localLevantamento}
                    onChange={setLocalLevantamento}
                    placeholder="Ex: Av. 24 de Julho, Maputo…"
                  />
                  <AddressSearch
                    label="Local de devolução"
                    value={localDevolucao}
                    onChange={setLocalDevolucao}
                    placeholder="Ex: Aeroporto de Maputo…"
                  />
                </div>

                {dateValidation && !dateValidation.valid ? (
                  <div className="text-xs text-red-100 bg-red-600 border border-red-500 rounded-xl p-4 font-bold shadow-lg">
                    {dateValidation.errors[0]}
                  </div>
                ) : null}

                {availability && !availability.available && dateValidation?.valid ? (
                  <div className="text-xs text-red-100 bg-red-600 border border-red-500 rounded-xl p-4 font-bold shadow-lg">
                    {availability.conflicts[0]}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                </div>

                <NumberField
                  label="Desconto"
                  value={discountPct}
                  onChange={(v) => setDiscountPct(Math.min(100, Math.max(0, v)))}
                  min={0}
                  step={1}
                  suffix="%"
                  disabled={!isAdmin}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

            {/* Documentos */}
            <div>
              <div className="flex items-end justify-between gap-6 mb-4">
                <label className="text-white text-sm font-bold block">Documentos do cliente</label>
                <div className={`text-xs font-bold uppercase tracking-widest ${docsOk ? "text-emerald-400" : "text-amber-500"}`}>
                  {docsOk ? "Completo ✓" : "Pendentes —"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {requiredDocs.map((k) => {
                  const checked = docs[k];
                  const alreadyOnFile = currentUser?.documentos?.[k] === true;
                  
                  return (
                    <button
                      key={k}
                      onClick={() => setDocs((d) => ({ ...d, [k]: !d[k] }))}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-sm font-black transition-all shadow-sm ${checked
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 scale-[1.01]"
                        : "bg-zinc-950 border-zinc-700 text-white hover:border-amber-500/50"
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${checked ? 'bg-zinc-950' : 'bg-amber-500 animate-pulse'}`} />
                        <div className="flex flex-col items-start">
                          <span className={checked ? 'text-zinc-950' : 'text-white'}>{DOC_LABEL[k]}</span>
                          {alreadyOnFile && (
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${checked ? 'text-zinc-900/70' : 'text-emerald-400'}`}>Arquivado</span>
                          )}
                        </div>
                        {!alreadyOnFile && !checked ? <span className="text-amber-500 text-[10px] font-black ml-1">OBRIG.</span> : null}
                      </span>
                      <span className={checked ? "text-zinc-950 text-lg" : "text-zinc-600"}>
                        {checked ? "✓" : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Result panel ── */}
          <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-6 flex flex-col justify-between shadow-[0_0_50px_-12px_rgba(216,160,32,0.15)] relative overflow-hidden h-fit">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12" />
            
            <div className="relative z-10">
              <div className="text-zinc-100 text-[10px] mb-2 font-bold uppercase tracking-widest opacity-80">
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? "Prestação Mensal"
                    : "Total (Pronto)"
                  : "Total a pagar"}
              </div>
              <div
                className="text-5xl font-black text-white mb-1 tracking-tighter"
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? fmt(purchasePMT)
                    : fmt(vehiclePrice)
                  : fmt(rentalTotal)}
                <span className="text-2xl text-amber-500 ml-1.5 font-black">MT</span>
              </div>
              <div className="text-zinc-100 text-[10px] mt-2 font-bold bg-white/5 px-2 py-1 rounded-md inline-block border border-white/10">
                {flow === "compra" && paymentPlan === "prestacoes"
                  ? `${(TAXA_MENSAL * 100).toFixed(1)}%/mês · ${Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)))} meses`
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
            <div className="mt-6 grid grid-cols-2 gap-3 relative z-10">
              {(flow === "compra"
                ? paymentPlan === "prestacoes"
                  ? ([
                    ["Veículo", `${fmt(vehiclePrice)}`],
                    ["Entrada", `${fmt(downPayment)}`],
                    ["Financiado", `${fmt(vehiclePrice - downPayment)}`],
                    ["Prestação", `${fmt(purchasePMT)}`],
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
                  <div className="text-zinc-300 text-[10px] font-bold uppercase tracking-tighter mb-0.5">{label}</div>
                  <div className="text-white font-bold text-sm truncate">{val}</div>
                </div>
              ))}
            </div>

            {submitError ? (
              <div className="mt-4 p-3 rounded-lg bg-red-600/90 text-white text-[11px] font-bold text-center shadow-lg animate-bounce">
                {submitError}
              </div>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`mt-8 w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg relative z-10 ${canSubmit
                ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                }`}
            >
              Confirmar Operação
            </button>

            {/* Histórico — Mini */}
            <div className="mt-8 relative z-10 border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white text-[11px] font-bold uppercase tracking-widest opacity-80">Últimos Registos</div>
                <button
                  onClick={() => setHistory([])}
                  className="text-[10px] font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-tighter"
                >
                  Limpar
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-zinc-500 text-[11px] font-medium bg-white/5 p-4 rounded-xl border border-dashed border-white/5 text-center">
                  Sem histórico.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-auto pr-1 custom-scrollbar">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-amber-500/30 transition-colors group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-bold text-xs truncate group-hover:text-amber-500 transition-colors">{h.clientName}</div>
                          <div className="text-zinc-400 text-[9px] font-bold uppercase tracking-tighter truncate mt-0.5">
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
                          <div className="text-zinc-500 text-[9px] font-bold uppercase tracking-tighter">MT</div>
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
