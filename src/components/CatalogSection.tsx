import { useState } from "react";
import type { Vehicle } from "../data/constants";
import VehicleCard from "./VehicleCard";
import { BookingPanel } from "./reservations/BookingPanel";
import { useScrollTo } from "../hooks";
import { useVehicles } from "../context/VehiclesContext";

type Mode = "todos" | "aluguer" | "compra";
type Cat  = "suv" | "pickup" | "sedan" | "hatchback" | "van" | null;

const CAT_DESCRIPTIONS: Record<string, string> = {
  suv: "Todo o terreno — Devido às condições das estradas fora dos centros urbanos e à necessidade de maior altura em relação ao solo.",
  pickup: "Carrinhas de Caixa Aberta — Essenciais para uso comercial, agricultura, construção e terrenos difíceis.",
  sedan: "Preferidos por famílias pelo conforto e porta-malas espaçoso, tanto para uso urbano quanto para viagens longas.",
  hatchback: "Compactos — Carros de baixo consumo de combustível, facilidade de estacionamento e preços acessíveis, sendo ideais para o dia a dia.",
  van: "Para transporte privado de grandes famílias quanto para transporte público e logística de carga leve.",
};

const MODE_FILTERS: { key: Mode; label: string }[] = [
  { key: "todos",   label: "Todos"   },
  { key: "aluguer", label: "Aluguer" },
  { key: "compra",  label: "Compra"  },
];

const CAT_FILTERS: { key: Cat; label: string; img: string; blend?: boolean }[] = [
  {
    key: "suv",
    label: "SUVs & Crossovers",
    img: "https://img.pikbest.com/png-images/20260210/red-suv-car-isolated-on-transparent-background_15826901.jpg!f305cw",
    blend: true,
  },
  {
    key: "pickup",
    label: "Pick-ups",
    img: "/pickup_cyan.png",
    blend: false,
  },
  {
    key: "sedan",
    label: "Sedans",
    img: "https://static.vecteezy.com/system/resources/thumbnails/066/972/267/small_2x/3d-luxury-sedan-car-front-view-realistic-vehicle-render-on-transparent-background-free-png.png",
    blend: false,
  },
  {
    key: "hatchback",
    label: "Hatchbacks",
    img: "https://png.pngtree.com/png-vector/20241116/ourmid/pngtree-3d-white-hatchback-car-side-view-on-transparent-background-png-image_14454813.png",
    blend: true,
  },
  {
    key: "van",
    label: "Vans / Minivans",
    img: "/van_transparent.png",
    blend: false,
  },
];

export default function CatalogSection({
  onShowSimulator,
  onOpenFlowModal,
}: {
  onShowSimulator?: () => void;
  onOpenFlowModal?: () => void;
}) {
  const scrollTo = useScrollTo();
  const { vehicles: dynamicVehicles } = useVehicles();
  const [mode, setMode] = useState<Mode>("todos");
  const [cat,  setCat]  = useState<Cat>(null);
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);

  // New filters state
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("todos");
  const [maxPrice, setMaxPrice] = useState<number>(10000000); // High default
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const handleMode = (m: Mode) => {
    setMode(m);
    setCat(null);
    setSearch("");
    setBrand("todos");
    setOnlyDiscount(false);
    setOnlyAvailable(false);
    setMaxPrice(m === "aluguer" ? 20000 : 15000000);
  };

  const allVehicles = dynamicVehicles as unknown as Vehicle[];

  const uniqueBrands = Array.from(new Set(
    allVehicles
      .filter(v => mode === "todos" || v.mode === mode)
      .map(v => v.brand)
  )).sort();

  const isFiltered = cat !== null || search !== "" || brand !== "todos" || onlyDiscount || onlyAvailable || (mode === "aluguer" ? maxPrice < 20000 : maxPrice < 15000000);

  const resetFilters = () => {
    setCat(null);
    setSearch("");
    setBrand("todos");
    setOnlyDiscount(false);
    setOnlyAvailable(false);
    setMaxPrice(mode === "aluguer" ? 20000 : 15000000);
  };

  const filtered = allVehicles.filter((v) => {
    // Mode filter
    if (mode !== "todos" && v.mode !== mode) return false;

    // Type filter
    if (cat && v.cat !== cat) return false;

    // Brand filter
    if (brand !== "todos" && v.brand !== brand) return false;

    // Search filter (name or brand)
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.brand.toLowerCase().includes(search.toLowerCase())) return false;

    // Price filter
    const priceValue = Number(String(v.price).replace(/[^\d]/g, "")) || 0;
    if (maxPrice > 0 && priceValue > maxPrice) return false;

    // Discount filter
    if (onlyDiscount && (!v.discount || v.discount <= 0)) return false;

    // Availability filter (only for rental)
    if (mode === "aluguer" && onlyAvailable && v.available === false) return false;

    return true;
  });

  const handleAction = (vehicle: Vehicle) => {
    if (vehicle.mode === "aluguer") {
      setBookingVehicle(vehicle);
      return;
    }

    const mt = Number(String(vehicle.price).replace(/[^\d]/g, "")) || 0;
    const payload = {
      id: vehicle.id,
      mode: vehicle.mode as "aluguer" | "compra",
      dailyRate: vehicle.mode === "aluguer" ? mt : undefined,
      vehiclePrice: vehicle.mode === "compra" ? mt : undefined,
    };

    try {
      sessionStorage.setItem("rentcar:selectedVehicle:v1", JSON.stringify(payload));
    } catch {
      // ignore
    }

    if (onOpenFlowModal) {
      onOpenFlowModal();
      return;
    }

    onShowSimulator?.();
    scrollTo("simulador");
  };

  return (
    <section id="catalogo" className="py-12 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
              Catálogo
            </div>
            <h2
              className="text-white text-4xl md:text-5xl font-black leading-tight"
              style={{ fontFamily: "'Archivo', sans-serif" }}
            >
              Frota Disponível
            </h2>
            <p className="text-zinc-200 text-base mt-3 max-w-md">
              Defina o destino, nós tratamos do caminho. Comece aqui.
            </p>
          </div>

          {/* Mode pills */}
          <div className="flex flex-wrap gap-2">
            {MODE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleMode(f.key)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  mode === f.key
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category pills (visible only for Aluguer / Compra) ── */}
        {mode !== "todos" && (
          <>
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              {/* Reset pill */}
              <button
                onClick={() => setCat(null)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 ${
                  cat === null
                    ? "bg-zinc-700 text-white border-zinc-500 shadow-lg shadow-zinc-900/50"
                    : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/80"
                }`}
              >
                <div className="w-12 h-10 flex items-center justify-center shrink-0 relative overflow-visible">
                  {/* 3D Hatchback (left layered) */}
                  <img
                    src="https://png.pngtree.com/png-vector/20241116/ourmid/pngtree-3d-white-hatchback-car-side-view-on-transparent-background-png-image_14454813.png"
                    alt="Hatchback"
                    className="absolute w-7 h-auto object-contain left-[-2px] bottom-[1px] mix-blend-screen scale-110 z-10"
                  />
                  {/* 3D SUV (middle/background layered) */}
                  <img
                    src="https://img.pikbest.com/png-images/20260210/red-suv-car-isolated-on-transparent-background_15826901.jpg!f305cw"
                    alt="SUV"
                    className="absolute w-7 h-auto object-contain left-[10px] top-[1px] mix-blend-screen scale-110 z-0 opacity-70"
                  />
                  {/* 3D Pickup (right layered) */}
                  <img
                    src="/pickup_cyan.png"
                    alt="Pickup"
                    className="absolute w-7 h-auto object-contain right-[-2px] bottom-[1px] scale-110 z-20"
                  />
                </div>
                <span>Todas</span>
              </button>

              {CAT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setCat(f.key)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 overflow-hidden relative ${
                    cat === f.key
                      ? "bg-zinc-700/80 text-white border-amber-500/60 shadow-lg shadow-amber-500/10"
                      : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80"
                  }`}
                >
                  <div className="w-12 h-10 flex items-center justify-center relative overflow-hidden shrink-0">
                    <img
                      src={f.img}
                      alt={f.label}
                      className={`h-full w-auto object-contain transition-transform duration-300 hover:scale-110 ${
                        f.blend ? "mix-blend-screen" : ""
                      }`}
                      style={f.blend ? {} : { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
                    />
                  </div>
                  <span className="leading-tight text-left font-semibold">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50">
              {/* Search */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider ml-1">Pesquisar</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Marca ou modelo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-2.5 text-zinc-600">🔍</span>
                </div>
              </div>

              {/* Brand Select */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider ml-1">Marca</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all appearance-none"
                >
                  <option value="todos">Todas as marcas</option>
                  {uniqueBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider ml-1">
                  Preço Máximo {mode === "aluguer" ? "(MT/dia)" : "(MT)"}
                </label>
                <input
                  type="range"
                  min={mode === "aluguer" ? "500" : "500000"}
                  max={mode === "aluguer" ? "20000" : "15000000"}
                  step={mode === "aluguer" ? "500" : "250000"}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer mt-3"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>{mode === "aluguer" ? "500" : "500k"}</span>
                  <span className="text-amber-500 font-bold">{maxPrice >= (mode === "aluguer" ? 20000 : 15000000) ? "Qualquer" : maxPrice.toLocaleString() + " MT"}</span>
                  <span>{mode === "aluguer" ? "20k" : "15M"}</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col justify-end gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={onlyDiscount}
                      onChange={(e) => setOnlyDiscount(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${onlyDiscount ? "bg-amber-500" : "bg-zinc-800"}`} />
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${onlyDiscount ? "translate-x-5" : ""}`} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">Com Desconto</span>
                </label>

                {mode === "aluguer" && (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={onlyAvailable}
                        onChange={(e) => setOnlyAvailable(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${onlyAvailable ? "bg-amber-500" : "bg-zinc-800"}`} />
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${onlyAvailable ? "translate-x-5" : ""}`} />
                    </div>
                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">Disponível Agora</span>
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Results count and Reset ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest">
            {filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-amber-500 text-[10px] font-bold uppercase tracking-tighter hover:text-amber-400 flex items-center gap-1 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Limpar Filtros
            </button>
          )}
        </div>

        {/* ── Category description ── */}
        {cat && CAT_DESCRIPTIONS[cat] && (
          <p className="text-zinc-200 text-base mb-6 max-w-2xl leading-relaxed"
             style={{ animation: 'fadeIn .3s ease' }}>
            {CAT_DESCRIPTIONS[cat]}
          </p>
        )}
        {!cat && <div className="mb-4" />}

        {/* ── Vehicle grid ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onAction={handleAction} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-zinc-600 text-5xl">🚗</div>
            <p className="text-zinc-200 text-base">
              Nenhum veículo encontrado para esta selecção.
            </p>
            <button
              onClick={() => { setMode("todos"); setCat(null); }}
              className="mt-2 px-5 py-2 rounded-full text-sm font-semibold bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-all"
            >
              Ver todos
            </button>
          </div>
        )}

      </div>

      {bookingVehicle && (
        <BookingPanel
          vehicle={bookingVehicle}
          onClose={() => setBookingVehicle(null)}
        />
      )}
    </section>
  );
}
