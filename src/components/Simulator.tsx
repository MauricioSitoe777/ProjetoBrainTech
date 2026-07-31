
import { useEffect, useMemo, useState } from "react";
import { useCurrencyFormatter } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useReservations } from "../context/ReservationsContext";
import { useUsers } from "../context/UsersContext";
import { useMotoristas } from "../context/MotoristasContext";
import { useVehicles } from "../context/VehiclesContext";
import { VEHICLES } from "../data/constants";
import { GuestRequestModal } from "./GuestRequestModal";
import { IconCar, IconKey } from "./Icons";

const TAXA_MENSAL = 0.015;
const MAX_MESES_PADRAO = 12;
const MAX_MESES_FUNCIONARIO = 48;

type FlowType = "compra" | "aluguer";
type Category = "func_publico" | "func_privado" | "empreendedor";
type PaymentPlan = "pronto" | "prestacoes";

function NumberField({
  label,
  value,
  onChange,
  min,
  suffix,
  disabled,
  zeroAsEmpty,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  zeroAsEmpty?: boolean;
  placeholder?: string;
}) {
  const formatNumber = (num: number) => {
    if (!Number.isFinite(num)) return "";
    if (zeroAsEmpty && num === 0) return "";
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
      <label className="text-white text-sm font-normal block mb-1.5">{label}</label>
      <div className={`flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 ${disabled ? 'opacity-70 cursor-not-allowed' : 'focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20'}`}>
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => !disabled && e.currentTarget.select()}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm text-white font-medium outline-none placeholder:text-zinc-500 ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {suffix ? <span className="text-white text-xs font-normal">{suffix}</span> : null}
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

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':');
  const minute = MINUTES.includes(m) ? m : '00';
  const cls = "bg-zinc-950 border border-zinc-700 text-white text-sm font-normal rounded-lg px-2 py-2 outline-none focus:border-amber-500 cursor-pointer";
  return (
    <div className="flex items-center gap-1.5">
      <select value={h} onChange={e => onChange(`${e.target.value}:${minute}`)} className={`${cls} flex-1`}>
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className="text-white font-normal text-sm">:</span>
      <select value={minute} onChange={e => onChange(`${h}:${e.target.value}`)} className={`${cls} flex-1`}>
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
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
  const { vehicles: allVehicles } = useVehicles();
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

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(() => {
    try {
      const raw = sessionStorage.getItem("rentcar:selectedVehicle:v1") ?? localStorage.getItem("rentcar:selectedVehicle:v1");
      if (raw) { const p = JSON.parse(raw); if (p.id) return p.id as number; }
    } catch {}
    return null;
  });

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
  const [clientContact2, setClientContact2] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Compra
  const [vehiclePrice, setVehiclePrice] = useState(() => {
    try {
      const raw = sessionStorage.getItem("rentcar:selectedVehicle:v1") ?? localStorage.getItem("rentcar:selectedVehicle:v1");
      if (raw) { const p = JSON.parse(raw); if (p.mode === 'compra' && typeof p.vehiclePrice === 'number' && p.vehiclePrice > 0) return p.vehiclePrice as number; }
    } catch {}
    return 0;
  });
  const [income, setIncome] = useState(80_000);
  const [downPayment, setDownPayment] = useState(0);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("prestacoes");
  const [mesesPrestacoes, setMesesPrestacoes] = useState(12);

  // Aluguer
  const aluguerVehicles = useMemo(() => allVehicles.filter(v => v.mode === 'aluguer'), [allVehicles]);
  const [rentalVehicleIdState, setRentalVehicleIdState] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem("rentcar:selectedVehicle:v1") ?? localStorage.getItem("rentcar:selectedVehicle:v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.id && p.mode === 'aluguer') return p.id as number;
      }
    } catch {}
    return VEHICLES.find(v => v.mode === 'aluguer')?.id ?? 4;
  });
  const [days, setDays] = useState(3);
  const [dailyRate, setDailyRate] = useState(() => {
    try {
      const raw = sessionStorage.getItem("rentcar:selectedVehicle:v1") ?? localStorage.getItem("rentcar:selectedVehicle:v1");
      if (raw) { const p = JSON.parse(raw); if (p.mode === 'aluguer' && typeof p.dailyRate === 'number' && p.dailyRate > 0) return p.dailyRate as number; }
    } catch {}
    return 8_500;
  });
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
  const localLevantamento = "Escritório Central (Av. 25 de Setembro, Maputo)";
  const localDevolucao    = "Escritório Central (Av. 25 de Setembro, Maputo)";
  const [comMotorista, setComMotorista] = useState(false);
  const [motoristaId, setMotoristaId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [eligibilityExpanded, setEligibilityExpanded] = useState(false);

  useEffect(() => {
    setMesesPrestacoes((months) => Math.min(maxMonthsForCategory, Math.max(1, Math.round(months))));
  }, [maxMonthsForCategory]);

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
    const handler = (e: Event) => {
      const { id, mode, dailyRate, vehiclePrice: vp } = (e as CustomEvent<{
        id: number; mode: "aluguer" | "compra"; dailyRate?: number; vehiclePrice?: number;
      }>).detail;
      setSelectedVehicleId(id);
      if (mode === "aluguer") {
        setRentalVehicleIdState(id);
        if (typeof dailyRate === "number" && dailyRate > 0) setDailyRate(dailyRate);
        if (!lockedFlow) setFlow("aluguer");
      } else if (mode === "compra") {
        if (typeof vp === "number" && vp > 0) setVehiclePrice(vp);
        if (!lockedFlow) setFlow("compra");
      }
    };
    window.addEventListener("rentcar:vehicle-selected", handler as EventListener);
    return () => window.removeEventListener("rentcar:vehicle-selected", handler as EventListener);
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
        if (parsed.mode === 'aluguer') setRentalVehicleIdState(parsed.id);
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

  const clampedMesesPrestacoes = useMemo(
    () => Math.min(maxMonthsForCategory, Math.max(1, Math.round(mesesPrestacoes))),
    [maxMonthsForCategory, mesesPrestacoes],
  );
  const mesesProgress = maxMonthsForCategory <= 1
    ? 0
    : ((clampedMesesPrestacoes - 1) / (maxMonthsForCategory - 1)) * 100;
  const mesesTicks = maxMonthsForCategory <= 12 ? [1, 6, 12] : [1, 12, 24, 48];

  const maxPmt = income * 0.3;

  const financingStatus = useMemo(() => {
    if (flow !== "compra" || paymentPlan !== "prestacoes") return { ok: true, title: "", why: "", fix: "" };

    const pctEntry = vehiclePrice > 0 ? (downPayment / vehiclePrice) * 100 : 0;

    if (category === "func_publico") {
      if (purchasePMT > maxPmt) {
        return {
          ok: false,
          title: "A prestação mensal excede o limite de comprometimento de rendimento",
          why: `A política de financiamento limita o encargo mensal a 30% do rendimento declarado. Com base no salário indicado (${fmt(income)} MT), o limite máximo por mês é ${fmt(maxPmt)} MT. A prestação calculada de ${fmt(purchasePMT)} MT ultrapassa esse tecto.`,
          fix: `Aumente o valor de entrada para reduzir o capital financiado, ou alargue o prazo do financiamento para reduzir o valor de cada prestação mensal.`,
        };
      }
      return { ok: true, title: "Simulação dentro dos parâmetros", why: "A prestação mensal está dentro do limite de 30% do rendimento declarado.", fix: "" };
    }

    if (category === "func_privado") {
      if (pctEntry < 10) {
        return {
          ok: false,
          title: "Entrada insuficiente — mínimo de 10% exigido",
          why: `Para esta categoria, é obrigatório um valor de entrada mínimo de 10% sobre o preço do veículo. Com base no valor indicado (${fmt(vehiclePrice)} MT), a entrada mínima exigida é ${fmt(Math.round(vehiclePrice * 0.1))} MT. O valor atual de ${fmt(downPayment)} MT não satisfaz este requisito.`,
          fix: `Defina uma entrada de pelo menos ${fmt(Math.round(vehiclePrice * 0.1))} MT. Utilize o botão "Mín 10%" para aplicar o valor mínimo automaticamente.`,
        };
      }
      if (pctEntry > 50) {
        return {
          ok: false,
          title: "Entrada acima do limite máximo de 50%",
          why: `Para funcionários do sector privado, a entrada não pode exceder 50% do valor do veículo (${fmt(Math.round(vehiclePrice * 0.5))} MT). O valor introduzido ultrapassa este limite máximo permitido.`,
          fix: `Reduza a entrada para no máximo ${fmt(Math.round(vehiclePrice * 0.5))} MT. Utilize o botão "Máx 50%" para ajustar automaticamente.`,
        };
      }
      if (purchasePMT > maxPmt) {
        return {
          ok: false,
          title: "A prestação mensal excede o limite de comprometimento de rendimento",
          why: `A política de financiamento limita o encargo mensal a 30% do rendimento declarado (${fmt(income)} MT), correspondendo a um máximo de ${fmt(maxPmt)} MT/mês. A prestação calculada de ${fmt(purchasePMT)} MT ultrapassa esse tecto.`,
          fix: `Aumente o valor de entrada para reduzir o capital financiado, ou alargue o prazo para distribuir o encargo por mais meses.`,
        };
      }
      return { ok: true, title: "Simulação dentro dos parâmetros", why: "A entrada e a prestação mensal cumprem os requisitos definidos para esta categoria.", fix: "" };
    }

    if (category === "empreendedor") {
      if (pctEntry < 75) {
        return {
          ok: false,
          title: "Entrada insuficiente — mínimo de 75% exigido",
          why: `Para a categoria de empreendedor, a política exige uma entrada mínima de 75% sobre o valor do veículo. Com base no preço indicado (${fmt(vehiclePrice)} MT), o valor mínimo requerido é ${fmt(Math.round(vehiclePrice * 0.75))} MT. A entrada atual de ${fmt(downPayment)} MT não cumpre este requisito.`,
          fix: `Defina uma entrada de pelo menos ${fmt(Math.round(vehiclePrice * 0.75))} MT. Clique em "Usar mínimo (75%)" para aplicar o valor automaticamente.`,
        };
      }
      return { ok: true, title: "Simulação dentro dos parâmetros", why: "Entrada superior a 75% confirmada. Os requisitos desta categoria estão satisfeitos.", fix: "" };
    }

    return { ok: true, title: "", why: "", fix: "" };
  }, [flow, paymentPlan, category, downPayment, vehiclePrice, purchasePMT, maxPmt, income, fmt]);

  const eligivel = financingStatus.ok;

  const rentalVehicleId = rentalVehicleIdState;

  const purchaseVehicleId = (() => {
    if (selectedVehicleId) {
      const v = allVehicles.find(v => v.id === selectedVehicleId);
      if (v?.mode === 'compra') return selectedVehicleId;
    }
    return 2; // BMW X5 — compra por defeito
  })();
  const dateValidation = useMemo(
    () => (dataInicio && dataFim ? validateDates(dataInicio, dataFim, horaLevantamento) : null),
    [dataInicio, dataFim, horaLevantamento, validateDates],
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

  const contactValid = !!authUser || clientContact.replace(/\D/g, "").length >= 9;

  const canSubmit =
    !isBlocked &&
    clientName.trim().length >= 2 &&
    contactValid &&
    rentalDetailsOk &&
    (flow === "aluguer" || (eligivel && vehiclePrice > 0));

  // Razão clara do primeiro bloqueio — mostrada no painel de resultado
  const blockReason = useMemo(() => {
    if (isBlocked || submitted) return null;
    if (clientName.trim().length < 2)
      return { msg: "Preencha o nome completo do cliente antes de continuar.", icon: "user" as const };
    if (authUser && !contactValid)
      return { msg: "Contacto principal obrigatório. Insira pelo menos 9 dígitos.", icon: "phone" as const };
    if (flow === "aluguer") {
      if (!dataInicio && !dataFim)
        return { msg: "Selecione as datas de levantamento e devolução.", icon: "calendar" as const };
      if (!dataInicio)
        return { msg: "Selecione a data de levantamento.", icon: "calendar" as const };
      if (!dataFim)
        return { msg: "Selecione a data de devolução.", icon: "calendar" as const };
      if (dateValidation && !dateValidation.valid)
        return { msg: dateValidation.errors[0], icon: "calendar" as const };
      if (availability && !availability.available)
        return { msg: availability.conflicts[0] ?? "A viatura está indisponível para as datas seleccionadas.", icon: "car" as const };
    }
    if (flow === "compra" && vehiclePrice <= 0)
      return { msg: "Indique o valor do veículo para continuar.", icon: "car" as const };
    if (flow === "compra" && !eligivel)
      return { msg: "A simulação não cumpre os requisitos de financiamento. Reveja os parâmetros acima.", icon: "warn" as const };
    return null;
  }, [isBlocked, submitted, clientName, authUser, contactValid, flow, dataInicio, dataFim, dateValidation, availability, vehiclePrice, eligivel]);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!canSubmit) return;

    const normalizedPhone  = clientContact.trim()  ? `+258 ${clientContact.trim()}`  : "";
    const normalizedPhone2 = clientContact2.trim() ? `+258 ${clientContact2.trim()}` : "";
    let transactionUserId: string;

    if (authUser) {
      transactionUserId = authUser.id;
      updateUser(authUser.id, { category, telefone: normalizedPhone || undefined });
    } else {
      const existing = allUsers.find(u => normalizedPhone && u.telefone === normalizedPhone);
      if (existing) {
        transactionUserId = existing.id;
      } else {
        const guest = await addUser({
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
        clientPhone2: normalizedPhone2 || undefined,
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
      try {
        sessionStorage.removeItem("rentcar:selectedVehicle:v1");
        localStorage.removeItem("rentcar:selectedVehicle:v1");
      } catch { /* ignore */ }
      setSubmitted(true);
    } else if (flow === "compra") {
      const start = new Date();
      const result = createReservation({
        vehicleId: purchaseVehicleId,
        userId: transactionUserId,
        clientName: clientName.trim(),
        clientEmail: authUser?.email ?? '',
        clientPhone: normalizedPhone || undefined,
        clientPhone2: normalizedPhone2 || undefined,
        dataInicio: start.toISOString().split("T")[0],
        dataFim: start.toISOString().split("T")[0],
        horaLevantamento: "09:00",
        horaDevolucao: "09:00",
        status: "pendente",
        valorTotal: purchaseTotal,
        deposito: paymentPlan === "prestacoes" ? downPayment : purchaseTotal,
        notas: `Compra via plano: ${paymentPlan === "prestacoes" ? `${clampedMesesPrestacoes} prestações` : "Pronto pagamento"}`,
        totalPrestacoes: paymentPlan === "prestacoes" ? clampedMesesPrestacoes : undefined,
        prestacoesPagas: paymentPlan === "prestacoes" ? 0 : undefined,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "Não foi possível submeter o pedido de compra.");
        return;
      }
      try {
        sessionStorage.removeItem("rentcar:selectedVehicle:v1");
        localStorage.removeItem("rentcar:selectedVehicle:v1");
      } catch { /* ignore */ }
      setSubmitted(true);
    }
  };

  return (
    <>
    <section id="simulador" className="min-h-screen bg-zinc-900 relative overflow-hidden flex flex-col justify-center py-16">
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
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">
              {lockedFlow === "aluguer" ? "Aluguer de Viatura" : "Simulador de Compra & Aluguer"}
            </span>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight leading-none">
            Simule o seu <span className="text-amber-400">contrato</span>
          </h2>
          <p className="text-white/60 text-sm mt-2">Preencha os campos e veja o valor estimado em tempo real.</p>
        </div>

        <div className="grid lg:grid-cols-[3fr_2fr] gap-4 items-stretch">

          {/* ── Controls panel ── */}
          <div className="bg-zinc-800/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">

            {/* Row 1: Tipo de Serviço + [Tipo de Funcionário (compra)] + Cliente */}
            <div className={`grid gap-2 ${flow === 'compra' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Serviço */}
              {!lockedFlow ? (
                <div>
                  <label className="text-white text-xs font-normal block mb-1 uppercase tracking-tight">Tipo de Serviço</label>
                  <select
                    value={flow}
                    onChange={(e) => setFlow(e.target.value as FlowType)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-sm text-white font-normal outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="compra">🚗  Compra</option>
                    <option value="aluguer">🔑  Aluguer</option>
                  </select>
                </div>
              ) : (
                <div className="py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 bg-amber-500 text-zinc-950">
                  {lockedFlow === "aluguer" ? <><IconKey size={13} /> Aluguer</> : <><IconCar size={13} /> Compra</>}
                </div>
              )}

              {/* Tipo de Funcionário — só aparece para compra */}
              {flow === 'compra' && (() => {
                const PROFILES = [
                  { key: 'func_publico', emoji: '🏛️', label: 'Func. Público',        rules: 'Sem entrada · até 48 prestações' },
                  { key: 'func_privado', emoji: '💼', label: 'Func. Privado',         rules: 'Entrada 10–50% · até 48 prestações' },
                  { key: 'empreendedor', emoji: '🏢', label: 'Empresário / Indep.',   rules: 'Entrada mín. 75% · até 12 prestações' },
                ] as const;
                const locked = !!currentUser?.category;
                const active = PROFILES.find(p => p.key === category);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-white text-xs font-normal uppercase tracking-tight">Tipo de Funcionário</label>
                      {currentUser?.category && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">Perfil</span>
                      )}
                    </div>
                    <select
                      value={category}
                      disabled={locked}
                      onChange={(e) => !locked && setCategory(e.target.value as Category)}
                      className={`w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-sm text-white font-normal outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {PROFILES.map(p => (
                        <option key={p.key} value={p.key}>{p.emoji}  {p.label}</option>
                      ))}
                    </select>
                    {active && (
                      <p className="text-[10px] text-white/60 mt-1 leading-snug">{active.rules}</p>
                    )}
                  </div>
                );
              })()}

              {/* Cliente — mesma linha */}
              <div className="relative">
                <label className="text-white text-xs font-normal block mb-1">Cliente</label>
                <input
                  value={clientName}
                  onChange={(e) => {
                    if (authUser) return;
                    setClientName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => !authUser && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Nome do cliente"
                  readOnly={!!authUser}
                  className={`w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-sm text-white font-medium placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 ${
                    authUser ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
                {showSuggestions && suggestions.length > 0 && !authUser && (
                  <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl max-h-48 overflow-y-auto z-20 shadow-2xl divide-y divide-zinc-800">
                    {suggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800/80 flex items-center justify-between transition-colors gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{u.nome}</p>
                          <p className="text-xs text-white/60 truncate">{u.email}</p>
                        </div>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">
                          {u.telefone || '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Contacto * | Contacto alternativo — 2 colunas */}
            <div className="grid grid-cols-2 gap-2">
              {/* Contacto principal */}
              <div>
                <label className="text-white text-xs font-normal block mb-1">
                  Contacto <span className="text-amber-500">*</span>
                </label>
                <div className={`flex items-center w-full rounded-lg bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 overflow-hidden ${authUser ? 'opacity-70' : ''}`}>
                  <div className="pl-2.5 pr-2 py-1.5 text-xs text-amber-500 font-bold bg-zinc-900 border-r border-zinc-700 shrink-0">
                    +258
                  </div>
                  <input
                    value={clientContact}
                    onChange={(e) => !authUser && setClientContact(formatContact(e.target.value))}
                    placeholder="84 123 4567"
                    readOnly={!!authUser}
                    className={`w-full bg-transparent px-2 py-1.5 text-sm text-white font-medium placeholder:text-zinc-500 outline-none ${
                      authUser ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Contacto alternativo */}
              <div>
                <label className="text-white text-xs font-normal block mb-1">
                  Alt. <span className="text-white/50 text-[10px]">(opcional)</span>
                </label>
                <div className="flex items-center w-full rounded-lg bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 overflow-hidden">
                  <div className="pl-2.5 pr-2 py-1.5 text-xs text-amber-500 font-bold bg-zinc-900 border-r border-zinc-700 shrink-0">
                    +258
                  </div>
                  <input
                    value={clientContact2}
                    onChange={(e) => setClientContact2(formatContact(e.target.value))}
                    placeholder="86 987 6543"
                    className="w-full bg-transparent px-2 py-1.5 text-sm text-white font-medium placeholder:text-zinc-500 outline-none"
                  />
                </div>
              </div>
            </div>


            {/* ══ COMPRA ══ */}
            {flow === "compra" ? (
              <>
                {/* Row 3: Preço + (Salário se prestações) + Como pagar */}
                <div className={`grid gap-3 ${paymentPlan === "prestacoes" ? "grid-cols-3" : "grid-cols-2"}`}>
                  <NumberField label="Preço do Veículo" value={vehiclePrice}
                    onChange={(v) => setVehiclePrice(Math.min(8_000_000, Math.max(0, v)))} min={0} suffix="MT"
                    disabled={!!selectedVehicleId && !isAdmin}
                    zeroAsEmpty placeholder="Insira o valor" />
                  {paymentPlan === "prestacoes" && (
                    <NumberField label="O Meu Salário" value={income}
                      onChange={(v) => setIncome(Math.min(100_000_000, Math.max(0, v)))} min={0} suffix="MT/mês"
                      disabled={!isAdmin} />
                  )}
                  <div>
                    <label className="text-white text-sm font-normal block mb-1.5">Como pagar?</label>
                    <select
                      value={paymentPlan}
                      onChange={(e) => setPaymentPlan(e.target.value as PaymentPlan)}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2.5 text-sm text-white font-normal outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 cursor-pointer"
                    >
                      <option value="pronto">💵  À Vista</option>
                      <option value="prestacoes">📅  Prestações</option>
                    </select>
                  </div>
                </div>

                {/* 4. Entrada + Meses — só para prestações */}
                {paymentPlan === "prestacoes" && (
                  <>
                    {/* Dica contextual de entrada */}
                    <div className={`rounded-xl px-4 py-3 border text-sm leading-relaxed ${
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
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {category === 'func_publico' && (
                            <button type="button" onClick={() => setDownPayment(0)}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 transition-all">
                              Sem entrada (0 MT)
                            </button>
                          )}
                          {category === 'func_privado' && (<>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.10))}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">Mín 10%</button>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.30))}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">30%</button>
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.50))}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all">Máx 50%</button>
                          </>)}
                          {category === 'empreendedor' && (
                            <button type="button" onClick={() => setDownPayment(Math.round(vehiclePrice * 0.75))}
                              className="text-xs font-medium px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all">Usar mínimo (75%)</button>
                          )}
                        </div>
                      </div>

                      {/* Slider de meses */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-white text-sm font-normal">Nº de Meses</label>
                          <div className="flex items-baseline gap-1 bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1">
                            <span className="text-lg font-black text-amber-400 leading-none">{clampedMesesPrestacoes}</span>
                            <span className="text-xs text-white font-normal">m</span>
                          </div>
                        </div>
                        <input type="range" className="months-slider w-full"
                          min={1} max={maxMonthsForCategory} step={1} value={clampedMesesPrestacoes}
                          onChange={e => setMesesPrestacoes(Number(e.target.value))}
                          style={{ background: `linear-gradient(to right, #E4B42E ${mesesProgress}%, #3f3f46 ${mesesProgress}%)` }}
                        />
                        <div className="relative mt-2 h-7">
                          {mesesTicks.filter(v => v <= maxMonthsForCategory).map(v => {
                            const left = maxMonthsForCategory <= 1 ? 0 : ((v - 1) / (maxMonthsForCategory - 1)) * 100;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setMesesPrestacoes(v)}
                                className={`months-slider-tick-label text-xs font-medium px-1.5 py-0.5 rounded transition-all ${clampedMesesPrestacoes === v ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30' : 'text-white'}`}
                                style={{ left: `${left}%`, transform: left === 0 ? 'translateX(0)' : left === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Viatura selecionada — sempre visível, sem fallback silencioso */}
                <div>
                  <label className="text-white text-xs font-normal block mb-1 uppercase tracking-tight">Viatura</label>
                  <select
                    value={rentalVehicleIdState}
                    onChange={e => setRentalVehicleIdState(Number(e.target.value))}
                    disabled={!isAdmin && aluguerVehicles.some(v => v.id === selectedVehicleId)}
                    className="w-full rounded-lg bg-zinc-950 border border-amber-500/40 px-3 py-1.5 text-sm text-white font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                  >
                    {aluguerVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Datas — Levantamento | Devolução, cada um com data+hora inline */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Levantamento */}
                  <div className="bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-2.5 space-y-1.5">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Levantamento</p>
                    <div className="grid grid-cols-[3fr_2fr] gap-1.5">
                      <div>
                        <label className="text-white text-[10px] font-normal block mb-1">Data</label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-xs text-white font-medium outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-white text-[10px] font-normal block mb-1">Hora</label>
                        <TimeSelect value={horaLevantamento} onChange={setHoraLevantamento} />
                      </div>
                    </div>
                  </div>

                  {/* Devolução */}
                  <div className="bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-2.5 space-y-1.5">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Devolução</p>
                    <div className="grid grid-cols-[3fr_2fr] gap-1.5">
                      <div>
                        <label className="text-white text-[10px] font-normal block mb-1">Data</label>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-xs text-white font-medium outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-white text-[10px] font-normal block mb-1">Hora</label>
                        <TimeSelect value={horaDevolucao} onChange={setHoraDevolucao} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-white text-xs font-normal block mb-1">Motivo da viagem</label>
                  <input
                    type="text"
                    value={motivoViagem}
                    onChange={(e) => setMotivoViagem(e.target.value)}
                    placeholder="Ex: Viagem de negócios à Beira, férias em Bilene..."
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-sm text-white font-medium placeholder:text-zinc-500 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Local + Motorista — lado a lado */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Local fixo */}
                  <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 flex items-center gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-white uppercase tracking-wider font-bold mb-0.5">Local</p>
                      <p className="text-xs font-semibold text-white truncate">Escritório Central</p>
                      <p className="text-[10px] text-white/60 truncate">Av. 25 de Setembro</p>
                    </div>
                  </div>

                  {/* Motorista toggle */}
                  {(() => {
                    const disponiveis = motoristas.filter(m => m.status === 'disponivel');
                    return (
                      <div className={`rounded-xl border transition-all ${comMotorista ? 'border-amber-400/30 bg-amber-400/5' : 'border-zinc-700/70 bg-zinc-900/60'}`}>
                        <button
                          type="button"
                          onClick={() => { setComMotorista(v => !v); setMotoristaId(''); }}
                          className="w-full flex items-center justify-between px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[9px] text-white uppercase tracking-wider font-bold mb-0.5">Motorista</p>
                            <p className={`text-xs font-semibold truncate ${comMotorista ? 'text-amber-400' : 'text-white'}`}>
                              {comMotorista ? 'Com motorista' : 'Sem motorista'}
                            </p>
                          </div>
                          <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 shrink-0 ml-2 ${comMotorista ? 'bg-amber-400 justify-end' : 'bg-zinc-700 justify-start'}`}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white shadow" />
                          </div>
                        </button>
                        {comMotorista && (
                          <div className="px-3 pb-2.5">
                            {disponiveis.length === 0 ? (
                              <p className="text-xs text-white italic">Sem motoristas disponíveis.</p>
                            ) : (
                              <select
                                value={motoristaId}
                                onChange={e => setMotoristaId(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-amber-400 outline-none"
                              >
                                <option value="">Selecionar (opcional)</option>
                                {disponiveis.map(m => (
                                  <option key={m.id} value={m.id}>{m.nome}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {flow === 'aluguer' && dateValidation && !dateValidation.valid ? (
                  <div className="text-sm text-red-100 bg-red-600 border border-red-500 rounded-lg p-3">
                    {dateValidation.errors[0]}
                  </div>
                ) : null}

                {flow === 'aluguer' && availability && !availability.available && dateValidation?.valid ? (
                  <div className="text-sm text-red-100 bg-red-600 border border-red-500 rounded-lg p-3">
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
                        <div className="absolute top-0 right-0 -translate-y-1 bg-emerald-500 text-zinc-950 text-xs font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce">
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
          <div className="bg-zinc-800/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06),0_0_40px_-12px_rgba(228,180,46,0.12)] relative overflow-hidden sticky top-6">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12" />
            
            <div className="relative z-10">
              <div className="text-white text-xs mb-2 font-normal uppercase tracking-widest">
                {flow === "compra"
                  ? paymentPlan === "prestacoes"
                    ? "Prestação Mensal"
                    : "Total (Pronto)"
                  : "Total a pagar"}
              </div>
              <div className="flex items-baseline gap-3 flex-wrap mb-1">
                <span className="text-3xl font-black text-white tracking-tight">
                  {flow === "compra"
                    ? paymentPlan === "prestacoes"
                      ? fmt(purchasePMT)
                      : fmt(vehiclePrice)
                    : fmt(rentalTotal)}
                  <span className="text-lg text-amber-500 ml-1.5 font-black">MT</span>
                </span>
                <span className="text-white text-xs font-normal bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
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
                {/* Cabeçalho — clicável para expandir/recolher */}
                <button
                  type="button"
                  onClick={() => setEligibilityExpanded(v => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2 ${eligivel ? "bg-emerald-500/10" : "bg-red-500/10"}`}
                >
                  {eligivel ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  )}
                  <span className={`flex-1 text-left text-sm font-semibold ${eligivel ? "text-emerald-400" : "text-red-400"}`}>
                    {eligivel ? "Simulação Válida" : "Requisitos não atendidos"}
                  </span>
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={eligivel ? "#4ade80" : "#f87171"}
                    strokeWidth="2.5" strokeLinecap="round"
                    className={`shrink-0 transition-transform duration-200 ${eligibilityExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Corpo — colapsável */}
                {eligibilityExpanded && (
                  <div className="px-3 py-2.5 space-y-2 bg-zinc-900/60">
                    <p className={`text-sm font-medium ${eligivel ? "text-emerald-300" : "text-red-300"}`}>
                      {financingStatus.title}
                    </p>
                    {financingStatus.why && (
                      <div className="bg-zinc-800/70 rounded-lg px-2.5 py-2 border border-zinc-700/50">
                        <p className="text-xs text-white font-normal mb-1">O que acontece?</p>
                        <p className="text-xs text-white leading-relaxed">{financingStatus.why}</p>
                      </div>
                    )}
                    {!eligivel && financingStatus.fix && (
                      <div className="bg-amber-500/8 rounded-lg px-2.5 py-2 border border-amber-500/20">
                        <p className="text-xs text-amber-400/80 font-normal mb-1">Como resolver?</p>
                        <p className="text-xs text-white leading-relaxed">{financingStatus.fix}</p>
                      </div>
                    )}
                  </div>
                )}
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
                  <div className="text-white text-xs font-normal uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-white font-medium text-base truncate">{val}</div>
                </div>
              ))}
            </div>

            {/* Razão de bloqueio — aparece quando o botão está desabilitado */}
            {!canSubmit && !isBlocked && !submitted && blockReason && (
              <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25">
                <div className="shrink-0 mt-0.5">
                  {blockReason.icon === "calendar" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  )}
                  {blockReason.icon === "phone" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.6 19.79 19.79 0 0 1 1.65 4a2 2 0 0 1 1.99-2H6.5a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.29 6.29l1.36-1.36a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  )}
                  {blockReason.icon === "user" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  )}
                  {(blockReason.icon === "car" || blockReason.icon === "warn") && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  )}
                </div>
                <p className="text-sm text-amber-200 leading-relaxed">{blockReason.msg}</p>
              </div>
            )}

            {submitError ? (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm leading-relaxed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {submitError}
              </div>
            ) : null}

            {isBlocked && !submitted && (
              <div className="mt-6 rounded-xl p-4 bg-red-600 border border-red-500 shadow-lg relative z-10 animate-pulse">
                <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Acesso Restrito
                </div>
                <p className="text-white text-sm leading-snug font-medium opacity-95">
                  {isRestricted
                    ? "Esta conta foi suspensa permanentemente por violação das políticas de segurança (Blacklisted)."
                    : "Operação bloqueada devido a pendências financeiras ou irregularidades de registo."}
                </p>
                <p className="text-white/80 text-sm leading-snug mt-1.5">
                  Contacte o administrador para resolver a situação.
                </p>
              </div>
            )}

            {submitted ? (
              /* ── Painel de sucesso ── */
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 overflow-hidden relative z-10">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-emerald-500/20">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-black text-base">
                      {flow === "compra" ? "Pedido de compra enviado!" : "Reserva submetida!"}
                    </p>
                    <p className="text-white text-xs mt-1">O administrador foi notificado e entrará em contacto.</p>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {[
                    ["Viatura", flow === "compra"
                      ? (allVehicles.find(v => v.id === purchaseVehicleId)?.name ?? "Viatura seleccionada")
                      : (aluguerVehicles.find(v => v.id === rentalVehicleId)?.name ?? "Viatura seleccionada")],
                    ["Cliente", clientName.trim() || authUser?.nome || "—"],
                    ["Estado", "Aguarda confirmação de pagamento"],
                    ["Próximo passo", "Aguarde contacto da SOS Motors para instruções de pagamento."],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2 text-xs">
                      <span className="text-white font-normal w-28 shrink-0">{label}</span>
                      <span className="text-white">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("rentcar:close-flow-modal"))}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition-colors"
                  >
                    Concluído
                  </button>
                </div>
              </div>
            ) : !authUser && !selectedVehicleId ? (
              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-center relative z-10">
                <p className="text-white text-xs font-semibold mb-1">Simulação de exploração</p>
                <p className="text-white text-xs leading-relaxed">
                  Nenhum pedido será enviado. Para avançar, escolha uma viatura no catálogo e clique em <span className="text-amber-400 font-semibold">Reservar</span> ou <span className="text-amber-400 font-semibold">Comprar</span>.
                </p>
              </div>
            ) : (
              <button
                onClick={!authUser ? () => setShowGuestModal(true) : handleSubmit}
                disabled={!authUser ? clientName.trim().length < 2 : !canSubmit}
                className={`mt-5 w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-lg relative z-10 ${
                  (!authUser ? clientName.trim().length >= 2 : canSubmit)
                    ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-zinc-800 text-white cursor-not-allowed border border-zinc-700"
                }`}
              >
                {!authUser ? "Registar Interesse" : isBlocked ? "Bloqueado" : "Confirmar Operação"}
              </button>
            )}

          </div>

        </div>
      </div>

    </section>

      {showGuestModal && (
        <GuestRequestModal
          intent={flow as 'aluguer' | 'compra'}
          vehicleName={allVehicles.find(v => v.id === selectedVehicleId)?.name}
          prefill={{ nome: clientName, telefone: clientContact || undefined }}
          preCategory={flow === 'compra' ? (category as import('../types/guest').GuestCategory) : undefined}
          withDriver={flow === 'aluguer' ? comMotorista : undefined}
          onClose={() => {
            setShowGuestModal(false);
            window.dispatchEvent(new CustomEvent('rentcar:close-simulator'));
          }}
        />
      )}
    </>
  );
}
