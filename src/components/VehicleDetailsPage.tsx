import { useState, useEffect } from "react";
import { useVehicles, type VehicleData } from "../context/VehiclesContext";
import { useScrollTo } from "../hooks";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { BookingPanel } from "./reservations/BookingPanel";

interface VehicleDetailsPageProps {
  vehicleId: number;
  onExit: () => void;
  onOpenFlowModal?: () => void;
  onShowSimulator?: () => void;
}

export default function VehicleDetailsPage({
  vehicleId,
  onExit,
  onOpenFlowModal,
  onShowSimulator,
}: VehicleDetailsPageProps) {
  const { vehicles } = useVehicles();
  const scrollTo = useScrollTo();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [currentImg, setCurrentImg] = useState(0);
  const [bookingVehicle, setBookingVehicle] = useState<VehicleData | null>(null);

  useEffect(() => {
    const v = vehicles.find((v) => v.id === vehicleId);
    if (v) {
      setVehicle(v);
    }
  }, [vehicleId, vehicles]);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Veículo não encontrado.</p>
          <button
            onClick={onExit}
            className="px-6 py-2 rounded-full bg-amber-500 text-zinc-950 font-bold"
          >
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    );
  }

  const allImages = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [vehicle.img];

  const handleAction = () => {
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
    onExit(); // Go back to landing to see simulator
    setTimeout(() => scrollTo("simulador"), 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased">
      <Navbar scrolled={true} onOpenAdmin={() => {}} onShowSimulator={onShowSimulator} />
      
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Breadcrumb / Back */}
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors mb-8 group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-1 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-bold text-sm uppercase tracking-widest">Voltar ao Catálogo</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
              <img
                src={allImages[currentImg]}
                alt={vehicle.name}
                className="w-full h-full object-cover transition-all duration-500"
              />
              
              {/* Badges */}
              <div className="absolute top-6 left-6 flex flex-col gap-3">
                <div className="px-4 py-1.5 rounded-full text-xs font-black bg-amber-500 text-zinc-950 shadow-xl uppercase tracking-wider">
                  {vehicle.mode}
                </div>
                <div className="px-4 py-1.5 rounded-full text-xs font-bold bg-zinc-950/80 text-white border border-zinc-700/50 backdrop-blur-md uppercase tracking-wider">
                  {vehicle.cat}
                </div>
              </div>

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition-all"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImg((i) => (i + 1) % allImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition-all"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      idx === currentImg ? "border-amber-500 scale-95" : "border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-amber-500 font-black text-sm uppercase tracking-[0.2em]">{vehicle.brand}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
                {vehicle.name}
              </h1>
              
              <div className="flex items-center gap-6 text-zinc-400 text-sm font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">📅</span> {vehicle.year}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">⛽</span> {vehicle.fuel}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">👤</span> {vehicle.seats} Lugares
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 mb-8">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Preço Total</p>
                  <div className="text-3xl font-black text-amber-500">{vehicle.price}</div>
                </div>
                {vehicle.discount && vehicle.discount > 0 && (
                  <div className="px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-sm animate-pulse">
                    -{vehicle.discount}% DESCONTO
                  </div>
                )}
              </div>

              <div className="space-y-4 text-zinc-300 leading-relaxed text-base">
                <p className="font-bold text-white uppercase text-xs tracking-widest border-b border-zinc-800 pb-2 mb-4">Descrição do Veículo</p>
                {vehicle.description || "Nenhuma descrição detalhada disponível para este veículo no momento."}
              </div>
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAction}
                disabled={vehicle.mode === "aluguer" && vehicle.available === false}
                className={`flex-1 py-5 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-xl ${
                  vehicle.mode === "aluguer" && vehicle.available === false
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                    : "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] shadow-amber-500/20"
                }`}
              >
                {vehicle.mode === "aluguer" 
                  ? (vehicle.available === false ? "Indisponível" : "Reservar Agora") 
                  : "Iniciar Compra"}
              </button>
              
              <button className="px-8 py-5 rounded-2xl border border-zinc-800 text-white font-bold uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorito
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {bookingVehicle && (
        <BookingPanel
          vehicle={bookingVehicle as any}
          onClose={() => setBookingVehicle(null)}
        />
      )}
    </div>
  );
}
