import { useState } from "react";
import { VEHICLES } from "../data/constants";
import type { Vehicle } from "../data/constants";
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

const CAT_FILTERS: { key: Cat; label: string; emoji: string }[] = [
  { key: "suv",      label: "SUVs & Crossovers",   emoji: "🏔️" },
  { key: "pickup",   label: "Pick-ups",           emoji: "🛻" },
  { key: "sedan",    label: "Sedans",              emoji: "🚗" },
  { key: "hatchback",label: "Hatchbacks",          emoji: "🚙" },
  { key: "van",      label: "Vans / Minivans",     emoji: "🚐" },
];

export default function CatalogSection({
  onShowSimulator,
  onOpenFlowModal,
}: {
  onShowSimulator?: () => void;
  onOpenFlowModal?: () => void;
}) {
  const scrollTo = useScrollTo();
  const [mode, setMode] = useState<Mode>("todos");
  const [cat,  setCat]  = useState<Cat>(null);
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);

  const handleMode = (m: Mode) => {
    setMode(m);
    setCat(null);
  };

  const filtered = VEHICLES.filter((v) => {
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
    <section id="catalogo" className="py-28 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
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
            <p className="text-zinc-400 text-base mt-3 max-w-md">
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
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category pills (visible only for Aluguer / Compra) ── */}
        {mode !== "todos" && (
          <div className="flex flex-wrap gap-2 mb-8">
            {/* Reset pill */}
            <button
              onClick={() => setCat(null)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                cat === null
                  ? "bg-zinc-700 text-white border border-zinc-600"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-white"
              }`}
            >
              Todas
            </button>

            {CAT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCat(f.key)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  cat === f.key
                    ? "bg-zinc-700 text-white border border-zinc-500"
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                <span>{f.emoji}</span>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Results count ── */}
        <p className="text-zinc-600 text-xs mb-2 uppercase tracking-widest">
          {filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* ── Category description ── */}
        {cat && CAT_DESCRIPTIONS[cat] && (
          <p className="text-zinc-400 text-base mb-6 max-w-2xl leading-relaxed"
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
            <p className="text-zinc-500 text-base">
              Nenhum veículo encontrado para esta selecção.
            </p>
            <button
              onClick={() => { setMode("todos"); setCat(null); }}
              className="mt-2 px-5 py-2 rounded-full text-sm font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-all"
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
