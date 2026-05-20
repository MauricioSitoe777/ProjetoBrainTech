import { useState } from "react";
import { useVehicles } from "../context/VehiclesContext";
import type { Vehicle } from "../types/vehicle";
import VehicleCard from "./VehicleCard";
import { BookingPanel } from "./reservations/BookingPanel";
import { useScrollTo } from "../hooks";

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
  const { vehicles } = useVehicles();
  const [mode, setMode] = useState<Mode>("todos");
  const [cat,  setCat]  = useState<Cat>(null);
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);

  const handleMode = (m: Mode) => {
    setMode(m);
    setCat(null);
  };

  const filtered = vehicles.filter((v) => {
    if (mode !== "todos" && v.mode !== mode) return false;
    if (cat  && v.cat  !== cat)              return false;
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
      dailyRate: vehicle.mode === ("aluguer" as string) ? mt : undefined,
      vehiclePrice: vehicle.mode === ("compra" as string) ? mt : undefined,
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
    <section id="catalogo" className="py-20 bg-zinc-950">
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
          <div className="flex flex-wrap gap-3 mb-8 items-center">
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
        )}

        {/* ── Results count ── */}
        <p className="text-zinc-400 text-xs mb-2 uppercase tracking-widest">
          {filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>

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
