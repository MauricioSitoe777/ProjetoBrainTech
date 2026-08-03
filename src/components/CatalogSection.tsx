import { useState, useMemo } from "react";
import type { Vehicle } from "../data/constants";
import VehicleCard from "./VehicleCard";
import { useScrollTo } from "../hooks";
import { useVehicles } from "../context/VehiclesContext";
import { useReservations } from "../context/ReservationsContext";
import { isSoldVehicle } from "../lib/availability";

const ITEMS_PER_PAGE = 8;

type Mode = "todos" | "aluguer" | "compra" | "vendidos";
type SimulatorFlow = "aluguer" | "compra";
type Cat  = "suv" | "pickup" | "sedan" | "hatchback" | "van" | null;

const MODE_FILTERS: { key: Mode; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "compra", label: "Compra" },
  { key: "aluguer", label: "Aluguer" },
  { key: "vendidos", label: "Vendidos" },
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
    img: "/sedan_transparent.png",
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
  onOpenFlowModal?: (lockedFlow?: SimulatorFlow) => void;
}) {
  const scrollTo = useScrollTo();
  const { vehicles: dynamicVehicles, searchTerm, setSearchTerm } = useVehicles();
  const { availabilityReservations } = useReservations();
  const [mode, setMode] = useState<Mode>("todos");
  const [cat,  setCat]  = useState<Cat>(null);
  const [page, setPage] = useState(1);

  const handleMode = (m: Mode) => {
    setMode(m);
    setCat(null);
    setSearchTerm("");
    setPage(1);
  };

  // Volta à página 1 sempre que o filtro de categoria ou a pesquisa mudam
  const handleCat = (c: Cat) => {
    setCat(c);
    setPage(1);
  };

  const handleSearch = (v: string) => {
    setSearchTerm(v);
    setPage(1);
  };

  const allVehicles = dynamicVehicles as unknown as Vehicle[];

  // Função que gera os números de página com reticências
  const filtered = useMemo(() => allVehicles.filter((v) => {
    if (!v) return false;
    const sold = isSoldVehicle(v.id, availabilityReservations);
    if (mode === "vendidos") {
      return sold;
    }
    if (sold) return false;
    if (mode !== "todos" && v.mode !== mode) return false;
    if (cat && v.cat !== cat) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = (v.name || "").toLowerCase().includes(searchLower);
      const brandMatch = (v.brand || "").toLowerCase().includes(searchLower);
      if (!nameMatch && !brandMatch) return false;
    }
    return true;
  }), [allVehicles, mode, cat, searchTerm, availabilityReservations]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedVehicles = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page]
  );

  const goToPage = (p: number) => {
    setPage(p);
    // Espera o DOM reflectir a nova página (que pode ter muito menos cartões,
    // encolhendo a secção) antes de calcular o alvo do scroll — caso contrário
    // o alvo é medido com a altura antiga e a animação ultrapassa a secção.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

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
      window.dispatchEvent(new CustomEvent("rentcar:vehicle-selected", { detail: payload }));
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
    <section id="catalogo" className="min-h-screen bg-zinc-950 py-16 flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-2">
              Catálogo
            </div>
            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
              Frota Disponível
            </h2>
            <p className="text-white text-base mt-1.5 max-w-md">
              Defina o destino, nós tratamos do caminho. Comece aqui.
            </p>
          </div>

          {/* Mode pills + pesquisa */}
          <div className="flex flex-wrap items-center gap-2">
            {MODE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleMode(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  mode === f.key
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Barra de pesquisa */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/20 rounded-full px-3 py-1.5 min-w-[160px] focus-within:border-zinc-600 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-500 w-full"
              />
              {searchTerm && (
                <button onClick={() => handleSearch("")} className="text-zinc-500 hover:text-white transition-colors shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Category description ── */}
        {cat && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
            <h3 className="text-white font-semibold text-sm mb-0.5 capitalize">
              {CAT_FILTERS.find(f => f.key === cat)?.label}
            </h3>
            <p className="text-zinc-500 text-[13px] leading-relaxed">
              Explore a nossa seleção de {CAT_FILTERS.find(f => f.key === cat)?.label.toLowerCase()} — mantidos com os mais altos padrões de qualidade.
            </p>
          </div>
        )}

        {/* ── Category pills (visible only for Aluguer / Compra) ── */}
        {mode !== "todos" && mode !== "vendidos" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-5 items-stretch">
              {/* Reset pill */}
              <button
                onClick={() => handleCat(null)}
                className={`w-full flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 ${
                  cat === null
                    ? "bg-zinc-700 text-white border-zinc-500 shadow-lg shadow-zinc-900/50"
                    : "bg-zinc-900/60 text-white border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800/80"
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
                  onClick={() => handleCat(f.key)}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border h-14 overflow-hidden relative ${
                    cat === f.key
                      ? "bg-zinc-700/80 text-white border-amber-500/60 shadow-lg shadow-amber-500/10"
                      : "bg-zinc-900/60 text-white border-zinc-800 hover:border-zinc-500 hover:text-white hover:bg-zinc-800/80"
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

          </>
        )}

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-[11px] uppercase tracking-widest">
            {filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedVehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onAction={handleAction}
              isSold={isSoldVehicle(v.id, availabilityReservations)}
            />
          ))}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="py-14 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <div className="text-3xl mb-3 grayscale opacity-50">🔍</div>
            <h3 className="text-white font-bold text-base mb-1.5">
              {mode === "vendidos" ? "Nenhuma viatura vendida recentemente" : "Nenhum veículo encontrado"}
            </h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              {mode === "vendidos"
                ? "Não há viaturas vendidas ou em processo de compra neste momento."
                : "Tente ajustar os filtros ou a sua pesquisa para encontrar o que procura."}
            </p>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
            {/* Anterior */}
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNum) => {
                if (totalPages <= 7) return true;
                if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) return true;
                return false;
              })
              .reduce<number[]>((acc, pageNum, index, arr) => {
                if (index > 0 && pageNum - arr[index - 1] > 1) {
                  acc.push(-1);
                }
                acc.push(pageNum);
                return acc;
              }, [])
              .map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-zinc-600 text-sm select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all border ${
                      p === page
                        ? 'bg-amber-500 text-zinc-950 border-amber-500'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            {/* Próxima */}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        )}

      </div>

    </section>
  );
}
