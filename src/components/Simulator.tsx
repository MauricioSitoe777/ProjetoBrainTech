
import { useEffect, useMemo, useState } from "react";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";
import { useUsers } from "../context/UsersContext";
import { useRoute } from "../hooks/useRoute";
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
  | "carta_conducao";

const REQUIRED_DOCS_VENDA: Record<Category, readonly DocumentKey[]> = {
  func_publico: ["bi", "nuit", "declaracao_rendimento"],
  func_privado: ["contrato_trabalho", "bi", "nuit", "declaracao_rendimento"],
  empreendedor: ["bi", "nuit"],
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-white text-sm font-medium block mb-2">{label}</label>
      <div className="flex items-center w-full rounded-xl bg-zinc-950/40 border border-zinc-800 focus-within:border-zinc-600 overflow-hidden">
        {prefix && (
          <div className="pl-4 pr-2 py-3 text-sm text-zinc-400 font-semibold bg-zinc-900/50 border-r border-zinc-800">
            {prefix}
          </div>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
        />
      </div>
    </div>
  );
}

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
      <label className="text-white text-sm font-medium block mb-2">{label}</label>
      <div className={`flex items-center gap-3 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus-within:border-zinc-600'}`}>
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => !disabled && e.currentTarget.select()}
          disabled={disabled}
          className={`w-full bg-transparent text-sm text-white outline-none ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {suffix ? <span className="text-zinc-300 text-xs font-semibold">{suffix}</span> : null}
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

export default function Simulator({ showClose = true }: { showClose?: boolean }) {
  const fmt = useCurrencyFormatter();
  const { user: authUser, allUsers } = useAuth();
  const { updateUser, getUser } = useUsers();
  const { createReservation } = useReservations();
  const { navigate } = useRoute();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Get full user data from context to have documents
  const currentUser = useMemo(() => {
    return authUser ? getUser(authUser.id) : undefined;
  }, [authUser, getUser]);
  
  const isAdmin = authUser?.role === "admin";

  const [flow, setFlow] = useState<FlowType>("compra");
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
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    setShowSuggestions(false);
  };

  // Compra
  const [vehiclePrice, setVehiclePrice] = useState(1_500_000);
  const [income, setIncome] = useState(80_000);
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

      if (parsed.mode === "aluguer") {
        setFlow("aluguer");
        if (typeof parsed.dailyRate === "number" && Number.isFinite(parsed.dailyRate) && parsed.dailyRate > 0) {
          setDailyRate(parsed.dailyRate);
        }
      } else if (parsed.mode === "compra") {
        setFlow("compra");
        if (typeof parsed.vehiclePrice === "number" && Number.isFinite(parsed.vehiclePrice) && parsed.vehiclePrice > 0) {
          setVehiclePrice(parsed.vehiclePrice);
        }
        setPaymentPlan("prestacoes");
      }
    } catch {
      // ignore
    }
  }, []);

  const [docs, setDocs] = useState<Record<DocumentKey, boolean>>({
    bi: false,
    nuit: false,
    declaracao_rendimento: false,
    contrato_trabalho: false,
    carta_conducao: false,
  });

  const requiredDocs = useMemo(() => {
    const map = flow === "compra" ? REQUIRED_DOCS_VENDA : REQUIRED_DOCS_ALUGUER;
    return map[category];
  }, [flow, category]);

  const docsOk = requiredDocs.every((k) => docs[k]);

  const purchasePMT = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan !== "prestacoes") return 0;
    const n = Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)));
    return pmtMonthly(vehiclePrice, n, TAXA_MENSAL);
  }, [flow, paymentPlan, mesesPrestacoes, vehiclePrice]);

  const purchaseTotal = useMemo(() => {
    if (flow !== "compra") return 0;
    if (paymentPlan === "pronto") return vehiclePrice;
    const n = Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)));
    return purchasePMT * n;
  }, [flow, paymentPlan, vehiclePrice, purchasePMT, mesesPrestacoes]);

  const maxPmt = income * 0.3;
  const eligivel = flow === "compra" && paymentPlan === "prestacoes" ? purchasePMT <= maxPmt : true;

  const rentDailySubtotal = dailyRate * Math.max(1, Math.round(days));
  const rentDiscount = rentDailySubtotal * (Math.min(100, Math.max(0, discountPct)) / 100);
  const rentDailyAfterDiscount = rentDailySubtotal - rentDiscount;
  const rentTotalPayNow = rentDailyAfterDiscount + cleaningFee + logisticsFee + otherFees + deposit;

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

  const canSubmit = clientName.trim().length >= 2 && docsOk && (flow === "aluguer" || eligivel);

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }

    const submittedDocs = (Object.keys(docs) as DocumentKey[]).filter((k) => docs[k]);

    const values: Record<string, number> =
      flow === "compra"
        ? { vehiclePrice, income, purchasePMT, purchaseTotal }
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
          deposit,
          rentTotalPayNow,
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

    // Se estiver logado, atualizar documentos no perfil e criar transação real
    if (authUser) {
      // Persistir dados no perfil do utilizador (categoria, contacto e documentos)
      updateUser(authUser.id, {
        category,
        telefone: clientContact.trim() ? `+258 ${clientContact.trim()}` : undefined,
        documentos: {
          ...currentUser?.documentos,
          ...docs
        }
      });

      const start = new Date();
      if (flow === "aluguer") {
        const end = new Date();
        end.setDate(start.getDate() + Math.max(1, Math.round(days)));

        createReservation({
          vehicleId: selectedVehicleId ?? 4,
          userId: authUser.id,
          clientName: authUser.nome,
          clientEmail: authUser.email,
          dataInicio: start.toISOString().split('T')[0],
          dataFim: end.toISOString().split('T')[0],
          horaLevantamento: "09:00",
          horaDevolucao: "17:00",
          motivoViagem: "Simulação via sistema",
          status: 'pendente',
          valorTotal: rentTotalPayNow,
          deposito: deposit,
          localLevantamento: 'Escritório Central (Av. Julius Nyerere, Maputo)',
          localDevolucao: 'Escritório Central (Av. Julius Nyerere, Maputo)',
        });
      } else if (flow === "compra") {
        createReservation({
          vehicleId: selectedVehicleId ?? 2,
          userId: authUser.id,
          clientName: authUser.nome,
          clientEmail: authUser.email,
          dataInicio: start.toISOString().split('T')[0],
          dataFim: start.toISOString().split('T')[0],
          horaLevantamento: "09:00",
          horaDevolucao: "09:00",
          status: 'pendente',
          valorTotal: purchaseTotal,
          deposito: paymentPlan === "prestacoes" ? purchasePMT : purchaseTotal,
          notas: `Compra via plano: ${paymentPlan === "prestacoes" ? `${mesesPrestacoes} prestações` : "Pronto pagamento"}`,
        });
      }
    }
  };

  return (
    <section id="simulador" className="py-12 bg-zinc-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)" }}
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
            Compra & Aluguer
          </div>
          <h2
            className="text-white text-4xl md:text-5xl font-black"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Simulador
          </h2>
          <p className="text-zinc-200 text-base mt-4 max-w-xl mx-auto">
            Escolha a categoria do cliente, submeta documentos e simule pagamentos (compra) ou custos (aluguer).
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">

          {/* ── Controls panel ── */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col gap-8">

            {/* Serviço */}
            <div>
              <label className="text-white text-lg font-bold block mb-3">Serviço</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "compra", label: "Compra (Venda)" },
                  { key: "aluguer", label: "Aluguer" },
                ] as const).map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setFlow(o.key)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${flow === o.key
                      ? "bg-amber-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                      }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-white text-sm font-medium block">Funcionário</label>
                {currentUser?.category && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    Definido no Perfil
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  disabled={!!currentUser?.category}
                  className={`w-full appearance-none rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 text-sm text-white font-semibold outline-none focus:border-zinc-600 ${
                    currentUser?.category ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                    <option key={k} value={k} className="bg-zinc-900 text-white">
                      {CATEGORY_LABEL[k]}
                    </option>
                  ))}
                </select>
                {!currentUser?.category && (
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-white text-sm font-medium block mb-2">Nome do cliente</label>
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
                  className={`w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 ${
                    authUser ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
                {showSuggestions && suggestions.length > 0 && !authUser && (
                  <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl max-h-48 overflow-y-auto z-20 shadow-xl divide-y divide-zinc-800">
                    {suggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-800/50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-white">{u.nome}</p>
                          <p className="text-[10px] text-zinc-400">{u.email}</p>
                        </div>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          {u.telefone || 'Sem Telefone'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-white text-sm font-medium block mb-2">Contacto</label>
                <div className="flex items-center w-full rounded-xl bg-zinc-950/40 border border-zinc-800 focus-within:border-zinc-600 overflow-hidden">
                  <div className="pl-4 pr-2 py-3 text-sm text-zinc-400 font-semibold bg-zinc-900/50 border-r border-zinc-800">
                    +258
                  </div>
                  <input
                    value={clientContact}
                    onChange={(e) => !authUser && setClientContact(formatContact(e.target.value))}
                    placeholder="Ex: 84..."
                    readOnly={!!authUser}
                    className={`w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none ${
                      authUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Compra */}
            {flow === "compra" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-white text-sm font-medium block mb-3">Plano de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "pronto", label: "Pronto pagamento" },
                      { key: "prestacoes", label: "Por prestações" },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setPaymentPlan(o.key)}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${paymentPlan === o.key
                          ? "bg-amber-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                          }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-zinc-300 text-xs mt-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    label="Dias"
                    value={days}
                    onChange={(v) => setDays(Math.max(1, Math.round(v)))}
                    min={1}
                    step={1}
                    suffix="dias"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="flex items-end justify-between gap-6 mb-3">
                <label className="text-white text-sm font-medium block">Documentos do cliente</label>
                <div className={`text-xs font-semibold ${docsOk ? "text-emerald-400" : "text-zinc-300"}`}>
                  {docsOk ? "Completo" : "Obrigatórios pendentes"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requiredDocs.map((k) => {
                  const checked = docs[k];
                  const alreadyOnFile = currentUser?.documentos?.[k] === true;
                  
                  return (
                    <button
                      key={k}
                      onClick={() => setDocs((d) => ({ ...d, [k]: !d[k] }))}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${checked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-zinc-950/30 border-amber-500/20 text-white hover:border-amber-500/40"
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <div className="flex flex-col items-start">
                          <span>{DOC_LABEL[k]}</span>
                          {alreadyOnFile && (
                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter">Arquivado no Perfil</span>
                          )}
                        </div>
                        {!alreadyOnFile ? <span className="text-amber-400 text-xs font-black ml-1">OBRIG.</span> : null}
                      </span>
                      <span className={checked ? "text-emerald-400" : "text-zinc-400"}>
                        {checked ? "✓" : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Result panel ── */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col justify-between">
            <div>
              <div className="text-zinc-300 text-sm mb-2">
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? "Prestação Mensal Estimada"
                    : "Total (Pronto pagamento)"
                  : "Total a pagar (no levantamento)"}
              </div>
              <div
                className="text-5xl font-black text-white mb-1"
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? fmt(purchasePMT)
                    : fmt(vehiclePrice)
                  : fmt(rentTotalPayNow)}
                <span className="text-2xl text-zinc-400 ml-2">MT</span>
              </div>
              <div className="text-zinc-300 text-xs mt-2">
                {flow === "compra" && paymentPlan === "prestacoes"
                  ? `Taxa referência: ${(TAXA_MENSAL * 100).toFixed(1)}% /mês · ${Math.min(MAX_MESES_PRESTACOES, Math.max(1, Math.round(mesesPrestacoes)))} meses`
                  : flow === "compra"
                    ? "Pagamento à vista (sem prestações)."
                    : "Inclui diárias (com desconto), taxas e caução."}
              </div>
            </div>

            {/* Elegibilidade */}
            {flow === "compra" && paymentPlan === "prestacoes" ? (
              <div
                className={`mt-8 rounded-2xl p-5 border ${eligivel
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/30"
                  }`}
              >
                <div className={`text-sm font-bold mb-1 ${eligivel ? "text-emerald-400" : "text-red-400"}`}>
                  {eligivel ? "✓ Elegível para prestações" : "✗ Rendimento insuficiente"}
                </div>
                <div className="text-zinc-200 text-xs leading-relaxed">
                  {eligivel
                    ? `A prestação (${fmt(purchasePMT)} MT) está dentro do limite de 30% do salário (${fmt(maxPmt)} MT).`
                    : `A prestação (${fmt(purchasePMT)} MT) excede 30% do salário. Reduza o valor ou aumente o prazo.`}
                </div>
              </div>
            ) : null}

            {/* Resumo */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(flow === "compra"
                ? paymentPlan === "prestacoes"
                  ? ([
                    ["Valor do Veículo", `${fmt(vehiclePrice)} MT`],
                    ["Total a Pagar", `${fmt(purchaseTotal)} MT`],
                  ] as [string, string][])
                  : ([
                    ["Valor do Veículo", `${fmt(vehiclePrice)} MT`],
                    ["Total a Pagar", `${fmt(vehiclePrice)} MT`],
                  ] as [string, string][])
                : ([
                  ["Diárias (c/ desconto)", `${fmt(rentDailyAfterDiscount)} MT`],
                  ["Caução", `${fmt(deposit)} MT`],
                ] as [string, string][])
              ).map(([label, val]) => (
                <div key={label} className="bg-zinc-800/50 rounded-xl p-3">
                  <div className="text-zinc-300 text-xs">{label}</div>
                  <div className="text-white font-bold text-sm mt-1">{val}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${canSubmit
                ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-zinc-800 text-zinc-300 cursor-not-allowed"
                }`}
            >
              Guardar no histórico
            </button>

            {/* Histórico */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm font-bold">Histórico do Cliente</div>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs font-bold text-zinc-300 hover:text-zinc-300"
                >
                  Limpar
                </button>
              </div>

              {history.length === 0 ? (
                <div className="mt-3 text-zinc-200 text-sm">
                  Ainda sem registos. Preencha e clique em "Guardar no histórico".
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3 max-h-[280px] overflow-auto pr-1">
                  {history.slice(0, 10).map((h) => (
                    <div key={h.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-white font-bold text-sm">{h.clientName}</div>
                          <div className="text-zinc-300 text-xs mt-0.5">
                            {new Date(h.createdAt).toLocaleString("pt-MZ")} · {h.flow === "compra" ? "Compra" : "Aluguer"} · {CATEGORY_LABEL[h.category]}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-black text-sm">
                            {h.flow === "compra"
                              ? fmt(h.values.purchaseTotal ?? h.values.vehiclePrice ?? 0)
                              : fmt(h.values.rentTotalPayNow ?? 0)}
                            <span className="text-zinc-400 font-bold ml-1">MT</span>
                          </div>
                          <div className="text-zinc-400 text-xs">
                            {h.flow === "compra"
                              ? h.paymentPlan === "prestacoes"
                                ? `${h.mesesPrestacoes} meses`
                                : "Pronto"
                              : `${h.values.days ?? ""} dias`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-zinc-300 text-xs leading-relaxed">
                        Docs: {h.submittedDocs.length > 0 ? h.submittedDocs.map((d) => DOC_LABEL[d]).join(", ") : "—"}
                        {h.clientContact ? ` · Contacto: ${h.clientContact}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Login Suggestion Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowLoginPrompt(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Autenticação Necessária</h3>
              <p className="text-zinc-400 text-sm mb-8">
                Para concluir esta simulação e guardar o seu histórico, por favor inicie sessão na sua conta primeiro.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
                >
                  Fazer Login
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-4 rounded-2xl border border-zinc-800 text-zinc-400 font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Continuar a Simular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}