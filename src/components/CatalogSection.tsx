import { useState } from "react";
import type { Vehicle } from "../data/constants";
import VehicleCard from "./VehicleCard";
import { useScrollTo } from "../hooks";
import { useVehicles } from "../context/VehiclesContext";
import { useAuth } from "../context/AuthContext";

type Mode = "todos" | "aluguer" | "compra";
type SimulatorFlow = "aluguer" | "compra";
type Cat  = "suv" | "pickup" | "sedan" | "hatchback" | "van" | null;

const MODE_FILTERS: { key: Mode; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "compra", label: "Compra" },
  { key: "aluguer", label: "Aluguer" },
];

const CAT_FILTERS: { key: Cat; label: string; img: string; blend?: boolean }[] = [
  {
    key: "suv",
    label: "SUVs",
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
    img: "https://www.freeiconspng.com/uploads/black-sedan-car-png-2.png",
    blend: true,
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
  onOpenFlowModal?: (lockedFlow?: SimulatorFlow) => void;
}) {
  const scrollTo = useScrollTo();
  const { user } = useAuth();
  const { vehicles: dynamicVehicles, searchTerm, setSearchTerm } = useVehicles();
  const [mode, setMode] = useState<Mode>("todos");
  const [cat,  setCat]  = useState<Cat>(null);

  // New filters state
  const [brand, setBrand] = useState("todos");
  const [maxPrice, setMaxPrice] = useState<number>(10000000); // High default
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const handleMode = (m: Mode) => {
    setMode(m);
    setCat(null);
    setSearchTerm("");
    setBrand("todos");
    setOnlyDiscount(false);
    setOnlyAvailable(false);
    setMaxPrice(m === "aluguer" ? 20000 : 15000000);
  };

  const allVehicles = dynamicVehicles as unknown as Vehicle[];

  const uniqueBrands = Array.from(new Set(
    allVehicles
      .filter(v => v && (mode === "todos" || v.mode === mode))
      .map(v => v.brand)
      .filter(Boolean) // Remove null/undefined/empty brands
  )).sort();

  const filtered = allVehicles.filter((v) => {
    // Safety check for vehicle data
    if (!v) return false;

    // Mode filter
    if (mode !== "todos" && v.mode !== mode) return false;

    // Type filter
    if (cat && v.cat !== cat) return false;

    // Brand filter
    if (brand !== "todos" && v.brand !== brand) return false;

    // Search filter (name or brand) - Added safety checks with optional chaining and fallback
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = (v.name || "").toLowerCase().includes(searchLower);
      const brandMatch = (v.brand || "").toLowerCase().includes(searchLower);
      if (!nameMatch && !brandMatch) return false;
    }

    // Price filter
    const priceValue = Number(String(v.price || "0").replace(/[^\d]/g, "")) || 0;
    if (maxPrice > 0 && priceValue > maxPrice) return false;

    // Discount filter
    if (onlyDiscount && (!v.discount || v.discount <= 0)) return false;

    // Availability filter (only for rental)
    if (mode === "aluguer" && onlyAvailable && v.available === false) return false;

    return true;
  });

  const handleAction = (vehicle: Vehicle) => {
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
      onOpenFlowModal(vehicle.mode === "aluguer" ? "aluguer" : undefined);
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

        {/* ── Category description ── */}
        {cat && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
            <h3 className="text-white font-bold text-lg mb-1 capitalize">
              {CAT_FILTERS.find(f => f.key === cat)?.label}
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Explore a nossa seleção premium de {CAT_FILTERS.find(f => f.key === cat)?.label.toLowerCase()}. 
              Veículos mantidos com os mais altos padrões de qualidade e segurança para a sua jornada.
            </p>
          </div>
        )}

        {/* ── Category pills (visible only for Aluguer / Compra) ── */}
        {mode !== "todos" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 items-stretch">
              {/* Reset pill */}
              <button
                onClick={() => setCat(null)}
                className={`w-full flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 ${
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
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 overflow-hidden relative ${
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
                  <span className="leading-tight text-left font-semibold min-w-0">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50">
              {/* Brand Select */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider ml-1">Marca</label>
                <div className="relative">
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 text-[10px]">▼</div>
                </div>
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

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest">
            {filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onAction={handleAction}
            />
          ))}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="py-20 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
            <div className="text-4xl mb-4 grayscale opacity-50">🔍</div>
            <h3 className="text-white font-bold text-xl mb-2">Nenhum veículo encontrado</h3>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto">
              Tente ajustar os filtros ou a sua pesquisa para encontrar o que procura.
            </p>
          </div>
        )}

      </div>

    </section>
  );
}
