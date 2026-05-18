
import { useEffect, useMemo, useState } from "react";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";

const TAXA_MENSAL = 0.015;
const MAX_MESES_PRESTACOES = 12;

type FlowType = "compra" | "aluguer";
type Category = "func_publico" | "func_privado" | "empreendedor";
type PaymentPlan = "pronto" | "prestacoes";

type DocumentKey =
  | "bi"
  | "nuit"
  | "declaracao_rendimento"
  | "contrato_trabalho";

const CATEGORY_LABEL: Record<Category, string> = {
  func_publico: "Público",
  func_privado: "Privado",
  empreendedor: "Empreendedor",
};

const DOC_LABEL: Record<DocumentKey, string> = {
  bi: "B.I",
  nuit: "NUIT",
  declaracao_rendimento: "Declaração de Rendimento",
  contrato_trabalho: "Contrato de trabalho",
};

const REQUIRED_DOCS_VENDA: Record<Category, readonly DocumentKey[]> = {
  func_publico: ["bi", "nuit", "declaracao_rendimento"],
  func_privado: ["contrato_trabalho", "bi", "nuit", "declaracao_rendimento"],
  empreendedor: ["declaracao_rendimento"],
} as const;

const REQUIRED_DOCS_ALUGUER = REQUIRED_DOCS_VENDA;

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-white text-sm font-medium block mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  const [raw, setRaw] = useState(String(Number.isFinite(value) ? value : 0));

  useEffect(() => {
    setRaw(String(Number.isFinite(value) ? value : 0));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setRaw(str);
    const num = parseFloat(str);
    if (!isNaN(num)) onChange(num);
  };

  const handleBlur = () => {
    const num = parseFloat(raw);
    const safe = isNaN(num) ? (min ?? 0) : num;
    setRaw(String(safe));
    onChange(safe);
  };

  return (
    <div>
      <label className="text-white text-sm font-medium block mb-2">{label}</label>
      <div className="flex items-center gap-3 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 focus-within:border-zinc-600">
        <input
          type="number"
          value={raw}
          min={min}
          step={step}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full bg-transparent text-sm text-white outline-none"
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
  const { user: authUser } = useAuth();
  const { createReservation } = useReservations();

  const [flow, setFlow] = useState<FlowType>("compra");
  const [category, setCategory] = useState<Category>("func_publico");

  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");

  useEffect(() => {
    if (authUser) {
      setClientName(authUser.nome);
      setClientContact(authUser.email);
    }
  }, [authUser]);

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
        mode?: "aluguer" | "compra";
        dailyRate?: number;
        vehiclePrice?: number;
      };

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
      clientContact: clientContact.trim(),
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

    // Se estiver logado e for aluguer, criar reserva real
    if (authUser && flow === "aluguer") {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + Math.max(1, Math.round(days)));

      createReservation({
        vehicleId: 4, // Exemplo: Toyota Hilux ou o selecionado se tivéssemos o ID
        userId: authUser.id,
        clientName: authUser.nome,
        clientEmail: authUser.email,
        dataInicio: start.toISOString().split('T')[0],
        dataFim: end.toISOString().split('T')[0],
        status: 'pendente',
        valorTotal: rentTotalPayNow,
        deposito: deposit,
      });
    }
  };

  return (
    <section id="simulador" className="py-20 bg-zinc-950 relative overflow-hidden">
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
            className="absolute right-6 top-0 -translate-y-2 w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950/60 text-white hover:text-white hover:border-zinc-600 transition flex items-center justify-center"
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
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      flow === o.key
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
              <label className="text-white text-sm font-medium block mb-3">Funcionário</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setCategory(k)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      category === k
                        ? "bg-zinc-700 text-white border border-zinc-600"
                        : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {CATEGORY_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Nome do cliente"
                value={clientName}
                onChange={setClientName}
                placeholder="Ex: Ana Mussa"
              />
              <TextField
                label="Contacto (opcional)"
                value={clientContact}
                onChange={setClientContact}
                placeholder="Ex: +258 84..."
              />
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
                    onChange={(v) => setIncome(Math.min(300_000, Math.max(0, v)))}
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
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                          paymentPlan === o.key
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
                  />
                </div>

                <NumberField
                  label="Desconto"
                  value={discountPct}
                  onChange={(v) => setDiscountPct(Math.min(100, Math.max(0, v)))}
                  min={0}
                  step={1}
                  suffix="%"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    label="Taxa de limpeza"
                    value={cleaningFee}
                    onChange={(v) => setCleaningFee(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                  />
                  <NumberField
                    label="Caução"
                    value={deposit}
                    onChange={(v) => setDeposit(Math.max(0, v))}
                    min={0}
                    step={100}
                    suffix="MT"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {(Object.keys(DOC_LABEL) as DocumentKey[]).map((k) => {
                  const required = requiredDocs.includes(k);
                  const checked = docs[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setDocs((d) => ({ ...d, [k]: !d[k] }))}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        checked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                          : required
                          ? "bg-zinc-950/30 border-amber-500/20 text-white hover:border-amber-500/40"
                          : "bg-zinc-950/30 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${required ? "bg-amber-500" : "bg-zinc-700"}`} />
                        {DOC_LABEL[k]}
                        {required ? <span className="text-amber-400 text-xs font-black ml-1">OBRIG.</span> : null}
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
                className={`mt-8 rounded-2xl p-5 border ${
                  eligivel
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
              className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                canSubmit
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
    </section>
  );
}